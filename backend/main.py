import os
import asyncio
import time
import uuid
import shutil
import logging
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# Load local environment variables
load_dotenv()

from ingest import process_pdf_file
from retriever import (
    store_chunks,
    retrieve_relevant_chunks,
    delete_document_index,
    get_vector_store,
)
from rag_pipeline import (
    answer_query,
    rewrite_question_with_history,
    get_llm,
    is_conversational_or_greeting,
)

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("pdf_rag_app")

app = FastAPI(
    title="PDF Question-Answering RAG API",
    description="High-precision document Q&A API with FastEmbed, ChromaDB, and Groq/OpenRouter fallback.",
    version="1.0.0",
)

# CORS configuration: On Zoho Catalyst AppSail, ZGS proxy automatically injects CORS headers.
# Enabling CORSMiddleware simultaneously creates duplicate Access-Control-Allow-Origin headers,
# which violates W3C CORS and triggers browser "Failed to fetch" network errors.
IS_CATALYST = bool(os.getenv("X_ZOHO_CATALYST_LISTEN_PORT") or os.getenv("ZOHO_CATALYST") == "true")
if not IS_CATALYST:
    ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"] if "*" in ALLOWED_ORIGINS else ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Directories
def get_safe_temp_dir() -> str:
    primary = os.path.join(os.path.dirname(__file__), "temp_uploads")
    try:
        os.makedirs(primary, exist_ok=True)
        return primary
    except (PermissionError, OSError):
        fallback = os.path.join("/tmp", "pagewise_temp_uploads")
        os.makedirs(fallback, exist_ok=True)
        return fallback

TEMP_DIR = get_safe_temp_dir()

# In-memory document registry: { doc_id: { "filename": ..., "uploaded_at": ..., "chunks_count": ..., "total_pages": ... } }
document_registry: Dict[str, Dict[str, Any]] = {}

# Constants
MAX_FILE_SIZE_BYTES = 30 * 1024 * 1024  # 30 MB
START_TIME = time.time()


# Request / Response Schemas
class QueryRequest(BaseModel):
    doc_id: str = Field(..., description="Unique document ID returned upon upload")
    question: str = Field(..., min_length=1, description="Question about the document")
    history: Optional[List[Dict[str, str]]] = Field(
        default=[], description="Previous conversation turns [{'role': 'user'|'assistant', 'content': '...'}]"
    )
    similarity_threshold: Optional[float] = Field(
        default=0.35, description="Minimum cosine similarity threshold to trigger LLM"
    )
    user_email: Optional[str] = Field(
        default=None, description="Email of the authenticated user"
    )


class SourceSnippet(BaseModel):
    page: int
    content: str
    score: float


class QueryResponse(BaseModel):
    answer: str
    sources: List[SourceSnippet]
    grounded: bool
    provider: str
    gated: bool
    doc_id: str


class UploadResponse(BaseModel):
    doc_id: str
    filename: str
    total_pages: int
    chunks_count: int
    message: str


async def _background_warmup():
    try:
        logger.info("Pre-warming FastEmbed model in RAM in background...")
        from retriever import get_embeddings
        await asyncio.to_thread(get_embeddings)
        logger.info("FastEmbed model ready in RAM.")
    except Exception as e:
        logger.warning(f"FastEmbed model pre-warm notice: {e}")


@app.on_event("startup")
async def startup_warmup():
    """Instantly bind port to pass Cloud health check, then warm up models in background."""
    asyncio.create_task(_background_warmup())


@app.get("/", tags=["System"])
def root():
    """Root service information and documentation link."""
    return {
        "name": "PageWise RAG API",
        "status": "online",
        "version": "1.0.0",
        "docs_url": "/docs",
        "health_url": "/health",
    }


@app.get("/health", tags=["System"])
def health_check():
    """Health status and cold-start detector."""
    uptime_seconds = round(time.time() - START_TIME, 2)
    return {
        "status": "healthy",
        "service": "pdf-rag-backend",
        "uptime_seconds": uptime_seconds,
        "loaded_documents": len(document_registry),
    }


ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff"}

@app.post("/upload", response_model=UploadResponse, tags=["Document Ingestion"])
async def upload_pdf(file: UploadFile = File(...), user_email: Optional[str] = Form(None)):
    """
    Accepts a PDF or image file (PNG, JPG, etc.), extracts text (with OCR for scanned content),
    chunks content with metadata, embeds into ChromaDB, and returns a doc_id.
    """
    file_ext = os.path.splitext(file.filename.lower())[1]
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file format. Supported formats: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    # Generate unique document ID
    doc_id = str(uuid.uuid4())[:12]
    temp_file_path = os.path.join(TEMP_DIR, f"{doc_id}_{file.filename}")

    try:
        # Write uploaded bytes to disk while validating size
        size_counter = 0
        with open(temp_file_path, "wb") as buffer:
            while chunk := await file.read(1024 * 64):  # 64KB chunks
                size_counter += len(chunk)
                if size_counter > MAX_FILE_SIZE_BYTES:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail="File exceeds maximum allowed size of 30 MB.",
                    )
                buffer.write(chunk)

        logger.info(f"Received file: {file.filename} ({size_counter} bytes). Processing in background thread...")

        # Extract and chunk in background thread so Render health-checks are not blocked
        chunks, total_pages = await asyncio.to_thread(
            process_pdf_file,
            temp_file_path,
            file.filename,
            1000,
            200,
        )

        if not chunks:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Unable to extract any readable text from this PDF. Please check if the document contains readable text or high-quality scans.",
            )

        # Store chunks in ChromaDB in background thread
        chunks_count = await asyncio.to_thread(
            store_chunks,
            doc_id,
            chunks,
        )

        # Register document
        document_registry[doc_id] = {
            "filename": file.filename,
            "uploaded_at": time.time(),
            "total_pages": total_pages,
            "chunks_count": chunks_count,
            "user_email": user_email.strip().lower() if user_email else None,
        }

        return UploadResponse(
            doc_id=doc_id,
            filename=file.filename,
            total_pages=total_pages,
            chunks_count=chunks_count,
            message="Document successfully ingested and indexed.",
        )

    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Failed to process PDF upload: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while parsing and indexing the PDF: {str(exc)}",
        )
    finally:
        # Clean up temporary upload file
        if os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
            except Exception:
                pass


@app.post("/query", response_model=QueryResponse, tags=["RAG QA"])
def query_document(req: QueryRequest):
    """
    Queries an uploaded document using RAG:
    - Rewrites query if chat history exists
    - Retrieves top 5 matching chunks from ChromaDB
    - Performs similarity threshold gatekeeping
    - Uses Groq (primary) or OpenRouter (fallback) with strict grounding prompt
    """
    # Check document existence
    if req.doc_id not in document_registry:
        # Check if vector collection exists as fallback
        try:
            vs = get_vector_store(req.doc_id)
            count = vs._collection.count()
            if count == 0:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Document session not found or expired. Please re-upload your PDF.",
                )
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document session not found or expired. Please re-upload your PDF.",
            )

    # 0. Conversational / Greeting Check: immediately answer without document citations
    if is_conversational_or_greeting(req.question):
        result = answer_query(
            question=req.question,
            chunks_with_scores=[],
            history=req.history,
            similarity_threshold=req.similarity_threshold or 0.35,
        )
        return QueryResponse(
            answer=result["answer"],
            sources=[],
            grounded=False,
            provider=result.get("provider", "groq"),
            gated=False,
            doc_id=req.doc_id,
        )

    # 1. Question rewriting with history
    llm, _ = get_llm()
    search_query = req.question
    if req.history and llm:
        search_query = rewrite_question_with_history(
            question=req.question,
            history=req.history,
            llm=llm,
        )

    # 2. Retrieve top relevant chunks with scores (expanded to 7 for comprehensive coverage)
    chunks_with_scores = retrieve_relevant_chunks(
        doc_id=req.doc_id,
        query=search_query,
        top_k=7,
    )

    # 3. RAG generation and grounding enforcement
    result = answer_query(
        question=req.question,
        chunks_with_scores=chunks_with_scores,
        history=req.history,
        similarity_threshold=req.similarity_threshold or 0.35,
    )

    return QueryResponse(
        answer=result["answer"],
        sources=[SourceSnippet(**s) for s in result["sources"]],
        grounded=result["grounded"],
        provider=result["provider"],
        gated=result["gated"],
        doc_id=req.doc_id,
    )


@app.get("/documents", tags=["Document Ingestion"])
def list_documents():
    """Returns active documents in current runtime."""
    return {
        "documents": [
            {
                "doc_id": did,
                "filename": meta["filename"],
                "total_pages": meta["total_pages"],
                "chunks_count": meta["chunks_count"],
                "uploaded_at": meta["uploaded_at"],
            }
            for did, meta in document_registry.items()
        ]
    }


@app.delete("/documents/{doc_id}", tags=["Document Ingestion"])
def remove_document(doc_id: str):
    """Deletes vector collection and registry entry for a document."""
    deleted = delete_document_index(doc_id)
    if doc_id in document_registry:
        del document_registry[doc_id]
    return {"doc_id": doc_id, "deleted": deleted}


@app.get("/user/documents", tags=["Document Ingestion"])
def get_user_documents(email: str):
    """Returns all documents indexed by a specific user email."""
    clean_email = email.strip().lower()
    user_docs = [
        {"doc_id": doc_id, **info}
        for doc_id, info in document_registry.items()
        if info.get("user_email") == clean_email
    ]
    return {"documents": user_docs}


# ──────────────────────── Authentication Endpoints ────────────────────────
from auth import (
    otp_store,
    user_store,
    generate_otp,
    send_email_otp,
    verify_google_credential,
    register_user,
    authenticate_user_password,
    reset_user_password,
    OTP_EXPIRY_SECONDS,
)


class RegisterRequest(BaseModel):
    email: str
    password: str
    name: Optional[str] = None


class LoginRequest(BaseModel):
    email: str
    password: str


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    email: str
    code: str
    new_password: str


class SendOtpRequest(BaseModel):
    email: str


class VerifyOtpRequest(BaseModel):
    email: str
    code: str


class GoogleAuthRequest(BaseModel):
    credential: str


class RegisterOtpRequest(BaseModel):
    email: str
    password: str
    name: Optional[str] = None


class VerifyRegisterOtpRequest(BaseModel):
    email: str
    code: str


@app.post("/auth/register/request-otp", tags=["Authentication"])
def request_registration_otp(req: RegisterOtpRequest):
    """Validates registration details, generates a 6-digit verification OTP, and emails it."""
    email = req.email.strip().lower()
    if not email or "@" not in email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide a valid email address.",
        )
    if len(req.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long.",
        )

    from auth import load_users_db
    users = load_users_db()
    if email in users:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists. Please sign in.",
        )

    code = generate_otp()
    otp_store[email] = {
        "code": code,
        "expires_at": time.time() + OTP_EXPIRY_SECONDS,
        "attempts": 0,
        "purpose": "registration",
        "name": req.name.strip() if req.name else email.split("@")[0].capitalize(),
        "password": req.password,
    }

    send_email_otp(email, code)
    return {
        "success": True,
        "email": email,
        "message": f"Verification code sent to {email}.",
    }


@app.post("/auth/register/verify-otp", tags=["Authentication"])
def verify_registration_otp(req: VerifyRegisterOtpRequest):
    """Verifies the 6-digit registration OTP and creates the account."""
    email = req.email.strip().lower()
    code = req.code.strip()

    entry = otp_store.get(email)
    if not entry or entry.get("purpose") != "registration":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No registration verification code found for this email, or it has expired.",
        )

    if time.time() > entry["expires_at"]:
        del otp_store[email]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code has expired. Please request a new one.",
        )

    if entry["attempts"] >= 5:
        del otp_store[email]
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many invalid attempts. Please request a fresh code.",
        )

    if entry["code"] != code:
        entry["attempts"] += 1
        remaining = 5 - entry["attempts"]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Incorrect verification code. {remaining} attempt(s) remaining.",
        )

    # Valid OTP! Create user in database
    reg_password = entry["password"]
    reg_name = entry["name"]
    del otp_store[email]

    success, message, profile = register_user(email, reg_password, reg_name)
    if not success:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=message)

    return {
        "success": True,
        "user": profile,
        "message": "Account created and verified successfully!",
    }


@app.post("/auth/register", tags=["Authentication"])
def register_account(req: RegisterRequest):
    """Registers a new user account with email and password."""
    success, message, profile = register_user(req.email, req.password, req.name)
    if not success:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=message)
    return {"success": True, "user": profile, "message": message}


@app.post("/auth/login", tags=["Authentication"])
def login_with_password(req: LoginRequest):
    """Authenticates a user using email and password."""
    success, message, profile = authenticate_user_password(req.email, req.password)
    if not success:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=message)
    return {"success": True, "user": profile, "message": message}


@app.post("/auth/forgot-password", tags=["Authentication"])
def request_password_reset_code(req: ForgotPasswordRequest):
    """Generates and dispatches a 6-digit password reset OTP to user's email."""
    email = req.email.strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Please provide a valid email.")

    code = generate_otp()
    otp_store[email] = {
        "code": code,
        "expires_at": time.time() + OTP_EXPIRY_SECONDS,
        "attempts": 0,
        "purpose": "reset",
    }
    send_email_otp(email, code)
    return {
        "success": True,
        "email": email,
        "message": f"Password reset verification code sent to {email}.",
    }


@app.post("/auth/reset-password", tags=["Authentication"])
def reset_password(req: ResetPasswordRequest):
    """Verifies the reset OTP and sets a new password for the account."""
    email = req.email.strip().lower()
    code = req.code.strip()

    entry = otp_store.get(email)
    if not entry or entry.get("purpose") != "reset":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No password reset request found for this email, or code has expired.",
        )

    if time.time() > entry["expires_at"]:
        del otp_store[email]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset verification code has expired. Please request a new one.",
        )

    if entry["attempts"] >= 5:
        del otp_store[email]
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many invalid attempts. Please request a fresh reset code.",
        )

    if entry["code"] != code:
        entry["attempts"] += 1
        remaining = 5 - entry["attempts"]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Incorrect verification code. {remaining} attempt(s) remaining.",
        )

    # Valid! Clean up used OTP
    del otp_store[email]

    # Reset password
    success, message = reset_user_password(email, req.new_password)
    if not success:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=message)

    return {"success": True, "message": message}


@app.post("/auth/send-otp", tags=["Authentication"])
def request_email_otp(req: SendOtpRequest):
    """Generates and dispatches a 6-digit OTP code to the provided email."""
    email = req.email.strip().lower()
    if not email or "@" not in email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide a valid email address.",
        )

    code = generate_otp()
    otp_store[email] = {
        "code": code,
        "expires_at": time.time() + OTP_EXPIRY_SECONDS,
        "attempts": 0,
    }

    send_email_otp(email, code)
    return {
        "success": True,
        "email": email,
        "message": f"Verification code sent to {email}.",
    }


@app.post("/auth/verify-otp", tags=["Authentication"])
def verify_email_otp(req: VerifyOtpRequest):
    """Verifies the 6-digit OTP and authenticates the user."""
    email = req.email.strip().lower()
    code = req.code.strip()

    entry = otp_store.get(email)
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No verification code was requested for this email, or it has already been used.",
        )

    if time.time() > entry["expires_at"]:
        del otp_store[email]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This verification code has expired. Please request a new one.",
        )

    if entry["attempts"] >= 5:
        del otp_store[email]
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many invalid attempts. Please request a fresh code.",
        )

    if entry["code"] != code:
        entry["attempts"] += 1
        remaining = 5 - entry["attempts"]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Incorrect verification code. {remaining} attempt(s) remaining.",
        )

    # Valid! Clean up used OTP
    del otp_store[email]

    user_info = {
        "sub": f"email_{email}",
        "email": email,
        "name": email.split("@")[0].capitalize(),
        "picture": "",
        "auth_provider": "email_otp",
        "created_at": time.time(),
    }
    user_store[email] = user_info

    return {
        "success": True,
        "user": user_info,
        "message": "Successfully authenticated via email OTP.",
    }


@app.post("/auth/google", tags=["Authentication"])
def authenticate_google(req: GoogleAuthRequest):
    """Validates Google OAuth JWT token and returns authenticated user profile."""
    if not req.credential:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing Google credential token.",
        )

    user_profile = verify_google_credential(req.credential)
    if not user_profile:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired Google credential token.",
        )

    return {
        "success": True,
        "user": user_profile,
        "message": "Successfully authenticated via Google.",
    }



if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("X_ZOHO_CATALYST_LISTEN_PORT") or os.getenv("PORT") or "8000")
    print(f"🚀 Starting PageWise API on 0.0.0.0:{port}...", flush=True)
    uvicorn.run("main:app", host="0.0.0.0", port=port, log_level="info")

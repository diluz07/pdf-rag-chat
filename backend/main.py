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
)

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("pdf_rag_app")

app = FastAPI(
    title="PDF Question-Answering RAG API",
    description="High-precision document Q&A API with FastEmbed, ChromaDB, and Groq/OpenRouter fallback.",
    version="1.0.0",
)

# CORS configuration
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if "*" in ALLOWED_ORIGINS else ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Directories
TEMP_DIR = os.path.join(os.path.dirname(__file__), "temp_uploads")
os.makedirs(TEMP_DIR, exist_ok=True)

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


# Endpoints
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


@app.post("/upload", response_model=UploadResponse, tags=["Document Ingestion"])
async def upload_pdf(file: UploadFile = File(...), user_email: Optional[str] = Form(None)):
    """
    Accepts a single PDF file, extracts text page-by-page (with OCR fallback for scanned pages),
    chunks content with page metadata, embeds into ChromaDB, and returns a doc_id.
    """
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Please upload a standard PDF (.pdf) file.",
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


# ──────────────────────── Authentication Endpoints ────────────────────────
from auth import (
    otp_store,
    user_store,
    generate_otp,
    send_email_otp,
    verify_google_credential,
    OTP_EXPIRY_SECONDS,
)


class SendOtpRequest(BaseModel):
    email: str


class VerifyOtpRequest(BaseModel):
    email: str
    code: str


class GoogleAuthRequest(BaseModel):
    credential: str


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
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)

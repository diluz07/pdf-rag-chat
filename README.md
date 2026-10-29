# PAGEWISE — Precision PDF Question-Answering RAG Web App

A production-grade, zero-hallucination PDF Question Answering web application featuring multi-user authentication, persistent chat sessions, ephemeral chat mode, and instant page-level citations.

Powered by **FastAPI**, **LangChain**, **FastEmbed** (`BAAI/bge-small-en-v1.5`), **ChromaDB**, and **Groq (Llama 3.3)** with automatic **OpenRouter** fallback, paired with a modern **React 19 + Tailwind CSS** frontend.

---

## 🚀 Key Features

- **Strict Document Grounding**: If the answer is not contained in the uploaded document, the system strictly returns `"I couldn't find that in the uploaded document."` Zero hallucinations.
- **Page-Level Citations**: Answers are backed by exact 1-indexed document page citations, clickable context snippets, and cosine similarity relevance badges.
- **Similarity Threshold Gatekeeper**: Irrelevant or adversarial queries are filtered before reaching the LLM, reducing latency and token costs.
- **Authentication & User Management**:
  - Secure Email/Password registration with 6-digit email OTP verification.
  - Password reset with email verification.
  - One-click Google Sign-In via Google Identity Services (`@react-oauth/google`).
  - Secure JWT session tokens stored in localStorage.
- **Chat History & Session Management**:
  - Multi-chat navigation: create, rename, switch, and delete chat threads.
  - Document associations per chat thread.
  - **Temporary Chat Mode**: Toggle ephemeral mode to ask questions without saving conversation history to disk.
- **Fast & Low-Memory Vector Search**: Runs CPU-friendly ONNX embeddings (**FastEmbed**) requiring < 200MB RAM—no heavy PyTorch dependencies.
- **OCR Fallback**: Automatically invokes Tesseract OCR if a page lacks an embedded text layer (e.g., scanned PDFs).
- **Responsive Dark/Light UI**: Built with React 19, Tailwind CSS v4, Lucide icons, smooth auto-resizing input, and live backend health indicators.

---

## 🏗️ Architecture

```
User Query / PDF Upload / Auth
        │
        ▼
[ FastAPI Backend ]
  ├── Authentication: JWT + Bcrypt + Email OTP (SMTP/Resend/Brevo) + Google OAuth
  ├── User Storage: Persistent JSON database (users_db.json)
  ├── Ingestion & OCR: PyPDF extraction + Tesseract OCR fallback
  ├── Chunking: RecursiveCharacterTextSplitter (1000 char / 200 overlap)
  ├── Embeddings: FastEmbed BAAI/bge-small-en-v1.5 (CPU ONNX)
  ├── Vector Store: ChromaDB per-document collections
  ├── Similarity Gate: Minimum score threshold gatekeeper
  └── LLM Generation: Groq Llama 3.3 ──(failover)──► OpenRouter
        │
        ▼
[ React 19 + Vite Frontend ]
  ├── Navigation & History: Sidebar with active chats & document uploads
  ├── TopBar: Server health indicator, temporary chat badge, theme toggle
  ├── Chat Interface: MessageList with Markdown formatting & page citations
  ├── Rounded Input Bar: Auto-resizing textarea with keyboard shortcuts (Enter / Shift+Enter)
  └── Modals: AuthModal (Sign in, Sign up, OTP, Reset) & ConfirmModal
```

---

## 🛠️ Project Structure

```
pdf-rag-chat/
├── backend/
│   ├── main.py            # FastAPI endpoints (/upload, /query, /health, /documents)
│   ├── auth.py            # Authentication, JWT, bcrypt hashing, OTP via SMTP, Google OAuth
│   ├── ingest.py          # PyPDF extraction, OCR fallback, and text chunking
│   ├── retriever.py       # FastEmbed ONNX embeddings and ChromaDB vector search
│   ├── rag_pipeline.py    # Grounding prompt, similarity gatekeeper, Groq/OpenRouter fallback
│   ├── tests/
│   │   └── test_api.py    # Automated test suite with pytest
│   ├── Dockerfile         # Production container (Python 3.11 + Tesseract + Poppler)
│   ├── requirements.txt   # Backend Python dependencies
│   ├── app-config.json    # Zoho Catalyst AppSail configuration
│   └── .env               # Private backend secrets (ignored by git)
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.jsx       # Chat threads, temporary mode switch, document upload
│   │   │   ├── TopBar.jsx        # Branding, server status, theme toggle, mobile drawer
│   │   │   ├── MessageList.jsx   # Chat bubble rendering, markdown, page citations
│   │   │   ├── InputFooter.jsx   # Auto-resizing chat input & disclaimer
│   │   │   ├── AuthModal.jsx     # Login, registration, OTP verify, password reset
│   │   │   └── ConfirmModal.jsx  # Confirmation dialogs for deletion and signout
│   │   ├── assets/               # Brand logos and SVG icons
│   │   ├── App.jsx               # Root application coordinator
│   │   ├── index.css             # Tailwind CSS v4 styling & dark mode
│   │   └── main.jsx              # React entrypoint with Google OAuth Provider
│   ├── package.json              # Frontend dependencies and build scripts
│   └── vite.config.js            # Vite bundler configuration
├── catalyst.json                 # Zoho Catalyst deployment manifest
├── .catalystrc                   # Zoho Catalyst project identifier
├── .env.example                  # Template of required backend environment variables
└── README.md
```

---

## ⚡ Quick Start Guide

### 1. Prerequisites
- **Python 3.10+** (or 3.11)
- **Node.js 18+** and **npm**
- (Optional) [Groq API Key](https://console.groq.com) and/or [OpenRouter API Key](https://openrouter.ai)
- (Optional) Google OAuth Client ID from Google Cloud Console

### 2. Configure Environment Variables

Create `backend/.env` (see `.env.example`):

```env
# Primary LLM (Groq)
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile

# Fallback LLM (OpenRouter)
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_MODEL=meta-llama/llama-3.3-70b-instruct:free

# Server & Security
PORT=8000
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
JWT_SECRET=your_random_secret_string

# Google Authentication (Optional)
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com

# Email OTP Delivery (Optional - for registration verification)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
SMTP_FROM_NAME=PageWise
```

### 3. Run Backend API
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py
```
*Backend is running at `http://127.0.0.1:8000` (Interactive API docs at `http://127.0.0.1:8000/docs`).*

### 4. Run Frontend App
In a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
*Frontend will be running at `http://localhost:5173`.*

### 5. Run Tests
```bash
cd backend
PYTHONPATH=. ./venv/bin/pytest tests/test_api.py
```

---

## ☁️ Deployment

### Zoho Catalyst Deployment
The project is pre-configured for **Zoho Catalyst**:
- **Backend**: Hosted on Catalyst **AppSail** (`backend/app-config.json` running the standalone container).
- **Frontend**: Hosted on Catalyst **Web Client Hosting** (`frontend/dist/`).

Deploy using the Catalyst CLI:
```bash
catalyst deploy
```

---

## 📄 License
MIT License.

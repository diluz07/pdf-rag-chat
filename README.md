# DocuMind — Precision PDF Question-Answering RAG Chat Web App

A production-grade, zero-hallucination PDF Question Answering web application powered by **FastAPI**, **LangChain**, **FastEmbed** (`BAAI/bge-small-en-v1.5`), **ChromaDB**, and **Groq (Llama 3.3)** with automatic **OpenRouter** fallback.

---

## 🚀 Key Features

- **Strict Document Grounding**: If the answer is not contained in the uploaded PDF, the system strictly returns `"I couldn't find that in the uploaded document."`
- **Page-Level Citations**: Every fact is linked to exact 1-indexed document pages, with expandable context source snippets and relevance score badges.
- **Similarity Threshold Gatekeeper**: Out-of-scope or adversarial queries are rejected early before calling the LLM, saving latency and tokens.
- **Low-Resource Cloud Friendly**: Powered by CPU-friendly ONNX embeddings (**FastEmbed**) that consume < 200MB RAM—bypassing heavy PyTorch installations and eliminating memory limits on free hosting tiers (Render, Hugging Face).
- **OCR Fallback**: Automatically triggers Tesseract OCR if a page lacks an embedded text layer (e.g. scanned documents).
- **Modern Responsive UI**: Built with React 18, Vite, Tailwind CSS, Lucide icons, and progressive cold-start indicators for sleeping cloud instances.

---

## 🏗️ Architecture

```
User Query / PDF Upload
       │
       ▼
[ FastAPI Backend ]
  ├── Ingestion & OCR: PyPDF + Tesseract fallback
  ├── Chunking: RecursiveCharacterTextSplitter (1000 char / 200 overlap)
  ├── Embeddings: FastEmbed BAAI/bge-small-en-v1.5 (ONNX)
  ├── Vector Store: ChromaDB per-document collection (Cosine similarity)
  ├── Similarity Gate: Minimum score threshold gatekeeper
  └── LLM Generation: Groq (Primary) ──(failover)──► OpenRouter (Fallback)
       │
       ▼
[ React 18 + Vite Frontend ]
  ├── Real-time Server Health & Cold-Start Booting Notice
  ├── Drag-and-Drop PDF Upload with progress feedback
  ├── Grounding Badges & Interactive Page Citation Snippets
  └── Configurable Similarity Gate Slider
```

---

## 🛠️ Project Structure

```
pdf-rag-chat/
├── backend/
│   ├── main.py            # FastAPI endpoints (/upload, /query, /health, /documents)
│   ├── ingest.py          # PyPDF extraction, OCR fallback, and chunking
│   ├── retriever.py       # FastEmbed ONNX embeddings and ChromaDB search
│   ├── rag_pipeline.py    # Strict grounding prompt, gatekeeper, Groq/OpenRouter fallback
│   ├── tests/
│   │   └── test_api.py    # Unit & API test suite with pytest
│   ├── Dockerfile         # Python 3.11 + Tesseract + Poppler for Render
│   ├── requirements.txt   # Backend dependencies
│   └── .env               # API keys (Groq, OpenRouter)
├── frontend/              # React 18, Vite, Tailwind CSS
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.jsx
│   │   │   ├── UploadArea.jsx
│   │   │   ├── ChatArea.jsx
│   │   │   └── InputBar.jsx
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   └── package.json
├── .env.example
└── README.md
```

---

## ⚡ Quick Start Guide

### 1. Prerequisites
- Python 3.9+ (or 3.11)
- Node.js 18+ and npm
- (Optional) [Groq API Key](https://console.groq.com) or [OpenRouter API Key](https://openrouter.ai)

### 2. Configure Environment Variables
Inside `backend/.env`:
```env
# Primary LLM (Ultra-fast Llama 3.3)
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile

# Automatic Fallback LLM
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_MODEL=meta-llama/llama-3.3-70b-instruct:free

PORT=8000
ALLOWED_ORIGINS=*
```

### 3. Run Backend API
```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
python main.py
```
*API will be live at `http://localhost:8000` (Interactive Swagger docs at `http://localhost:8000/docs`)*

### 4. Run Frontend App
```bash
cd frontend
npm install
npm run dev
```
*Frontend will be running on `http://localhost:5173`*

### 5. Run Automated Tests
```bash
cd backend
PYTHONPATH=. ./venv/bin/pytest tests/test_api.py
```

---

## 🌐 Free Cloud Deployment

### Backend on Render (Web Service)
1. Push repository to GitHub.
2. In Render Dashboard, click **New Web Service** and select your repository.
3. Choose **Docker** environment (uses `backend/Dockerfile`).
4. Set root directory to `backend`.
5. Add environment variables `GROQ_API_KEY` and `OPENROUTER_API_KEY`.

### Frontend on Vercel
1. In Vercel, import your GitHub repository.
2. Set Root Directory to `frontend`.
3. Set Framework Preset to **Vite**.
4. Add environment variable `VITE_BACKEND_URL` pointing to your deployed Render URL (e.g., `https://your-backend.onrender.com`).
5. Click **Deploy**.

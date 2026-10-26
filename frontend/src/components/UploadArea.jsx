import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Loader2, Sparkles, Shield, Cpu } from 'lucide-react';

export default function UploadArea({ onUploadSuccess, backendUrl }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadProgressText, setUploadProgressText] = useState('');
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = async (file) => {
    setUploadError(null);

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setUploadError('Only PDF files are supported. Please select a valid .pdf file.');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setUploadError('File size exceeds the 15 MB limit. Please select a smaller document.');
      return;
    }

    setIsUploading(true);
    setUploadProgressText('Uploading document to RAG engine...');

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploadProgressText('Extracting pages & generating embeddings...');
      const response = await fetch(`${backendUrl}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Upload failed with status ${response.status}`);
      }

      const data = await response.json();
      setUploadProgressText('Document indexed successfully!');
      setTimeout(() => {
        onUploadSuccess(data);
      }, 400);
    } catch (err) {
      setUploadError(err.message || 'Failed to upload and parse PDF. Please try again.');
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 flex flex-col items-center">
      {/* Hero Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5" /> FastEmbed ONNX & ChromaDB Vector Store
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
          Chat With Any <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500 bg-clip-text text-transparent">PDF Document</span>
        </h1>
        <p className="text-slate-400 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
          Upload research papers, technical specs, financial reports, or contracts.
          Answers are strictly verified against the text with exact page citations and zero hallucination.
        </p>
      </div>

      {/* Drag & Drop Upload Container */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`w-full max-w-2xl rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer p-8 sm:p-12 text-center flex flex-col items-center justify-center relative overflow-hidden ${
          isDragging
            ? 'border-cyan-400 bg-cyan-950/30 scale-[1.01]'
            : 'border-slate-700/80 hover:border-slate-500 bg-slate-900/50 hover:bg-slate-900/80'
        } ${isUploading ? 'pointer-events-none opacity-90' : ''}`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept=".pdf,application/pdf"
          className="hidden"
        />

        {/* Ambient Gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 via-transparent to-transparent pointer-events-none" />

        {isUploading ? (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-cyan-500/20 border-t-cyan-400 animate-spin flex items-center justify-center" />
              <Loader2 className="w-6 h-6 text-cyan-400 absolute inset-0 m-auto animate-pulse" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-semibold text-white">{uploadProgressText}</p>
              <p className="text-xs text-slate-400">Splitting chunks (1000/200) and caching BGE-small vectors...</p>
            </div>
          </div>
        ) : (
          <>
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4 group-hover:scale-110 transition-transform shadow-lg shadow-cyan-500/10">
              <UploadCloud className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">
              Click to browse or drop your PDF here
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Standard PDF & Scanned Documents with OCR fallback • Max 15 MB
            </p>
            <div className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs shadow-md shadow-cyan-600/30 transition-all flex items-center gap-2">
              <FileText className="w-4 h-4" /> Select PDF
            </div>
          </>
        )}
      </div>

      {/* Error Message */}
      {uploadError && (
        <div className="mt-4 w-full max-w-2xl p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Feature Pills */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl mt-12">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start gap-3">
          <Shield className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-semibold text-white">Strict Grounding</h4>
            <p className="text-xs text-slate-400 mt-1">
              If an answer is not explicitly in the PDF, it says so immediately without guessing.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-semibold text-white">Page Citations</h4>
            <p className="text-xs text-slate-400 mt-1">
              Every factual assertion references exact document pages with expandable text snippets.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start gap-3">
          <Cpu className="w-5 h-5 text-indigo-400 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-semibold text-white">Groq & OpenRouter</h4>
            <p className="text-xs text-slate-400 mt-1">
              Lightning-fast Llama 3.3 generation with automatic fallback to prevent rate limits.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

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

    const ALLOWED_EXTS = ['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.bmp', '.tiff'];
    const fileExt = '.' + file.name.split('.').pop().toLowerCase();
    if (!ALLOWED_EXTS.includes(fileExt)) {
      setUploadError('Supported files: PDF (.pdf) and images (.png, .jpg, .jpeg, .webp).');
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
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-800/60 border border-zinc-700/60 text-zinc-300 text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5" /> FastEmbed ONNX & ChromaDB Vector Store
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
          Chat With Any <span className="bg-gradient-to-r from-zinc-100 via-zinc-400 to-zinc-600 bg-clip-text text-transparent">PDF Document</span>
        </h1>
        <p className="text-zinc-400 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
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
            ? 'border-zinc-400 bg-zinc-900/50 scale-[1.01]'
            : 'border-zinc-700/80 hover:border-zinc-500 bg-zinc-900/50 hover:bg-zinc-900/80'
        } ${isUploading ? 'pointer-events-none opacity-90' : ''}`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept=".pdf,application/pdf,image/png,image/jpeg,image/webp,image/jpg"
          className="hidden"
        />

        {/* Ambient Gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-transparent pointer-events-none" />

        {isUploading ? (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-zinc-700 border-t-zinc-300 animate-spin flex items-center justify-center" />
              <Loader2 className="w-6 h-6 text-zinc-300 absolute inset-0 m-auto animate-pulse" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-semibold text-white">{uploadProgressText}</p>
              <p className="text-xs text-zinc-400">Extracting text via OCR, chunking and caching vectors...</p>
            </div>
          </div>
        ) : (
          <>
            <div className="w-16 h-16 rounded-2xl bg-zinc-800/80 border border-zinc-700/80 flex items-center justify-center text-zinc-200 mb-4 group-hover:scale-110 transition-transform shadow-lg shadow-black/20">
              <UploadCloud className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">
              Click to browse or drop your PDF / Image here
            </h3>
            <p className="text-xs text-zinc-400 mb-4">
              PDFs, Scanned Documents & Images (PNG, JPG, WebP) with OCR • Max 15 MB
            </p>
            <div className="px-4 py-2 rounded-xl bg-gradient-to-r from-zinc-900 via-neutral-900 to-zinc-800 hover:from-zinc-800 hover:to-zinc-700 border border-zinc-700/60 text-white font-medium text-xs shadow-md shadow-black/30 transition-all flex items-center gap-2">
              <FileText className="w-4 h-4" /> Select File
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
          <CheckCircle2 className="w-5 h-5 text-zinc-300 mt-0.5 flex-shrink-0" />
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

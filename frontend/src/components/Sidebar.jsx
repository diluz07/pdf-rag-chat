import React, { useRef } from 'react';
import {
  FileText,
  UploadCloud,
  CheckCircle2,
  Trash2,
  ShieldCheck,
  Loader2,
  Sparkles,
  Lock,
  Mail,
} from 'lucide-react';

export default function Sidebar({
  activeDoc,
  isUploading,
  uploadProgressText,
  onUploadFile,
  onRemoveDoc,
  serverStatus,
  isMobileOpen,
  onCloseMobile,
  user,
  onOpenAuthModal,
}) {
  const fileInputRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    if (!user) {
      onOpenAuthModal?.();
      return;
    }
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleSelect = (e) => {
    if (!user) {
      onOpenAuthModal?.();
      return;
    }
    if (e.target.files && e.target.files.length > 0) {
      onUploadFile(e.target.files[0]);
    }
  };

  return (
    <aside
      className={`w-full md:w-[320px] lg:w-[340px] shrink-0 bg-white dark:bg-slate-900 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 flex flex-col z-20 overflow-y-auto transition-all ${
        isMobileOpen ? 'block' : 'hidden md:flex'
      }`}
    >
      {/* Brand Logo & Title */}
      <div className="p-5 pb-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/70">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-cyan-500 flex items-center justify-center text-white shadow-sm shadow-sky-500/25">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">DocChat</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded">
                v1.0
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Sidebar Content Area */}
      <div className="p-5 flex-1 flex flex-col space-y-4">
        
        {/* State 0: Unauthenticated Mandatory Gate */}
        {!user ? (
          <div className="flex flex-col">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 block">
              Upload Document
            </label>
            <div
              onClick={onOpenAuthModal}
              className="group relative border-2 border-dashed border-sky-300 dark:border-sky-800/80 hover:border-sky-500 dark:hover:border-sky-400 rounded-custom p-6 text-center cursor-pointer transition-all bg-sky-50/50 hover:bg-sky-100/40 dark:bg-sky-950/20 dark:hover:bg-sky-950/40 flex flex-col items-center justify-center min-h-[200px]"
            >
              <div className="w-12 h-12 rounded-full bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Lock className="w-5 h-5" />
              </div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Sign In to Upload
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                Sign in with your email to upload and chat with documents.
              </p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenAuthModal?.();
                }}
                className="mt-4 px-4 py-2 bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-sky-600/20 cursor-pointer"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Sign In with Email</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2 text-center">
              Enter your email to receive an instant 6-digit access code.
            </p>
          </div>
        ) : (
          <>
            {/* State 1: Upload Zone (when user logged in and no active doc) */}
            {!activeDoc && !isUploading && (
              <div className="flex flex-col">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 block">
                  Upload Document
                </label>
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="group relative border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-brand-500 dark:hover:border-brand-500 rounded-custom p-6 text-center cursor-pointer transition-all bg-slate-50/60 hover:bg-brand-50/20 dark:bg-slate-800/40 dark:hover:bg-slate-800/80 flex flex-col items-center justify-center min-h-[190px]"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleSelect}
                    accept=".pdf,application/pdf"
                    className="hidden"
                  />
                  <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 group-hover:bg-brand-100 dark:group-hover:bg-brand-900/40 text-slate-500 group-hover:text-brand-600 dark:text-slate-400 dark:group-hover:text-brand-400 flex items-center justify-center mb-3 transition-colors">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    <span className="text-brand-600 dark:text-brand-400">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 font-medium">
                    Accepts <span className="text-slate-700 dark:text-slate-300 font-semibold">.pdf</span> only
                  </p>
                  <span className="inline-block mt-3 text-[11px] font-medium text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-800/90 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                    Max file size 30 MB
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2 text-center">
                  Your document remains private and is only used to answer questions during this session.
                </p>
              </div>
            )}
          </>
        )}

        {/* State 2: Processing / Embedding State */}
        {isUploading && (
          <div className="flex flex-col space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
              Embedding Document
            </label>
            <div className="border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 rounded-custom p-4 space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-lg bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                    Parsing PDF...
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">FastEmbed ONNX</p>
                </div>
              </div>

              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-brand-600 dark:text-brand-400 font-medium">{uploadProgressText}</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Fast</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div className="bg-brand-600 h-full rounded-full animate-pulse w-3/4"></div>
                </div>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 italic">
                  Reading and indexing your document...
                </p>
              </div>
            </div>
          </div>
        )}

        {/* State 3: Active File Card (Ready State) */}
        {activeDoc && !isUploading && (
          <div className="flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Active Document
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Ready
              </span>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 shadow-xs rounded-custom p-4 transition-all hover:border-slate-300 dark:hover:border-slate-700">
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/40 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate" title={activeDoc.filename}>
                    {activeDoc.filename}
                  </h4>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    <span>{activeDoc.total_pages} pages</span>
                    <span>•</span>
                    <span>Indexed</span>
                  </div>
                </div>
              </div>

              {/* Metadata Specs */}
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/60 grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-400 block text-[10px]">INDEX STATUS</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">100% Embedded</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">CHUNKS</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">{activeDoc.chunks_count} text vectors</span>
                </div>
              </div>

              {/* Remove / Upload New PDF Button */}
              <button
                onClick={onRemoveDoc}
                className="w-full mt-4 inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-custom text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700/60 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>Remove / Upload new PDF</span>
              </button>
            </div>
          </div>
        )}

        {/* Document Guardrail Notice */}
        <div className="rounded-custom p-3.5 bg-brand-50/60 dark:bg-brand-950/20 border border-brand-100 dark:border-brand-900/30">
          <div className="flex items-start space-x-2.5">
            <ShieldCheck className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <strong className="font-semibold text-brand-700 dark:text-brand-300">Strict Grounding:</strong> Answers are retrieved exclusively from document passages. No hallucinated external facts.
            </p>
          </div>
        </div>

      </div>

      {/* Sidebar Footer Info */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 dark:text-slate-500 flex items-center justify-between">
        <span>DocChat Engine 2.4</span>
        <span className="flex items-center gap-1">
          <span className={`w-1.5 h-1.5 rounded-full ${serverStatus === 'online' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          {serverStatus === 'online' ? 'Vector index synced' : 'Connecting...'}
        </span>
      </div>
    </aside>
  );
}

import React from 'react';
import { FileText, Cpu, ShieldCheck, Activity, RefreshCw } from 'lucide-react';

export default function Header({ serverStatus, activeDoc, onResetDocument, isBooting }) {
  return (
    <header className="w-full border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-xl sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-white tracking-tight">DocuMind</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                RAG QA
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">Zero-Hallucination PDF Assistant</p>
          </div>
        </div>

        {/* Server & Document Info Badges */}
        <div className="flex items-center gap-3">
          {/* Server Uptime / Status Indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/50 text-xs">
            <span className="relative flex h-2 w-2">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  serverStatus === 'online' ? 'bg-emerald-400' : isBooting ? 'bg-amber-400' : 'bg-rose-400'
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  serverStatus === 'online' ? 'bg-emerald-500' : isBooting ? 'bg-amber-500' : 'bg-rose-500'
                }`}
              />
            </span>
            <span className="text-slate-300 font-medium">
              {serverStatus === 'online'
                ? 'Backend Ready'
                : isBooting
                ? 'Server Booting...'
                : 'Connecting...'}
            </span>
          </div>

          {/* Active Document Indicator */}
          {activeDoc && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-950/40 border border-cyan-800/40 text-xs text-cyan-300">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span className="truncate max-w-[140px] font-medium">{activeDoc.filename}</span>
              <span className="text-slate-400">({activeDoc.total_pages}p)</span>
              <button
                onClick={onResetDocument}
                title="Change or upload a new PDF"
                className="ml-1 text-slate-400 hover:text-white transition-colors p-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}

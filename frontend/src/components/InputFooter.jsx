import React, { useState, useRef, useEffect } from 'react';
import { Send, ShieldCheck, ArrowRight } from 'lucide-react';

export default function InputFooter({
  activeDoc,
  onSendMessage,
  isLoading,
  user,
  onOpenAuthModal,
}) {
  const [input, setInput] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (user && activeDoc && !isLoading) {
      inputRef.current?.focus();
    }
  }, [user, activeDoc, isLoading]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!user) {
      onOpenAuthModal?.();
      return;
    }
    if (!input.trim() || isLoading || !activeDoc) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const handleInputClick = () => {
    if (!user) {
      onOpenAuthModal?.();
    }
  };

  return (
    <footer className="p-4 sm:p-5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0 transition-colors">
      <div className="max-w-3xl mx-auto space-y-2">
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onClick={handleInputClick}
            onChange={(e) => setInput(e.target.value)}
            disabled={(!user ? false : !activeDoc) || isLoading}
            readOnly={!user}
            placeholder={
              !user
                ? 'Please sign in with your email to ask questions...'
                : !activeDoc
                ? 'Upload a PDF to ask questions...'
                : `Ask a question about ${activeDoc.filename}...`
            }
            className={`w-full pl-4 pr-24 py-3 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-300/80 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition-all shadow-xs ${
              !user ? 'cursor-pointer' : 'disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={!user ? false : !input.trim() || !activeDoc || isLoading}
            aria-label="Send query"
            className="absolute right-2 px-3.5 py-1.5 bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 active:opacity-90 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm shadow-sky-600/20 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
          >
            <span>{!user ? 'Sign In' : 'Send'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Fixed Hint */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 px-1">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400 shrink-0" />
            <span>Answers come only from your document.</span>
          </span>
          <span className="hidden sm:inline">
            Press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-mono">Enter</kbd> to submit
          </span>
        </div>
      </div>
    </footer>
  );
}

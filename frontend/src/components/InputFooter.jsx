import React, { useState, useRef, useEffect } from 'react';
import { Send, ShieldCheck, ArrowRight, MessageCircleDashed } from 'lucide-react';

export default function InputFooter({
  activeDoc,
  onSendMessage,
  isLoading,
  user,
  onOpenAuthModal,
  isTemporaryChat,
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
    <footer className="p-4 sm:p-5 bg-transparent shrink-0 transition-colors">
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
                : isTemporaryChat
                ? `Ask a question about ${activeDoc.filename} (temporary chat)...`
                : `Ask a question about ${activeDoc.filename}...`
            }
            className={`w-full pl-5 pr-26 py-3.5 text-sm bg-white/70 dark:bg-black/50 backdrop-blur-xl border border-zinc-200/80 dark:border-white/10 rounded-3xl text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-400/40 dark:focus:ring-white/20 focus:border-zinc-400 dark:focus:border-white/20 transition-all shadow-lg shadow-black/5 dark:shadow-black/30 ${
              !user ? 'cursor-pointer' : 'disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={!user ? false : !input.trim() || !activeDoc || isLoading}
            aria-label="Send query"
            className="absolute right-2 px-4 py-2 bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-black rounded-2xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none cursor-pointer"
          >
            <span>{!user ? 'Sign In' : 'Send'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Fixed Hint */}
        <div className="flex items-center justify-between text-[11px] text-zinc-400 dark:text-zinc-500 px-1">
          {isTemporaryChat ? (
            <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
              <MessageCircleDashed className="w-3.5 h-3.5 shrink-0" />
              <span>Temporary Mode Active: Zero chat history saved to this device</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400 shrink-0" />
              <span>Answers come only from your document.</span>
            </span>
          )}
          <span className="hidden sm:inline">
            Press <kbd className="px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-[10px] font-mono text-zinc-600 dark:text-zinc-400">Enter</kbd> to submit
          </span>
        </div>
      </div>
    </footer>
  );
}

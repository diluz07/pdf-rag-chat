import React, { useState, useRef, useEffect } from 'react';
import { Send, Trash2, Sliders, Shield } from 'lucide-react';

export default function InputBar({
  onSendMessage,
  isLoading,
  disabled,
  onClearChat,
  threshold,
  setThreshold,
}) {
  const [input, setInput] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!disabled && !isLoading) {
      inputRef.current?.focus();
    }
  }, [disabled, isLoading]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading || disabled) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 pb-6">
      
      {/* Precision / Settings Drawer */}
      {showSettings && (
        <div className="mb-3 p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2 text-zinc-300">
            <Shield className="w-4 h-4 text-zinc-300" />
            <span className="font-medium">Cosine Similarity Gatekeeper:</span>
            <span className="font-mono text-zinc-200 font-bold">{threshold}</span>
            <span className="text-[11px] text-zinc-500">
              (Higher = stricter rejection of out-of-document queries)
            </span>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0.20"
              max="0.65"
              step="0.05"
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              className="w-32 accent-zinc-500 cursor-pointer"
            />
            <button
              onClick={() => setThreshold(0.35)}
              className="text-[11px] text-zinc-400 hover:text-white underline"
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {/* Main Input Form */}
      <form
        onSubmit={handleSubmit}
        className="relative flex items-center rounded-2xl bg-zinc-900/90 border border-zinc-800 focus-within:border-zinc-500/50 focus-within:ring-2 focus-within:ring-zinc-500/20 shadow-xl transition-all"
      >
        {/* Settings Toggle */}
        <button
          type="button"
          onClick={() => setShowSettings(!showSettings)}
          title="Tuning Settings"
          className={`p-3 text-zinc-400 hover:text-zinc-200 transition-colors ${
            showSettings ? 'text-zinc-200' : ''
          }`}
        >
          <Sliders className="w-4 h-4" />
        </button>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || isLoading}
          placeholder={
            disabled
              ? 'Upload a PDF to start asking questions...'
              : 'Ask a grounded question about the document... (Enter to send)'
          }
          className="flex-1 bg-transparent py-4 px-2 text-sm text-white placeholder-zinc-500 focus:outline-none disabled:opacity-50"
        />

        {/* Clear Chat Button */}
        <button
          type="button"
          onClick={onClearChat}
          title="Clear Conversation"
          disabled={disabled || isLoading}
          className="p-3 text-zinc-500 hover:text-rose-400 transition-colors disabled:opacity-30"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!input.trim() || isLoading || disabled}
          className="mr-2 p-2.5 rounded-xl bg-gradient-to-r from-zinc-900 via-neutral-900 to-zinc-800 hover:from-zinc-800 hover:to-zinc-700 border border-zinc-700/60 text-white font-medium shadow-md shadow-black/30 disabled:opacity-30 disabled:pointer-events-none transition-all"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}

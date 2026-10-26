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
        <div className="mb-3 p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2 text-slate-300">
            <Shield className="w-4 h-4 text-cyan-400" />
            <span className="font-medium">Cosine Similarity Gatekeeper:</span>
            <span className="font-mono text-cyan-400 font-bold">{threshold}</span>
            <span className="text-[11px] text-slate-500">
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
              className="w-32 accent-cyan-500 cursor-pointer"
            />
            <button
              onClick={() => setThreshold(0.35)}
              className="text-[11px] text-slate-400 hover:text-white underline"
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {/* Main Input Form */}
      <form
        onSubmit={handleSubmit}
        className="relative flex items-center rounded-2xl bg-slate-900/90 border border-slate-800 focus-within:border-cyan-500/50 focus-within:ring-2 focus-within:ring-cyan-500/20 shadow-xl transition-all"
      >
        {/* Settings Toggle */}
        <button
          type="button"
          onClick={() => setShowSettings(!showSettings)}
          title="Tuning Settings"
          className={`p-3 text-slate-400 hover:text-cyan-400 transition-colors ${
            showSettings ? 'text-cyan-400' : ''
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
          className="flex-1 bg-transparent py-4 px-2 text-sm text-white placeholder-slate-500 focus:outline-none disabled:opacity-50"
        />

        {/* Clear Chat Button */}
        <button
          type="button"
          onClick={onClearChat}
          title="Clear Conversation"
          disabled={disabled || isLoading}
          className="p-3 text-slate-500 hover:text-rose-400 transition-colors disabled:opacity-30"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!input.trim() || isLoading || disabled}
          className="mr-2 p-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium shadow-md shadow-cyan-600/20 disabled:opacity-30 disabled:pointer-events-none transition-all"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}

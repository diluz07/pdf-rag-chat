import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Info,
} from 'lucide-react';

export default function MessageList({
  activeDoc,
  messages,
  isLoading,
  onSelectPrompt,
}) {
  const [expandedSources, setExpandedSources] = useState({});
  const [highlightedSource, setHighlightedSource] = useState(null);
  const messagesEndRef = useRef(null);
  const [loadingDuration, setLoadingDuration] = useState(0);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    let interval;
    if (isLoading) {
      setLoadingDuration(0);
      interval = setInterval(() => setLoadingDuration((prev) => prev + 1), 1000);
    } else {
      setLoadingDuration(0);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const toggleAllSources = (msgIndex) => {
    setExpandedSources((prev) => ({
      ...prev,
      [msgIndex]: !prev[msgIndex],
    }));
  };

  const handleCitationClick = (msgIndex, sourceIndex) => {
    // Expand the sources container if closed
    setExpandedSources((prev) => ({
      ...prev,
      [msgIndex]: true,
    }));
    
    // Highlight the target passage
    const targetKey = `${msgIndex}-${sourceIndex}`;
    setHighlightedSource(targetKey);
    setTimeout(() => {
      setHighlightedSource(null);
    }, 2500);

    const el = document.getElementById(`source-snippet-${targetKey}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  // 1. EMPTY STATE (No PDF loaded)
  if (!activeDoc) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto py-12 px-4 select-none">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-4">
          <FileText className="w-8 h-8" />
        </div>
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
          Upload a PDF to start chatting
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
          DocChat analyzes contracts, research papers, financial reports, or manuals and answers questions strictly from the document text.
        </p>
      </div>
    );
  }

  // 2. CONVERSATION VIEW (When PDF is loaded)
  return (
    <div className="space-y-6 max-w-3xl mx-auto py-4 px-2 sm:px-4">
      {/* Session Divider */}
      <div className="flex items-center justify-center">
        <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 bg-slate-100/80 dark:bg-slate-900/80 px-3 py-1 rounded-full border border-slate-200/50 dark:border-slate-800/50">
          Document Session Started • {activeDoc.filename}
        </span>
      </div>

      {/* Message List */}
      {messages.map((msg, index) => {
        const isUser = msg.role === 'user';
        const isNotFound = !msg.grounded && !isUser;
        const allExpanded = !!expandedSources[index];

        if (isUser) {
          return (
            <div key={index} className="flex justify-end">
              <div className="max-w-[85%] sm:max-w-[75%] rounded-custom bg-brand-600 text-white p-4 shadow-xs text-sm leading-relaxed">
                {msg.content}
              </div>
            </div>
          );
        }

        // Assistant Message: Not Found Case
        if (isNotFound) {
          return (
            <div key={index} className="flex justify-start items-start space-x-3">
              <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center shrink-0 mt-0.5">
                <Info className="w-4 h-4" />
              </div>
              <div className="max-w-[88%] sm:max-w-[80%]">
                <div className="rounded-custom bg-slate-100/90 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs">
                  <div className="flex items-start gap-3">
                    <div className="p-1 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0 mt-0.5">
                      <Info className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        I couldn't find that in the uploaded document.
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        The uploaded PDF does not contain relevant information to answer this question. DocChat strictly adheres to zero-hallucination document grounding.
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                          Try asking about specific sections, terms, or tables present in the PDF.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        }

        // Assistant Message: Grounded Answer
        return (
          <div key={index} className="flex justify-start items-start space-x-3">
            <div className="w-8 h-8 rounded-lg bg-brand-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>

            <div className="max-w-[88%] sm:max-w-[80%] space-y-3">
              <div className="rounded-custom bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                <div className="whitespace-pre-wrap">{msg.content}</div>

                {/* Citations Bar */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Citations:
                    </span>

                    {msg.sources.map((src, sIdx) => (
                      <button
                        key={sIdx}
                        onClick={() => handleCitationClick(index, sIdx)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-950/60 dark:hover:text-brand-300 border border-slate-200 dark:border-slate-700 transition-colors"
                      >
                        <FileText className="w-3 h-3 text-slate-400" />
                        Page {src.page}
                      </button>
                    ))}

                    {/* View sources toggle */}
                    <button
                      onClick={() => toggleAllSources(index)}
                      className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline"
                    >
                      <span>{allExpanded ? 'Hide sources' : 'View sources'}</span>
                      {allExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                )}

                {/* Expandable Exact Text Passages */}
                {allExpanded && msg.sources && msg.sources.length > 0 && (
                  <div className="mt-3.5 pt-3.5 border-t border-slate-100 dark:border-slate-800/80 space-y-2.5">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Exact Document Passages Used:
                    </div>

                    {msg.sources.map((src, sIdx) => {
                      const snippetKey = `${index}-${sIdx}`;
                      const isTarget = highlightedSource === snippetKey;
                      return (
                        <div
                          key={sIdx}
                          id={`source-snippet-${snippetKey}`}
                          className={`p-3 rounded-lg border text-xs transition-all ${
                            isTarget
                              ? 'ring-2 ring-brand-500 bg-brand-50/50 dark:bg-brand-950/40 border-brand-300'
                              : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/60'
                          }`}
                        >
                          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1 font-medium">
                            <span className="text-brand-600 dark:text-brand-400 font-semibold">
                              Page {src.page}
                            </span>
                            <span className="text-[10px]">
                              Match score: {(src.score * 100).toFixed(0)}%
                            </span>
                          </div>
                          <blockquote className="italic text-slate-700 dark:text-slate-300 font-mono text-[11px] bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800 leading-relaxed">
                            "{src.content}"
                          </blockquote>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Typing Indicator */}
      {isLoading && (
        <div className="flex justify-start items-start space-x-3">
          <div className="w-8 h-8 rounded-lg bg-brand-600/90 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="rounded-custom bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-3 shadow-xs">
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {loadingDuration < 4
                  ? 'DocChat is reading document chunks'
                  : 'DocChat is writing an answer...'}
              </span>
              <div className="flex items-center space-x-1 pl-1">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-600 typing-dot"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-brand-600 typing-dot"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-brand-600 typing-dot"></div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}

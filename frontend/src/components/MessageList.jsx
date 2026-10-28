import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  FileText,
  ChevronDown,
  ChevronUp,
  Info,
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  UploadCloud,
  MessageCircleDashed,
} from 'lucide-react';

// Helper to detect if a message states the content is not found in the document
const isNotContainedInDoc = (text) => {
  if (!text) return false;
  const lower = text.replace(/’/g, "'").replace(/[“”]/g, '"').toLowerCase();
  return (
    lower.includes("doesn't talk") ||
    lower.includes("does not talk") ||
    lower.includes("not talk about") ||
    lower.includes("doesn't mention") ||
    lower.includes("does not mention") ||
    lower.includes("not mentioned") ||
    lower.includes("doesn't contain") ||
    lower.includes("does not contain") ||
    lower.includes("not contained") ||
    lower.includes("couldn't find") ||
    lower.includes("could not find") ||
    lower.includes("doesn't cover") ||
    lower.includes("does not cover") ||
    lower.includes("doesn't discuss") ||
    lower.includes("does not discuss") ||
    lower.includes("no definition") ||
    lower.includes("not found")
  );
};

// Helper to detect if an assistant response is a conversational greeting/pleasantry
const isConversationalPleasantry = (text) => {
  if (!text) return false;
  const lower = text.trim().toLowerCase();
  return (
    lower.startsWith('hello') ||
    lower.startsWith('hi ') ||
    lower.startsWith('hi!') ||
    lower.startsWith('good day') ||
    lower.startsWith('good morning') ||
    lower.startsWith('good afternoon') ||
    lower.startsWith('good evening') ||
    lower.startsWith('welcome') ||
    lower.includes('how can i help you') ||
    lower.includes('how can i assist you') ||
    lower.includes("you're welcome") ||
    lower.includes('you are welcome')
  );
};

export default function MessageList({
  activeDoc,
  messages,
  isLoading,
  onSelectPrompt,
  user,
  onOpenAuthModal,
  onTriggerUpload,
  isTemporaryChat,
  onToggleTemporaryChat,
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
        <div 
          onClick={onTriggerUpload}
          className="w-16 h-16 rounded-3xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 flex items-center justify-center mb-4 cursor-pointer hover:scale-105 transition-transform shadow-xs"
        >
          <FileText className="w-8 h-8" />
        </div>
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          Upload a PDF to start chatting
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
          <span className="font-extrabold text-zinc-900 dark:text-white">PAGE</span>
          <span className="font-medium text-zinc-400 dark:text-zinc-500">WISE</span>{' '}
          analyzes contracts, research papers, financial reports, or lecture notes and answers questions strictly from the document text.
        </p>
        <button
          onClick={onTriggerUpload}
          className="mt-5 px-6 py-2.5 rounded-full bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 font-semibold text-xs flex items-center gap-2 shadow-xs transition-all hover:scale-105 active:scale-95 cursor-pointer"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload Document</span>
        </button>
      </div>
    );
  }

  // 2. CONVERSATION VIEW (When PDF is loaded)
  return (
    <div className="space-y-6 max-w-3xl mx-auto py-4 px-2 sm:px-4">
      {/* Session Divider */}
      <div className="flex items-center justify-center gap-2 flex-wrap">
        <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 bg-white/60 dark:bg-white/5 backdrop-blur-md px-3.5 py-1 rounded-full border border-zinc-200/60 dark:border-white/10 shadow-2xs">
          Document Session Started • {activeDoc.filename}
        </span>
        {isTemporaryChat && (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-500/15 backdrop-blur-md px-3 py-1 rounded-full border border-amber-500/30">
            <MessageCircleDashed className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            <span>Temporary Mode (No storage)</span>
          </span>
        )}
      </div>

      {/* Message List */}
      {messages.map((msg, index) => {
        const isUser = msg.role === 'user';
        const isNotFound = (!msg.grounded || isNotContainedInDoc(msg.content)) && !isUser;
        const allExpanded = !!expandedSources[index];

        if (isUser) {
          return (
            <div key={index} className="flex justify-end items-end space-x-2">
              <div className="max-w-[85%] sm:max-w-[75%] rounded-3xl rounded-br-md bg-white/85 text-zinc-900 border border-zinc-200/80 shadow-md backdrop-blur-xl dark:bg-white/10 dark:text-white dark:border-white/15 px-5 py-3.5 text-sm leading-relaxed tracking-wide">
                {msg.content}
              </div>
            </div>
          );
        }

        // Assistant Message: Not Found Case
        if (isNotFound) {
          return (
            <div key={index} className="flex justify-start items-start">
              <div className="max-w-[88%] sm:max-w-[82%]">
                <div className="rounded-3xl rounded-tl-md bg-white/70 dark:bg-black/45 backdrop-blur-2xl border border-zinc-200/70 dark:border-white/10 p-5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 border border-amber-500/20">
                      <Info className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                        {msg.content}
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
                          Not found in the uploaded document
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
          <div key={index} className="flex justify-start items-start">
            <div className="max-w-[88%] sm:max-w-[82%] space-y-3">
              <div className="rounded-3xl rounded-tl-md bg-white/75 dark:bg-black/45 backdrop-blur-2xl border border-zinc-200/70 dark:border-white/10 p-5.5 shadow-md text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed">
                <div className="text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({ node, ...props }) => <p className="mb-2.5 last:mb-0 leading-relaxed" {...props} />,
                      strong: ({ node, ...props }) => (
                        <strong className="font-bold text-zinc-900 dark:text-white" {...props} />
                      ),
                      em: ({ node, ...props }) => (
                        <em className="italic text-zinc-800 dark:text-zinc-200" {...props} />
                      ),
                      ul: ({ node, ...props }) => (
                        <ul className="list-disc pl-5 my-2.5 space-y-1.5 marker:text-zinc-500" {...props} />
                      ),
                      ol: ({ node, ...props }) => (
                        <ol className="list-decimal pl-5 my-2.5 space-y-1.5 marker:text-zinc-500 font-medium" {...props} />
                      ),
                      li: ({ node, ...props }) => (
                        <li className="pl-0.5 leading-relaxed" {...props} />
                      ),
                      h1: ({ node, ...props }) => (
                        <h1 className="text-lg font-bold text-zinc-900 dark:text-white mt-4 mb-2 first:mt-0" {...props} />
                      ),
                      h2: ({ node, ...props }) => (
                        <h2 className="text-base font-bold text-zinc-900 dark:text-white mt-3.5 mb-2 first:mt-0" {...props} />
                      ),
                      h3: ({ node, ...props }) => (
                        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mt-3 mb-1.5 first:mt-0 uppercase tracking-wide" {...props} />
                      ),
                      blockquote: ({ node, ...props }) => (
                        <blockquote className="border-l-3 border-zinc-500 pl-3 my-2 text-zinc-600 dark:text-zinc-400 italic" {...props} />
                      ),
                      code: ({ inline, className, children, ...props }) => {
                        return inline ? (
                          <code className="px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 font-mono text-xs font-semibold" {...props}>
                            {children}
                          </code>
                        ) : (
                          <pre className="p-3 my-2 rounded-2xl bg-zinc-950 text-zinc-100 font-mono text-xs overflow-x-auto border border-zinc-800">
                            <code {...props}>{children}</code>
                          </pre>
                        );
                      },
                      table: ({ node, ...props }) => (
                        <div className="overflow-x-auto my-3">
                          <table className="w-full text-xs border border-zinc-200 dark:border-zinc-800" {...props} />
                        </div>
                      ),
                      th: ({ node, ...props }) => (
                        <th className="border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 p-2 font-semibold text-left text-zinc-900 dark:text-white" {...props} />
                      ),
                      td: ({ node, ...props }) => (
                        <td className="border border-zinc-200 dark:border-zinc-800 p-2 text-zinc-700 dark:text-zinc-300" {...props} />
                      ),
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>

                {/* Citations Bar: strictly only when content was grounded in the document and not a greeting/pleasantry */}
                {msg.grounded && !isNotContainedInDoc(msg.content) && !isConversationalPleasantry(msg.content) && msg.sources && msg.sources.length > 0 && (
                  <div className="mt-3.5 pt-1 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                      Citations:
                    </span>

                    {msg.sources.map((src, sIdx) => (
                      <button
                        key={sIdx}
                        onClick={() => handleCitationClick(index, sIdx)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-medium bg-white/70 dark:bg-white/10 text-zinc-700 dark:text-zinc-300 hover:bg-white dark:hover:bg-white/20 border border-zinc-200/70 dark:border-white/15 backdrop-blur-xs transition-colors cursor-pointer"
                      >
                        <FileText className="w-3 h-3 text-zinc-400" />
                        Page {src.page}
                      </button>
                    ))}

                    {/* View sources toggle */}
                    <button
                      onClick={() => toggleAllSources(index)}
                      className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:underline cursor-pointer"
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
                {allExpanded && msg.grounded && !isNotContainedInDoc(msg.content) && msg.sources && msg.sources.length > 0 && (
                  <div className="mt-3 pt-1 space-y-2.5">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Exact Document Passages Used:
                    </div>

                    {msg.sources.map((src, sIdx) => {
                      const snippetKey = `${index}-${sIdx}`;
                      const isTarget = highlightedSource === snippetKey;
                      return (
                        <div
                          key={sIdx}
                          id={`source-snippet-${snippetKey}`}
                          className={`p-3.5 rounded-2xl border text-xs backdrop-blur-md transition-all ${
                            isTarget
                              ? 'ring-2 ring-zinc-400 bg-white/90 dark:bg-white/15 border-zinc-300 dark:border-white/30'
                              : 'bg-white/50 dark:bg-black/35 border-zinc-200/70 dark:border-white/10'
                          }`}
                        >
                          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-1.5 font-medium">
                            <span className="text-zinc-900 dark:text-zinc-100 font-semibold">
                              Page {src.page}
                            </span>
                            <span className="text-[10px]">
                              Match score: {(src.score * 100).toFixed(0)}%
                            </span>
                          </div>
                          <blockquote className="italic text-zinc-700 dark:text-zinc-300 font-mono text-[11px] bg-white/70 dark:bg-black/60 p-2.5 rounded-xl border border-zinc-200/70 dark:border-white/10 backdrop-blur-xs leading-relaxed">
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
        <div className="flex justify-start items-start">
          <div className="rounded-3xl rounded-tl-md bg-white/75 dark:bg-black/45 backdrop-blur-2xl border border-zinc-200/70 dark:border-white/10 px-4 py-3 shadow-sm">
            <div className="flex items-center space-x-2.5">
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                {loadingDuration < 4
                  ? 'Searching and reading document...'
                  : 'Synthesizing verified answer...'}
              </span>
              <div className="flex items-center space-x-1 pl-1">
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-600 dark:bg-zinc-400 typing-dot"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-600 dark:bg-zinc-400 typing-dot"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-600 dark:bg-zinc-400 typing-dot"></div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}

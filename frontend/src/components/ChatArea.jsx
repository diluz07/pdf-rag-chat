import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  Bot,
  ShieldCheck,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Sparkles,
  ExternalLink,
  Layers,
} from 'lucide-react';

export default function ChatArea({
  messages,
  isLoading,
  activeDoc,
  onSelectPrompt,
}) {
  const [expandedSources, setExpandedSources] = useState({});
  const messagesEndRef = useRef(null);
  const [loadingDuration, setLoadingDuration] = useState(0);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Loading timer for progressive cold start indicators
  useEffect(() => {
    let interval;
    if (isLoading) {
      setLoadingDuration(0);
      interval = setInterval(() => {
        setLoadingDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setLoadingDuration(0);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const toggleSource = (msgIndex, sourceIndex) => {
    const key = `${msgIndex}-${sourceIndex}`;
    setExpandedSources((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const samplePrompts = [
    'What is the central topic of this document?',
    'Summarize the key findings or conclusions.',
    'List all dates, numbers, and metrics mentioned.',
    'What are the core recommendations or steps?',
  ];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden max-w-5xl w-full mx-auto">
      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        
        {/* Welcome Banner */}
        {messages.length === 0 && (
          <div className="my-auto py-12 flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4 shadow-lg shadow-cyan-500/10">
              <BookOpen className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">
              Ready to analyze <span className="text-cyan-400">{activeDoc?.filename}</span>
            </h2>
            <p className="text-xs text-slate-400 max-w-md mb-6">
              Indexed {activeDoc?.total_pages} pages into {activeDoc?.chunks_count} semantic chunks.
              Ask any question, or choose a starter below:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-lg w-full">
              {samplePrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => onSelectPrompt(prompt)}
                  className="px-3.5 py-2.5 rounded-xl bg-slate-900/80 hover:bg-cyan-950/40 border border-slate-800 hover:border-cyan-500/30 text-left text-xs text-slate-300 hover:text-cyan-300 transition-all flex items-center justify-between group"
                >
                  <span className="truncate">{prompt}</span>
                  <Sparkles className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 transition-colors flex-shrink-0 ml-2" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Conversation List */}
        {messages.map((msg, index) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={index}
              className={`flex gap-3 sm:gap-4 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white flex-shrink-0 shadow-md shadow-cyan-600/20 mt-1">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div className={`max-w-[85%] sm:max-w-[75%] space-y-2`}>
                
                {/* Bubble */}
                <div
                  className={`p-4 rounded-2xl text-sm leading-relaxed ${
                    isUser
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-br-none shadow-lg shadow-cyan-600/20'
                      : 'bg-slate-900/90 border border-slate-800 text-slate-200 rounded-bl-none shadow-md'
                  }`}
                >
                  {/* Grounding Status Pill on Assistant Messages */}
                  {!isUser && (
                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-800/80 text-xs">
                      {msg.grounded ? (
                        <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          <ShieldCheck className="w-3.5 h-3.5" /> 100% Grounded in Document
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-amber-400 font-medium bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                          <AlertTriangle className="w-3.5 h-3.5" /> Outside Document Scope
                        </span>
                      )}

                      {msg.provider && (
                        <span className="text-[10px] text-slate-500 ml-auto uppercase tracking-wider font-mono">
                          {msg.provider}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Message Body */}
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>

                {/* Sources / Citations Section */}
                {!isUser && msg.sources && msg.sources.length > 0 && (
                  <div className="rounded-xl bg-slate-900/60 border border-slate-800/70 p-3 text-xs">
                    <div className="flex items-center justify-between text-slate-400 mb-2 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Referenced Context ({msg.sources.length} chunks)</span>
                      </div>
                      <span className="text-[10px] text-slate-500">Sorted by relevance</span>
                    </div>

                    <div className="space-y-2">
                      {msg.sources.map((src, sIdx) => {
                        const isExpanded = expandedSources[`${index}-${sIdx}`];
                        return (
                          <div
                            key={sIdx}
                            className="rounded-lg bg-slate-950/60 border border-slate-800/60 p-2.5 transition-colors"
                          >
                            <div
                              onClick={() => toggleSource(index, sIdx)}
                              className="flex items-center justify-between cursor-pointer select-none"
                            >
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-bold text-[11px] border border-cyan-500/20">
                                  Page {src.page}
                                </span>
                                <span className="text-slate-400 text-[11px]">
                                  Match Score: {(src.score * 100).toFixed(1)}%
                                </span>
                              </div>
                              <button className="text-slate-400 hover:text-white p-0.5">
                                {isExpanded ? (
                                  <ChevronUp className="w-3.5 h-3.5" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>

                            {/* Collapsible Content */}
                            {isExpanded && (
                              <div className="mt-2 pt-2 border-t border-slate-800 text-slate-300 font-mono text-[11px] leading-relaxed bg-slate-900/40 p-2 rounded">
                                {src.content}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {isUser && (
                <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 flex-shrink-0 shadow mt-1">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}

        {/* Loading Indicator with Cold-Start Feedback */}
        {isLoading && (
          <div className="flex gap-3 items-start justify-start">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white flex-shrink-0 shadow-md shadow-cyan-600/20 animate-pulse">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-4 rounded-2xl rounded-bl-none bg-slate-900/90 border border-slate-800 text-xs text-slate-300 space-y-2 max-w-md shadow-lg">
              {loadingDuration < 4 ? (
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" />
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.2s]" />
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.4s]" />
                  </div>
                  <span className="text-slate-400">Searching document embeddings...</span>
                </div>
              ) : loadingDuration < 12 ? (
                <div className="flex items-center gap-2 text-cyan-300">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  <span>Synthesizing answer with strict grounding rules...</span>
                </div>
              ) : (
                <div className="space-y-1 text-amber-300">
                  <div className="flex items-center gap-2 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    <span>Free Cloud Instance Spin-Up</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    Free deployment servers wake up after inactivity. Your grounded answer will arrive in a few seconds!
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}

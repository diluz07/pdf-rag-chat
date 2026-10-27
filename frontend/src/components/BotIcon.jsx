import React from 'react';

/**
 * BotIcon (Official PageWise AI Mark)
 * Vector-rendered custom PageWise document emblem with folded corner and highlighted lines.
 */
export default function BotIcon({ size = 'md', isThinking = false, className = '' }) {
  const isSmall = size === 'sm';
  const boxSize = isSmall ? 'w-6 h-6 rounded-xl' : 'w-8 h-8 rounded-2xl';
  const iconSize = isSmall ? 'w-3.5 h-3.5' : 'w-4.5 h-4.5';

  return (
    <div
      className={`relative flex items-center justify-center shrink-0 ${boxSize} bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 shadow-xs transition-all ${
        isThinking ? 'ring-2 ring-zinc-400/40 dark:ring-zinc-600/50 scale-105' : ''
      } ${className} select-none overflow-hidden`}
      title={isThinking ? 'PageWise Thinking...' : 'PageWise AI'}
    >
      <svg
        viewBox="0 0 64 64"
        className={`${iconSize} transition-all ${isThinking ? 'animate-pulse' : ''}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12 6H38L52 20V58H12Z"
          className="fill-zinc-950 stroke-zinc-950 dark:fill-white dark:stroke-white transition-colors"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path
          d="M38 6V20H52Z"
          className="fill-zinc-600 stroke-zinc-600 dark:fill-zinc-300 dark:stroke-zinc-300 transition-colors"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <rect x="19" y="25" width="22" height="4" rx="2" className="fill-zinc-400 dark:fill-zinc-400" />
        <rect x="17" y="33" width="30" height="9" rx="2" className="fill-white dark:fill-zinc-950 transition-colors" />
        <rect x="19" y="46" width="16" height="4" rx="2" className="fill-zinc-400 dark:fill-zinc-400" />
      </svg>

      {/* Dynamic thinking pulse beacon */}
      {isThinking && (
        <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-zinc-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-zinc-700 dark:bg-zinc-200"></span>
        </span>
      )}
    </div>
  );
}

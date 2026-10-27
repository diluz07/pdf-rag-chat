import React from 'react';
import {
  MessageSquare,
  RotateCcw,
  Sun,
  Moon,
  MessageCircleDashed,
} from 'lucide-react';

export default function TopBar({
  isSidebarOpen,
  onToggleSidebar,
  activeDoc,
  chatTitle,
  onNewChat,
  onNewTemporaryChat,
  onClearChat,
  isDarkMode,
  onToggleTheme,
  user,
  onOpenAuthModal,
  onLogout,
  isTemporaryChat,
  onToggleTemporaryChat,
}) {
  return (
    <header className="h-14 px-4 sm:px-6 bg-transparent flex items-center justify-between shrink-0 z-10 transition-all select-none">
      {/* Heading of Chat in a Glass Bubble */}
      <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white/70 dark:bg-white/10 border border-zinc-200/70 dark:border-white/15 shadow-xs backdrop-blur-xl transition-all max-w-[calc(100%-80px)] sm:max-w-md">
        <div
          className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border ${
            isTemporaryChat
              ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30'
              : 'bg-zinc-100 dark:bg-white/10 text-zinc-700 dark:text-zinc-200 border-zinc-200/60 dark:border-white/10'
          }`}
        >
          {isTemporaryChat ? (
            <MessageCircleDashed className="w-3.5 h-3.5" />
          ) : (
            <MessageSquare className="w-3.5 h-3.5" />
          )}
        </div>

        <div className="min-w-0 flex items-center gap-2 flex-1">
          <h2 className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white truncate">
            {chatTitle || (activeDoc ? activeDoc.filename : 'New Chat')}
          </h2>

          {isTemporaryChat && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
              Temp
            </span>
          )}

          {activeDoc && (
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 shrink-0">
              {activeDoc.total_pages}p
            </span>
          )}
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex items-center space-x-2">
        {/* Clear Conversation Glass Bubble */}
        <button
          onClick={onClearChat}
          title="Clear conversation"
          aria-label="Clear conversation"
          className="h-8 px-2.5 rounded-full border border-zinc-200/70 dark:border-white/15 bg-white/70 dark:bg-white/10 hover:bg-white/90 dark:hover:bg-white/20 text-zinc-700 dark:text-zinc-200 hover:text-zinc-950 dark:hover:text-white backdrop-blur-xl transition-all flex items-center gap-1.5 font-medium cursor-pointer shadow-xs hover:scale-105 active:scale-95"
        >
          <RotateCcw className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
          <span className="text-[11px] hidden sm:inline">Clear</span>
        </button>

        {/* Theme Toggle (Light / Dark) Glass Bubble */}
        <button
          onClick={onToggleTheme}
          aria-label="Toggle Light/Dark Theme"
          className="h-8 px-2.5 rounded-full border border-zinc-200/70 dark:border-white/15 bg-white/70 dark:bg-white/10 hover:bg-white/90 dark:hover:bg-white/20 text-zinc-700 dark:text-zinc-300 backdrop-blur-xl transition-all flex items-center gap-1.5 font-medium cursor-pointer shadow-xs hover:scale-105 active:scale-95"
        >
          {isDarkMode ? (
            <Sun className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <Moon className="w-3.5 h-3.5 text-zinc-600" />
          )}
          <span className="text-[11px] hidden sm:inline">{isDarkMode ? 'Dark' : 'Light'}</span>
        </button>
      </div>
    </header>
  );
}

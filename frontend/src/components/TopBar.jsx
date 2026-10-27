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
      <div className="flex items-center space-x-2.5 min-w-0">
        <div
          className={`p-1.5 rounded-xl border transition-all shadow-2xs backdrop-blur-xs ${
            isTemporaryChat
              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
              : 'bg-white/60 dark:bg-white/10 text-zinc-700 dark:text-zinc-200 border-zinc-200/40 dark:border-white/10'
          }`}
        >
          {isTemporaryChat ? (
            <MessageCircleDashed className="w-4 h-4" />
          ) : (
            <MessageSquare className="w-4 h-4" />
          )}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white truncate max-w-[180px] sm:max-w-md">
              {chatTitle || (activeDoc ? activeDoc.filename : 'New Chat')}
            </h2>
            {isTemporaryChat && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                Temporary
              </span>
            )}
            {activeDoc && (
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 backdrop-blur-xs">
                {activeDoc.total_pages} pages indexed
              </span>
            )}
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
            {isTemporaryChat
              ? 'Temporary chat: not saved to device'
              : activeDoc
              ? 'Active document session'
              : 'Upload a PDF or image to begin'}
          </p>
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex items-center space-x-2">
        {/* Clear Chat */}
        {activeDoc && (
          <button
            onClick={onClearChat}
            title="Clear conversation"
            className="p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-xl hover:bg-white/80 dark:hover:bg-white/10 backdrop-blur-xs transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}

        {/* Theme Toggle (Light / Dark) */}
        <button
          onClick={onToggleTheme}
          aria-label="Toggle Light/Dark Theme"
          className="p-1.5 px-2.5 rounded-2xl border border-zinc-200/70 dark:border-white/10 bg-white/70 dark:bg-white/5 text-zinc-700 dark:text-zinc-300 hover:bg-white dark:hover:bg-white/10 backdrop-blur-md transition-colors flex items-center gap-1.5 font-medium cursor-pointer"
        >
          {isDarkMode ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-zinc-600" />
          )}
          <span className="text-[11px] hidden sm:inline">{isDarkMode ? 'Dark' : 'Light'}</span>
        </button>
      </div>
    </header>
  );
}

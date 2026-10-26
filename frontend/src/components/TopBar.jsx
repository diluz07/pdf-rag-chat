import React from 'react';
import { MessageSquare, RotateCcw, Sun, Moon, Menu, Sparkles } from 'lucide-react';

export default function TopBar({
  activeDoc,
  onClearChat,
  isDarkMode,
  onToggleTheme,
  onToggleMobileSidebar,
  viewMode,
  onToggleViewMode,
}) {
  return (
    <header className="h-14 px-4 sm:px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 z-10 transition-colors">
      <div className="flex items-center space-x-3 min-w-0">
        {/* Mobile menu trigger */}
        <button
          onClick={onToggleMobileSidebar}
          className="md:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Toggle Upload Sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hidden sm:block">
          <MessageSquare className="w-4 h-4" />
        </div>
        
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white truncate max-w-[180px] sm:max-w-md">
              {activeDoc ? activeDoc.filename : 'No document selected'}
            </h2>
            {activeDoc && (
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                {activeDoc.total_pages} pages indexed
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
            {activeDoc ? 'Direct grounded query session' : 'Upload a PDF from the sidebar to begin'}
          </p>
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex items-center space-x-2">
        {/* View Mode Toggle: Classic Chat vs Thinking Orb vs Gateway Flow */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
          <button
            onClick={() => onToggleViewMode('chat')}
            className={`px-2 py-1 rounded-md transition-all font-medium flex items-center gap-1 ${
              viewMode === 'chat'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <MessageSquare className="w-3 h-3" />
            <span className="hidden sm:inline">Chat</span>
          </button>
          <button
            onClick={() => onToggleViewMode('orb')}
            className={`px-2 py-1 rounded-md transition-all font-medium flex items-center gap-1 ${
              viewMode === 'orb'
                ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span className="hidden sm:inline">Orb</span>
          </button>
          <button
            onClick={() => onToggleViewMode('gateway')}
            className={`px-2 py-1 rounded-md transition-all font-medium flex items-center gap-1 ${
              viewMode === 'gateway'
                ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
            <span className="hidden sm:inline">Gateway</span>
          </button>
        </div>

        {/* Clear Chat */}
        {activeDoc && viewMode === 'chat' && (
          <button
            onClick={onClearChat}
            title="Clear conversation"
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}

        {/* Theme Toggle (Light / Dark) */}
        <button
          onClick={onToggleTheme}
          aria-label="Toggle Light/Dark Theme"
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1.5 font-medium"
        >
          {isDarkMode ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-600" />
          )}
          <span className="text-[11px] hidden sm:inline">{isDarkMode ? 'Dark' : 'Light'}</span>
        </button>
      </div>
    </header>
  );
}

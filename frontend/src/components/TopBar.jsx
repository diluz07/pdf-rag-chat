import React from 'react';
import { MessageSquare, RotateCcw, Sun, Moon, Menu, LogIn, LogOut, User as UserIcon } from 'lucide-react';

export default function TopBar({
  activeDoc,
  onClearChat,
  isDarkMode,
  onToggleTheme,
  onToggleMobileSidebar,
  user,
  onOpenAuthModal,
  onLogout,
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
        {/* Clear Chat */}
        {activeDoc && (
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

        {/* Authentication: User Profile or Sign In */}
        <div className="pl-1 sm:pl-2 border-l border-slate-200 dark:border-slate-800 flex items-center">
          {user ? (
            <div className="flex items-center gap-2">
              {user.picture ? (
                <img
                  src={user.picture}
                  alt={user.name}
                  className="w-7 h-7 rounded-full border border-slate-300 dark:border-slate-700 object-cover"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-brand-600 text-white font-semibold text-xs flex items-center justify-center uppercase shadow-xs">
                  {user.name ? user.name.charAt(0) : 'U'}
                </div>
              )}
              <div className="hidden md:flex flex-col text-left">
                <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate max-w-[120px]">
                  {user.name}
                </span>
                <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
                  {user.email}
                </span>
              </div>
              <button
                onClick={onLogout}
                title="Sign out"
                className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ml-0.5"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuthModal}
              className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  RotateCcw,
  Sun,
  Moon,
  MessageCircleDashed,
  Pencil,
  Check,
  X,
} from 'lucide-react';

export default function TopBar({
  isSidebarOpen,
  onToggleSidebar,
  activeDoc,
  chatId,
  chatTitle,
  onNewChat,
  onNewTemporaryChat,
  onClearChat,
  onRenameChat,
  isDarkMode,
  onToggleTheme,
  user,
  onOpenAuthModal,
  onLogout,
  isTemporaryChat,
  onToggleTemporaryChat,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(chatTitle || '');

  useEffect(() => {
    setEditValue(chatTitle || '');
  }, [chatTitle]);

  const handleSave = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== chatTitle && chatId) {
      onRenameChat?.(chatId, trimmed);
    }
    setIsEditing(false);
  };

  return (
    <header className="h-14 px-4 sm:px-6 bg-transparent flex items-center justify-between shrink-0 z-10 transition-colors select-none">
      {/* Left: Chat Heading & Info */}
      <div className="flex items-center gap-2.5 min-w-0 max-w-[calc(100%-140px)] sm:max-w-md">
        <div
          className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border ${
            isTemporaryChat
              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
          }`}
        >
          {isTemporaryChat ? (
            <MessageCircleDashed className="w-3.5 h-3.5" />
          ) : (
            <MessageSquare className="w-3.5 h-3.5" />
          )}
        </div>

        {isEditing ? (
          <div className="flex items-center gap-1 min-w-0 flex-1">
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') {
                  setEditValue(chatTitle || '');
                  setIsEditing(false);
                }
              }}
              autoFocus
              maxLength={60}
              placeholder="Chat name..."
              className="px-2.5 py-1 text-xs sm:text-sm font-semibold rounded-lg border border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-400 min-w-0 flex-1"
            />
            <button
              onClick={handleSave}
              title="Save name"
              aria-label="Save name"
              className="p-1 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer shrink-0"
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
            <button
              onClick={() => {
                setEditValue(chatTitle || '');
                setIsEditing(false);
              }}
              title="Cancel"
              aria-label="Cancel"
              className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 min-w-0 group">
            <h2
              onClick={() => {
                setEditValue(chatTitle || (activeDoc ? activeDoc.filename : 'New Chat'));
                setIsEditing(true);
              }}
              title="Click to edit chat name"
              className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white truncate cursor-pointer hover:underline underline-offset-2"
            >
              {chatTitle || (activeDoc ? activeDoc.filename : 'New Chat')}
            </h2>
            <button
              onClick={() => {
                setEditValue(chatTitle || (activeDoc ? activeDoc.filename : 'New Chat'));
                setIsEditing(true);
              }}
              title="Edit chat name"
              aria-label="Edit chat name"
              className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 opacity-60 group-hover:opacity-100 transition-opacity cursor-pointer shrink-0"
            >
              <Pencil className="w-3 h-3" />
            </button>
          </div>
        )}

        {isTemporaryChat && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            Temp
          </span>
        )}

        {activeDoc && (
          <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 shrink-0">
            {activeDoc.total_pages}p
          </span>
        )}
      </div>

      {/* Action Controls */}
      <div className="flex items-center space-x-2">
        {/* Clear Conversation Pill Button */}
        <button
          onClick={onClearChat}
          title="Clear conversation"
          aria-label="Clear conversation"
          className="h-8 px-3 rounded-full border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
        >
          <RotateCcw className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
          <span className="text-[11px] hidden sm:inline">Clear</span>
        </button>

        {/* Theme Toggle Pill Button */}
        <button
          onClick={onToggleTheme}
          aria-label="Toggle Light/Dark Theme"
          className="h-8 px-3 rounded-full border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
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

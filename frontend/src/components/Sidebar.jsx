import React, { useRef, useState } from 'react';
import {
  FileText,
  UploadCloud,
  CheckCircle2,
  Trash2,
  Loader2,
  Sparkles,
  Lock,
  Mail,
  MessageCircleDashed,
  Plus,
  MessageSquare,
  LogOut,
  LogIn,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Check,
  X,
} from 'lucide-react';

export default function Sidebar({
  isOpen = true,
  onToggleSidebar,
  chats = [],
  activeChatId,
  onNewChat,
  onNewTemporaryChat,
  onSelectChat,
  onDeleteChat,
  onRenameChat,
  activeDoc,
  isUploading,
  uploadProgressText,
  onUploadFile,
  onRemoveDoc,
  serverStatus,
  user,
  onOpenAuthModal,
  onLogout,
  isTemporaryChat,
  onToggleTemporaryChat,
}) {
  const fileInputRef = useRef(null);
  const [editingChatId, setEditingChatId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');

  const handleStartRename = (chat, e) => {
    e?.stopPropagation();
    setEditingChatId(chat.id);
    setEditingTitle(chat.title || '');
  };

  const handleSaveRename = (chatId, e) => {
    e?.stopPropagation();
    const trimmed = editingTitle.trim();
    if (trimmed) {
      onRenameChat?.(chatId, trimmed);
    }
    setEditingChatId(null);
  };

  const handleCancelRename = (e) => {
    e?.stopPropagation();
    setEditingChatId(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (!user) {
        onOpenAuthModal?.();
      }
      onUploadFile(file);
    }
  };

  const handleSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (!user) {
        onOpenAuthModal?.();
      }
      onUploadFile(file);
      e.target.value = '';
    }
  };

  // COLLAPSED STATE: Vertical slim bar
  if (!isOpen) {
    return (
      <aside className="w-16 shrink-0 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-between py-4 z-20 transition-all select-none h-full">
        {/* Top Section: Toggle button to re-expand and Quick New Chat */}
        <div className="flex flex-col items-center space-y-3">
          <button
            onClick={onToggleSidebar}
            title="Expand sidebar"
            aria-label="Expand sidebar"
            className="p-2 rounded-full text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <PanelLeftOpen className="w-5 h-5" />
          </button>

          {/* New Chat Pill Button */}
          <button
            onClick={onNewChat}
            title="New Chat"
            aria-label="New Chat"
            className="w-10 h-10 rounded-full bg-white hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 flex items-center justify-center transition-all shadow-2xs cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
          </button>

          {/* Temp Chat Pill Button */}
          <button
            onClick={onNewTemporaryChat}
            title="New Temporary Chat"
            aria-label="New Temporary Chat"
            className="w-10 h-10 rounded-full bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center justify-center transition-all shadow-2xs cursor-pointer"
          >
            <MessageCircleDashed className="w-4 h-4" />
          </button>
        </div>

        {/* Bottom Section: User Profile in Collapsed Sidebar */}
        <div className="flex flex-col items-center gap-2">
          {user ? (
            <>
              <button
                onClick={onToggleSidebar}
                title={`${user.name || user.email} (click to expand)`}
                aria-label="User profile"
                className="p-0.5 rounded-full hover:ring-2 hover:ring-zinc-400 dark:hover:ring-zinc-600 transition-all cursor-pointer"
              >
                {user.picture ? (
                  <img
                    src={user.picture}
                    alt={user.name}
                    className="w-8 h-8 rounded-full border border-zinc-300 dark:border-zinc-700 object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-bold text-xs flex items-center justify-center uppercase shadow-xs">
                    {user.name ? user.name.charAt(0) : 'U'}
                  </div>
                )}
              </button>
              <button
                onClick={onLogout}
                title="Sign out"
                aria-label="Sign out"
                className="w-8 h-8 rounded-full flex items-center justify-center text-rose-600 dark:text-rose-400 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-900/60 transition-all shadow-2xs cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 stroke-[2.2]" />
              </button>
            </>
          ) : (
            <button
              onClick={onOpenAuthModal}
              title="Sign In"
              aria-label="Sign In"
              className="w-8 h-8 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 flex items-center justify-center shadow-xs cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
            </button>
          )}
        </div>
      </aside>
    );
  }

  // EXPANDED STATE: Full Sidebar
  return (
    <aside className="w-full md:w-[320px] lg:w-[340px] shrink-0 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col z-20 overflow-y-auto transition-all h-full">
      {/* Brand Title with Toggle Button on Sidebar Header */}
      <div className="p-4 sm:p-5 pb-3 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80">
        <div className="flex items-center">
          <span className="text-xl font-bold tracking-tight select-none">
            <span className="font-extrabold text-zinc-950 dark:text-white">PAGE</span>
            <span className="font-semibold text-zinc-400 dark:text-zinc-500">WISE</span>
          </span>
        </div>

        {/* Sidebar Close / Toggle Button */}
        <button
          onClick={onToggleSidebar}
          title="Collapse sidebar"
          aria-label="Collapse sidebar"
          className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          <PanelLeftClose className="w-5 h-5" />
        </button>
      </div>

      {/* Main Sidebar Content Area */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col space-y-4">
        {/* 1. New Chat & Temporary Chat Pill Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onNewChat}
                className="px-4 py-2.5 rounded-full bg-white hover:bg-zinc-50 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-2xs cursor-pointer"
                title="Start a new persistent chat saved in history"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>New Chat</span>
              </button>
              <button
                onClick={onNewTemporaryChat}
                className="px-4 py-2.5 rounded-full bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                title="Start a new temporary chat (nothing saved to your device)"
              >
                <MessageCircleDashed className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Temp Chat</span>
              </button>
            </div>

            {/* 2. Conversations List with Renaming & Deleting */}
            {chats && chats.length > 0 && (
              <div className="flex flex-col space-y-1.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                    Conversations
                  </span>
                  <span className="text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-2 py-0.5 rounded-full border border-zinc-200 dark:border-zinc-700">
                    {chats.length}
                  </span>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1 pr-0.5">
                  {chats.map((chat) => {
                    const isActive = chat.id === activeChatId;
                    const msgCount = chat.messages ? chat.messages.length : 0;
                    const isChatTemp = Boolean(chat.isTemporary);
                    const isCurrentlyEditing = editingChatId === chat.id;

                    return (
                      <div
                        key={chat.id}
                        onClick={() => {
                          if (!isCurrentlyEditing) onSelectChat(chat.id);
                        }}
                        className={`group relative flex items-center justify-between p-2 rounded-xl text-xs transition-all cursor-pointer border ${
                          isActive
                            ? isChatTemp
                              ? 'bg-amber-500/15 border-amber-500/40 text-amber-950 dark:text-amber-200 font-semibold shadow-xs'
                              : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-950 dark:text-white font-semibold shadow-xs'
                            : 'border-transparent text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                          <div
                            className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border ${
                              isActive
                                ? isChatTemp
                                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/40'
                                  : 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-600'
                                : isChatTemp
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700/60'
                            }`}
                          >
                            {isChatTemp ? (
                              <MessageCircleDashed className="w-3.5 h-3.5" />
                            ) : chat.activeDoc ? (
                              <FileText className="w-3.5 h-3.5" />
                            ) : (
                              <MessageSquare className="w-3.5 h-3.5" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            {isCurrentlyEditing ? (
                              <div
                                className="flex items-center gap-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <input
                                  type="text"
                                  value={editingTitle}
                                  onChange={(e) => setEditingTitle(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveRename(chat.id, e);
                                    if (e.key === 'Escape') handleCancelRename(e);
                                  }}
                                  autoFocus
                                  maxLength={50}
                                  className="w-full px-1.5 py-0.5 text-xs rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400"
                                />
                                <button
                                  type="button"
                                  onClick={(e) => handleSaveRename(chat.id, e)}
                                  title="Save"
                                  aria-label="Save"
                                  className="p-1 rounded text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                                >
                                  <Check className="w-3 h-3 stroke-[2.5]" />
                                </button>
                                <button
                                  type="button"
                                  onClick={handleCancelRename}
                                  title="Cancel"
                                  aria-label="Cancel"
                                  className="p-1 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center gap-1.5">
                                  <p className="truncate text-xs leading-tight">
                                    {chat.title || 'New Chat'}
                                  </p>
                                  {isChatTemp && (
                                    <span className="text-[9px] px-1 py-0.2 rounded-sm bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-bold shrink-0 uppercase tracking-tighter">
                                      Temp
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate mt-0.5">
                                  {isChatTemp
                                    ? 'Temporary • unsaved'
                                    : chat.activeDoc
                                    ? `${chat.activeDoc.total_pages}p • ${msgCount} msgs`
                                    : `${msgCount} msgs`}
                                </p>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons: Rename & Delete */}
                        {!isCurrentlyEditing && (
                          <div className="flex items-center gap-0.5 shrink-0 ml-1">
                            {/* Rename Chat Button */}
                            <button
                              type="button"
                              onClick={(e) => handleStartRename(chat, e)}
                              title="Rename chat"
                              aria-label={`Rename chat ${chat.title}`}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-700/60 transition-all cursor-pointer"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>

                            {/* Delete Chat Button */}
                            <button
                              type="button"
                              onClick={(e) => onDeleteChat(chat.id, e)}
                              title="Delete chat"
                              aria-label={`Delete chat ${chat.title}`}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5 stroke-[2]" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* State 1: Upload Zone (when active chat has no document yet) */}
            {!activeDoc && !isUploading && (
              <div className="flex flex-col pt-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2 block">
                  Document for this Chat
                </label>
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => {
                    if (!user) {
                      onOpenAuthModal?.();
                      return;
                    }
                    fileInputRef.current?.click();
                  }}
                  className="group relative border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600 rounded-2xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[160px] bg-zinc-50 dark:bg-zinc-850/50"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleSelect}
                    accept=".pdf,application/pdf,image/png,image/jpeg,image/webp,image/jpg"
                    className="hidden"
                  />
                  <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 flex items-center justify-center mb-2.5 transition-colors border border-zinc-200 dark:border-zinc-700 shadow-2xs">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                    <span className="text-zinc-900 dark:text-zinc-100">Upload PDF or Image</span>
                  </p>
                  <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1">
                    Indexed specifically for this chat
                  </p>
                  <span className="inline-block mt-2.5 text-[10px] font-medium text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-800 px-2.5 py-0.5 rounded-full border border-zinc-200 dark:border-zinc-700 shadow-2xs">
                    Max 30 MB
                  </span>
                </div>
              </div>
            )}

        {/* State 2: Processing / Embedding State */}
        {isUploading && (
          <div className="flex flex-col space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
              Embedding Document
            </label>
            <div className="border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-850/70 rounded-2xl p-4 space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center shrink-0">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                    Parsing PDF...
                  </h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">FastEmbed ONNX</p>
                </div>
              </div>

              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-zinc-700 dark:text-zinc-300 font-medium">{uploadProgressText}</span>
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">Fast</span>
                </div>
                <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-zinc-600 dark:bg-zinc-300 h-full rounded-full animate-pulse w-3/4"></div>
                </div>
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500 italic">
                  Reading and indexing your document...
                </p>
              </div>
            </div>
          </div>
        )}

        {/* State 3: Active File Card (Ready State) */}
        {activeDoc && !isUploading && (
          <div className="flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Active Document
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Ready
              </span>
            </div>

            <div className="border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-850/70 rounded-2xl p-4 transition-all">
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shrink-0 shadow-2xs">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate" title={activeDoc.filename}>
                    {activeDoc.filename}
                  </h4>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                    <span>{activeDoc.total_pages} pages</span>
                    <span>•</span>
                    <span>Indexed</span>
                  </div>
                </div>
              </div>

              {/* Metadata Specs */}
              <div className="mt-3 pt-2 grid grid-cols-2 gap-2 text-[11px] border-t border-zinc-200/60 dark:border-zinc-750">
                <div>
                  <span className="text-zinc-400 block text-[10px]">INDEX STATUS</span>
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">100% Embedded</span>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[10px]">CHUNKS</span>
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">{activeDoc.chunks_count} text vectors</span>
                </div>
              </div>

              {/* Remove / Upload New PDF Pill Button */}
              <button
                onClick={onRemoveDoc}
                className="w-full mt-4 inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-full text-rose-600 dark:text-rose-400 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-900/60 transition-all shadow-2xs cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 stroke-[2.2]" />
                <span>Remove / Upload new PDF</span>
              </button>
            </div>
          </div>
        )}

        {/* Temporary Chat Toggle Card */}
        <div
          className={`rounded-2xl p-3.5 border transition-all ${
            isTemporaryChat
              ? 'bg-amber-500/10 border-amber-500/30 shadow-xs'
              : 'bg-zinc-50 dark:bg-zinc-850/70 border-zinc-200 dark:border-zinc-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  isTemporaryChat
                    ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400'
                    : 'bg-zinc-200/80 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                }`}
              >
                <MessageCircleDashed className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <span>Temporary Mode</span>
                  {isTemporaryChat && (
                    <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 tracking-wider">
                      ON
                    </span>
                  )}
                </h4>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                  {isTemporaryChat
                    ? 'This chat is temporary (unsaved)'
                    : 'Toggle to convert chat to temporary'}
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isTemporaryChat}
              onClick={onToggleTemporaryChat}
              title={
                isTemporaryChat
                  ? 'Convert back to persistent chat (save to history)'
                  : 'Convert this chat to temporary (will not save)'
              }
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isTemporaryChat ? 'bg-amber-500' : 'bg-zinc-300 dark:bg-zinc-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                  isTemporaryChat ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Left Footer: User Profile */}
      <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0">
        {user ? (
          <div className="flex items-center justify-between gap-2.5 p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/80">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              {user.picture ? (
                <img
                  src={user.picture}
                  alt={user.name}
                  className="w-8 h-8 rounded-full border border-zinc-300 dark:border-zinc-700 object-cover shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-bold text-xs flex items-center justify-center uppercase shadow-xs shrink-0">
                  {user.name ? user.name.charAt(0) : 'U'}
                </div>
              )}
              <div className="flex flex-col text-left min-w-0 flex-1">
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                  {user.name || 'User'}
                </span>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                  {user.email}
                </span>
              </div>
            </div>

            {/* Sign Out Pill Button */}
            <button
              onClick={onLogout}
              title="Sign out of account"
              aria-label="Sign out"
              className="px-3 py-1.5 rounded-full text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-900/60 transition-all flex items-center gap-1.5 shrink-0 shadow-2xs cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 stroke-[2.2]" />
              <span>Sign out</span>
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuthModal}
            className="w-full px-4 py-2.5 rounded-full bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </aside>
  );
}

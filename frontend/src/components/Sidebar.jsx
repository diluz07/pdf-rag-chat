import React, { useRef } from 'react';
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
  Layers,
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

  const handleDrop = (e) => {
    e.preventDefault();
    if (!user) {
      onOpenAuthModal?.();
      return;
    }
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleSelect = (e) => {
    if (!user) {
      onOpenAuthModal?.();
      return;
    }
    if (e.target.files && e.target.files.length > 0) {
      onUploadFile(e.target.files[0]);
    }
  };

  // COLLAPSED STATE: Vertical rectangle block displaying toggle button and user profile
  if (!isOpen) {
    return (
      <aside
        className="w-16 shrink-0 bg-white/70 dark:bg-black/40 backdrop-blur-2xl border-r border-zinc-200/50 dark:border-white/10 flex flex-col items-center justify-between py-4 z-20 transition-all select-none h-full"
      >
        {/* Top Section: Toggle button to re-expand and Quick New Chat */}
        <div className="flex flex-col items-center space-y-3">
          <button
            onClick={onToggleSidebar}
            title="Expand sidebar"
            aria-label="Expand sidebar"
            className="p-2 rounded-2xl text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-white/80 dark:hover:bg-white/10 backdrop-blur-sm transition-colors cursor-pointer"
          >
            <PanelLeftOpen className="w-5 h-5" />
          </button>

          {user && (
            <>
              <button
                onClick={onNewChat}
                title="New Chat"
                aria-label="New Chat"
                className="w-9 h-9 rounded-2xl bg-white/80 hover:bg-white text-zinc-800 dark:bg-white/10 dark:hover:bg-white/15 dark:text-zinc-200 border border-zinc-200/80 dark:border-white/15 flex items-center justify-center shadow-xs backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
              </button>
              <button
                onClick={onNewTemporaryChat}
                title="New Temporary Chat"
                aria-label="New Temporary Chat"
                className="w-9 h-9 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center justify-center shadow-xs backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <MessageCircleDashed className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* Bottom Section: User Profile in the vertical rectangle block */}
        <div className="flex flex-col items-center">
          {user ? (
            <button
              onClick={onToggleSidebar}
              title={`${user.name || user.email} (click to expand)`}
              aria-label="User profile"
              className="p-1 rounded-full hover:ring-2 hover:ring-zinc-400 dark:hover:ring-zinc-600 transition-all cursor-pointer"
            >
              {user.picture ? (
                <img
                  src={user.picture}
                  alt={user.name}
                  className="w-8 h-8 rounded-full border border-zinc-300 dark:border-zinc-700 object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-white/80 dark:bg-white/10 text-zinc-800 dark:text-zinc-200 font-semibold text-xs flex items-center justify-center uppercase border border-zinc-200/80 dark:border-white/15 shadow-xs backdrop-blur-md">
                  {user.name ? user.name.charAt(0) : 'U'}
                </div>
              )}
            </button>
          ) : (
            <button
              onClick={onOpenAuthModal}
              title="Sign In"
              aria-label="Sign In"
              className="w-8 h-8 rounded-2xl bg-white/80 hover:bg-white dark:bg-white/10 text-zinc-800 dark:text-zinc-200 border border-zinc-200/80 dark:border-white/15 flex items-center justify-center shadow-xs backdrop-blur-md cursor-pointer"
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
    <aside
      className="w-full md:w-[320px] lg:w-[340px] shrink-0 bg-white/70 dark:bg-black/40 backdrop-blur-2xl border-r border-zinc-200/50 dark:border-white/10 flex flex-col z-20 overflow-y-auto transition-all h-full"
    >
      {/* Brand Title with Toggle Button on Sidebar Header */}
      <div className="p-4 sm:p-5 pb-3 flex items-center justify-between">
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
          className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-white/80 dark:hover:bg-white/10 transition-colors cursor-pointer"
        >
          <PanelLeftClose className="w-5 h-5" />
        </button>
      </div>

      {/* Main Sidebar Content Area */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col space-y-4">
        
        {/* State 0: Unauthenticated Mandatory Gate */}
        {!user ? (
          <div className="flex flex-col">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2 block">
              Upload Document
            </label>
            <div
              onClick={onOpenAuthModal}
              className="group relative border-2 border-dashed border-zinc-300 dark:border-zinc-800 hover:border-zinc-500 dark:hover:border-zinc-600 rounded-2xl p-6 text-center cursor-pointer transition-all bg-zinc-50/50 hover:bg-zinc-100/40 dark:bg-zinc-900/40 dark:hover:bg-zinc-850/60 flex flex-col items-center justify-center min-h-[200px]"
            >
              <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Lock className="w-5 h-5" />
              </div>
              <p className="text-sm font-bold text-zinc-800 dark:text-zinc-100">
                Sign In to Upload
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
                Sign in with your email to upload and chat with documents.
              </p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenAuthModal?.();
                }}
                className="mt-4 px-4 py-2 bg-white hover:bg-zinc-100 text-zinc-900 border border-zinc-200/90 dark:bg-zinc-900 dark:hover:bg-zinc-850 dark:text-white dark:border-zinc-800 rounded-2xl text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Sign In with Email</span>
              </button>
            </div>
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-2 text-center">
              Enter your email to receive an instant 6-digit access code.
            </p>
          </div>
        ) : (
          <>
            {/* 1. New Chat & Temporary Chat Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onNewChat}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-2xl bg-white/80 hover:bg-white text-zinc-900 border border-zinc-200/80 dark:bg-white/5 dark:hover:bg-white/10 dark:text-white dark:border-white/10 font-semibold text-xs shadow-xs backdrop-blur-md transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                title="Start a new persistent chat saved in history"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>New Chat</span>
              </button>
              <button
                type="button"
                onClick={onNewTemporaryChat}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30 font-semibold text-xs shadow-xs backdrop-blur-md transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                title="Start a new temporary chat (nothing saved to your device)"
              >
                <MessageCircleDashed className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Temp Chat</span>
              </button>
            </div>

            {/* 2. Conversations List */}
            {chats && chats.length > 0 && (
              <div className="flex flex-col space-y-1.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                    Conversations
                  </span>
                  <span className="text-[10px] font-semibold bg-white/60 dark:bg-white/10 text-zinc-600 dark:text-zinc-300 px-2 py-0.5 rounded-full border border-zinc-200/50 dark:border-white/10 backdrop-blur-xs">
                    {chats.length}
                  </span>
                </div>

                <div className="max-h-44 overflow-y-auto space-y-1 pr-0.5">
                  {chats.map((chat) => {
                    const isActive = chat.id === activeChatId;
                    const msgCount = chat.messages ? chat.messages.length : 0;
                    const isChatTemp = Boolean(chat.isTemporary);
                    return (
                      <div
                        key={chat.id}
                        onClick={() => onSelectChat(chat.id)}
                        className={`group relative flex items-center justify-between p-2.5 rounded-2xl text-xs transition-all cursor-pointer border ${
                          isActive
                            ? isChatTemp
                              ? 'bg-amber-500/10 dark:bg-amber-500/15 border-amber-500/30 text-amber-950 dark:text-amber-200 font-semibold shadow-xs backdrop-blur-md'
                              : 'bg-white/90 dark:bg-white/10 border-zinc-300/80 dark:border-white/20 text-zinc-900 dark:text-white font-semibold shadow-xs backdrop-blur-md'
                            : 'bg-white/40 dark:bg-white/5 border-zinc-200/50 dark:border-white/5 hover:bg-white/70 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-300 backdrop-blur-xs'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                          <div
                            className={`w-6 h-6 rounded-xl flex items-center justify-center shrink-0 border ${
                              isActive
                                ? isChatTemp
                                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/40 shadow-xs'
                                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700 shadow-xs'
                                : isChatTemp
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                                : 'bg-zinc-100 dark:bg-zinc-850 text-zinc-500 dark:text-zinc-400 border-transparent'
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
                          </div>
                        </div>

                        {/* Delete Chat Button */}
                        <button
                          type="button"
                          onClick={(e) => onDeleteChat(chat.id, e)}
                          title="Delete chat"
                          aria-label={`Delete chat ${chat.title}`}
                          className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-all ml-1 shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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
                  onClick={() => fileInputRef.current?.click()}
                  className="group relative border-2 border-dashed border-zinc-300/80 dark:border-white/10 hover:border-zinc-400 dark:hover:border-white/25 rounded-3xl p-5 text-center cursor-pointer transition-all bg-white/40 hover:bg-white/60 dark:bg-white/5 dark:hover:bg-white/10 backdrop-blur-md flex flex-col items-center justify-center min-h-[170px]"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleSelect}
                    accept=".pdf,application/pdf,image/png,image/jpeg,image/webp,image/jpg"
                    className="hidden"
                  />
                  <div className="w-10 h-10 rounded-full bg-white/80 dark:bg-white/10 group-hover:bg-white dark:group-hover:bg-white/20 text-zinc-600 dark:text-zinc-300 flex items-center justify-center mb-2.5 transition-colors border border-zinc-200/60 dark:border-white/10 shadow-2xs">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                    <span className="text-zinc-900 dark:text-zinc-100">Upload PDF or Image</span>
                  </p>
                  <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1">
                    Indexed specifically for this chat
                  </p>
                  <span className="inline-block mt-2.5 text-[10px] font-medium text-zinc-500 dark:text-zinc-400 bg-white/80 dark:bg-white/10 px-2.5 py-0.5 rounded-full border border-zinc-200/70 dark:border-white/10 backdrop-blur-xs">
                    Max 30 MB
                  </span>
                </div>
              </div>
            )}
          </>
        )}

        {/* State 2: Processing / Embedding State */}
        {isUploading && (
          <div className="flex flex-col space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
              Embedding Document
            </label>
            <div className="border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 rounded-3xl p-4 space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-2xl bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center shrink-0">
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
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 backdrop-blur-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Ready
              </span>
            </div>

            <div className="border border-zinc-200/70 dark:border-white/10 bg-white/60 dark:bg-white/5 backdrop-blur-md shadow-xs rounded-3xl p-4 transition-all hover:border-zinc-300 dark:hover:border-white/20">
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 flex items-center justify-center shrink-0">
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
              <div className="mt-3 pt-2 grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-zinc-400 block text-[10px]">INDEX STATUS</span>
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">100% Embedded</span>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[10px]">CHUNKS</span>
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">{activeDoc.chunks_count} text vectors</span>
                </div>
              </div>

              {/* Remove / Upload New PDF Button */}
              <button
                onClick={onRemoveDoc}
                className="w-full mt-4 inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-2xl text-zinc-700 dark:text-zinc-200 bg-white/70 hover:bg-white dark:bg-white/10 dark:hover:bg-white/15 border border-zinc-200/70 dark:border-white/10 backdrop-blur-xs transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                <span>Remove / Upload new PDF</span>
              </button>
            </div>
          </div>
        )}

        {/* Temporary Chat Toggle Card */}
        <div
          className={`rounded-3xl p-3.5 border transition-all ${
            isTemporaryChat
              ? 'bg-amber-500/10 border-amber-500/30 backdrop-blur-md shadow-xs'
              : 'bg-white/40 dark:bg-white/5 border-zinc-200/60 dark:border-white/10 backdrop-blur-md'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
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
      <div className="p-3 bg-white/30 dark:bg-white/5 backdrop-blur-md border-t border-zinc-200/40 dark:border-white/10 shrink-0">
        {user ? (
          <div className="flex items-center justify-between gap-2 p-1.5 rounded-2xl hover:bg-white/60 dark:hover:bg-white/10 transition-colors">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              {user.picture ? (
                <img
                  src={user.picture}
                  alt={user.name}
                  className="w-8 h-8 rounded-full border border-zinc-300 dark:border-zinc-700 object-cover shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-white/80 dark:bg-white/10 text-zinc-900 dark:text-zinc-100 font-semibold text-xs flex items-center justify-center uppercase shadow-xs shrink-0 border border-zinc-200/80 dark:border-white/15 backdrop-blur-xs">
                  {user.name ? user.name.charAt(0) : 'U'}
                </div>
              )}
              <div className="flex flex-col text-left min-w-0 flex-1">
                <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                  {user.name || 'User'}
                </span>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate">
                  {user.email}
                </span>
              </div>
            </div>
            <button
              onClick={onLogout}
              title="Sign out"
              aria-label="Sign out"
              className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors shrink-0 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuthModal}
            className="w-full px-3 py-2 rounded-2xl bg-white/80 hover:bg-white text-zinc-900 border border-zinc-200/80 dark:bg-white/10 dark:hover:bg-white/15 dark:text-white dark:border-white/15 text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-xs backdrop-blur-md cursor-pointer"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </aside>
  );
}

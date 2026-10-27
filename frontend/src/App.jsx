import React, { useState, useEffect, useRef } from 'react';
import { UploadCloud, MessageCircleDashed, Plus } from 'lucide-react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import MessageList from './components/MessageList';
import InputFooter from './components/InputFooter';
import AuthModal from './components/AuthModal';
import ConfirmModal from './components/ConfirmModal';

import { BACKEND_URL } from './config';

const createNewChat = ({ isTemporary = false, title = 'New Chat' } = {}) => ({
  id: 'chat_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
  title: isTemporary ? 'Temporary Chat' : title,
  activeDoc: null,
  messages: [],
  isTemporary: Boolean(isTemporary),
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

export default function App() {
  const [chats, setChats] = useState(() => {
    try {
      const saved = localStorage.getItem('docchat_all_chats');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      // Migrate from single chat if present
      const savedDoc = localStorage.getItem('docchat_active_doc');
      const savedMsgs = localStorage.getItem('docchat_messages');
      if (savedDoc || savedMsgs) {
        const parsedDoc = savedDoc ? JSON.parse(savedDoc) : null;
        const parsedMsgs = savedMsgs ? JSON.parse(savedMsgs) : [];
        return [
          {
            id: 'chat_' + Date.now(),
            title: parsedDoc ? parsedDoc.filename : 'New Chat',
            activeDoc: parsedDoc,
            messages: parsedMsgs,
            isTemporary: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        ];
      }
    } catch {}
    return [createNewChat()];
  });

  const [activeChatId, setActiveChatId] = useState(() => {
    try {
      const saved = localStorage.getItem('docchat_active_chat_id');
      return saved || null;
    } catch {
      return null;
    }
  });

  // Resolve active chat
  const activeChat = chats.find((c) => c.id === activeChatId) || chats[0] || null;
  const currentChatId = activeChat ? activeChat.id : null;
  const activeDoc = activeChat ? activeChat.activeDoc : null;
  const messages = activeChat ? activeChat.messages || [] : [];
  const isTemporaryChat = Boolean(activeChat?.isTemporary);

  // Update activeDoc for current chat
  const setActiveDoc = (newDoc) => {
    setChats((prev) =>
      prev.map((c) => {
        if (c.id === currentChatId) {
          return {
            ...c,
            activeDoc: newDoc,
            title: newDoc ? newDoc.filename : c.title,
            updatedAt: Date.now(),
          };
        }
        return c;
      })
    );
  };

  // Update messages for current chat
  const setMessages = (updater) => {
    setChats((prev) =>
      prev.map((c) => {
        if (c.id === currentChatId) {
          const nextMsgs = typeof updater === 'function' ? updater(c.messages || []) : updater;
          return {
            ...c,
            messages: nextMsgs,
            updatedAt: Date.now(),
          };
        }
        return c;
      })
    );
  };
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');
  const [isDragOverMain, setIsDragOverMain] = useState(false);
  const globalFileInputRef = useRef(null);
  const [serverStatus, setServerStatus] = useState('checking');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem('documind_theme');
      if (saved !== null) return saved === 'dark';
      return typeof window !== 'undefined'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
        : true;
    } catch {
      return true;
    }
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    try {
      const saved = localStorage.getItem('docchat_sidebar_open');
      if (saved !== null) return saved === 'true';
      return typeof window !== 'undefined' ? window.innerWidth >= 768 : true;
    } catch {
      return true;
    }
  });

  const handleToggleSidebar = () => {
    setIsSidebarOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('docchat_sidebar_open', String(next));
      } catch {}
      return next;
    });
  };

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('documind_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(() => {
    try {
      const saved = localStorage.getItem('documind_user');
      return !saved;
    } catch {
      return true;
    }
  });

  // In-page alert and confirmation modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    type: 'danger',
    onConfirm: () => {},
    onCancel: () => {},
  });

  const showConfirm = ({
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'danger',
    onConfirm,
  }) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      confirmText,
      cancelText,
      type,
      onConfirm: () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        if (onConfirm) onConfirm();
      },
      onCancel: () => setConfirmModal((prev) => ({ ...prev, isOpen: false })),
    });
  };

  const showAlert = ({
    title = 'Notice',
    message,
    confirmText = 'Understood',
    type = 'info',
  }) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      confirmText,
      cancelText: null,
      type,
      onConfirm: () => setConfirmModal((prev) => ({ ...prev, isOpen: false })),
      onCancel: () => setConfirmModal((prev) => ({ ...prev, isOpen: false })),
    });
  };

  // Sync persistent chats to localStorage (temporary chats are omitted from localStorage)
  useEffect(() => {
    try {
      const persistentChats = chats.filter((c) => !c.isTemporary);
      localStorage.setItem('docchat_all_chats', JSON.stringify(persistentChats));
      if (activeChat && !activeChat.isTemporary) {
        localStorage.setItem('docchat_active_chat_id', activeChat.id);
      }
    } catch {}
  }, [chats, activeChat]);

  // Handler for New Persistent Chat
  const handleNewChat = () => {
    const newChat = createNewChat({ isTemporary: false });
    setChats((prev) => [newChat, ...prev]);
    setActiveChatId(newChat.id);
    setIsMobileSidebarOpen(false);
  };

  // Handler for New Temporary Chat
  const handleNewTemporaryChat = () => {
    const newChat = createNewChat({ isTemporary: true });
    setChats((prev) => [newChat, ...prev]);
    setActiveChatId(newChat.id);
    setIsMobileSidebarOpen(false);
  };

  // Handler for Selecting a Chat
  const handleSelectChat = (chatId) => {
    setActiveChatId(chatId);
    setIsMobileSidebarOpen(false);
  };

  // Handler for Deleting a Chat
  const handleDeleteChat = (chatId, e) => {
    e?.stopPropagation();
    const chatToDelete = chats.find((c) => c.id === chatId);
    const chatTitle = chatToDelete?.title || 'this chat';

    showConfirm({
      title: 'Delete Chat',
      message: `Delete "${chatTitle}"? This will delete all messages and indexed documents in this chat.`,
      confirmText: 'Delete Chat',
      cancelText: 'Keep Chat',
      type: 'danger',
      onConfirm: () => {
        // Clean up vector index on backend if document was indexed
        if (chatToDelete?.activeDoc?.doc_id) {
          try {
            fetch(`${BACKEND_URL}/documents/${chatToDelete.activeDoc.doc_id}`, {
              method: 'DELETE',
            }).catch(() => {});
          } catch {}
        }

        const remaining = chats.filter((c) => c.id !== chatId);
        if (remaining.length === 0) {
          const fresh = createNewChat();
          setChats([fresh]);
          setActiveChatId(fresh.id);
        } else {
          setChats(remaining);
          if (currentChatId === chatId) {
            setActiveChatId(remaining[0].id);
          }
        }
      },
    });
  };

  // Handler to toggle temporary mode on the active chat (convert existing chat to/from temporary)
  const handleToggleTemporaryChat = () => {
    if (!currentChatId) return;
    setChats((prev) =>
      prev.map((c) => {
        if (c.id === currentChatId) {
          const nextIsTemporary = !c.isTemporary;
          return {
            ...c,
            isTemporary: nextIsTemporary,
            updatedAt: Date.now(),
          };
        }
        return c;
      })
    );
  };

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    localStorage.setItem('documind_user', JSON.stringify(userData));
    setIsAuthModalOpen(false);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('documind_user');
    localStorage.removeItem('docchat_all_chats');
    localStorage.removeItem('docchat_active_chat_id');
    localStorage.removeItem('docchat_active_doc');
    localStorage.removeItem('docchat_messages');
    const fresh = createNewChat();
    setChats([fresh]);
    setActiveChatId(fresh.id);
    setIsAuthModalOpen(true);
  };

  // Sync dark mode class on <html> and save to localStorage
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      try {
        localStorage.setItem('documind_theme', 'dark');
      } catch {}
    } else {
      document.documentElement.classList.remove('dark');
      try {
        localStorage.setItem('documind_theme', 'light');
      } catch {}
    }
  }, [isDarkMode]);

  // Server health check
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/health`);
        if (res.ok) {
          setServerStatus('online');
        } else {
          setServerStatus('offline');
        }
      } catch (err) {
        setServerStatus('offline');
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 25000);
    return () => clearInterval(interval);
  }, []);

  const handleUploadFile = async (file) => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    const ALLOWED_EXTS = ['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.bmp', '.tiff'];
    const fileExt = '.' + file.name.split('.').pop().toLowerCase();
    if (!ALLOWED_EXTS.includes(fileExt)) {
      showAlert({
        title: 'Unsupported File Format',
        message: 'Supported formats are PDF (.pdf) and images (.png, .jpg, .jpeg, .webp, .bmp, .tiff).',
        type: 'warning',
      });
      return;
    }
    if (file.size > 30 * 1024 * 1024) {
      showAlert({
        title: 'File Too Large',
        message: 'The selected file exceeds the 30 MB size limit. Please choose a smaller file.',
        type: 'warning',
      });
      return;
    }

    setIsUploading(true);
    setUploadProgressText('Uploading document...');

    const formData = new FormData();
    formData.append('file', file);
    if (user?.email) {
      formData.append('user_email', user.email);
    }

    try {
      setUploadProgressText('Extracting vectors & indexing...');
      const response = await fetch(`${BACKEND_URL}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Upload failed');
      }

      const data = await response.json();
      setActiveDoc(data);
      setMessages([]);
      setIsMobileSidebarOpen(false);
    } catch (err) {
      showAlert({
        title: 'Upload Error',
        message: `Upload error: ${err.message}`,
        type: 'danger',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveDoc = () => {
    showConfirm({
      title: 'Remove Document',
      message: 'Remove the current document and start a new session?',
      confirmText: 'Remove',
      cancelText: 'Cancel',
      type: 'danger',
      onConfirm: () => {
        setActiveDoc(null);
        setMessages([]);
      },
    });
  };

  const handleSendMessage = async (userText) => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    if (!activeDoc || !userText.trim()) return;

    const userMsg = { role: 'user', content: userText };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const historyPayload = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch(`${BACKEND_URL}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doc_id: activeDoc.doc_id,
          question: userText,
          history: historyPayload,
          similarity_threshold: 0.35,
          user_email: user?.email || undefined,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Query failed');
      }

      const data = await res.json();
      const botMsg = {
        role: 'assistant',
        content: data.answer,
        sources: data.sources || [],
        grounded: data.grounded,
        provider: data.provider,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Error: ${err.message || 'Unable to process query.'}`,
          sources: [],
          grounded: false,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    showConfirm({
      title: 'Clear Conversation',
      message: 'Clear the current conversation? The indexed document will stay loaded.',
      confirmText: 'Clear Messages',
      cancelText: 'Cancel',
      type: 'warning',
      onConfirm: () => {
        setMessages([]);
      },
    });
  };

  const triggerUpload = () => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    globalFileInputRef.current?.click();
  };

  const handleMainDragOver = (e) => {
    e.preventDefault();
    if (!isUploading) {
      setIsDragOverMain(true);
    }
  };

  const handleMainDragLeave = (e) => {
    // Only deactivate if leaving the main container
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setIsDragOverMain(false);
  };

  const handleMainDrop = (e) => {
    e.preventDefault();
    setIsDragOverMain(false);
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUploadFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="relative h-screen w-screen flex flex-col bg-zinc-100/60 dark:bg-[#070709] text-zinc-800 dark:text-zinc-100 font-sans antialiased overflow-hidden transition-colors duration-300">
      {/* Aurora Ambient Glass Background Orbs */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden select-none">
        {/* Dark Mode Aurora Mesh */}
        <div className="hidden dark:block">
          <div className="absolute -top-[18%] -left-[10%] w-[58vw] h-[58vw] rounded-full bg-gradient-to-tr from-indigo-950/70 via-purple-950/50 to-transparent blur-[140px] aurora-blob-1" />
          <div className="absolute top-[30%] -right-[15%] w-[52vw] h-[52vw] rounded-full bg-gradient-to-bl from-blue-950/60 via-slate-900/50 to-transparent blur-[150px] aurora-blob-2" />
          <div className="absolute -bottom-[20%] left-[20%] w-[62vw] h-[62vw] rounded-full bg-gradient-to-t from-violet-950/50 via-indigo-950/35 to-transparent blur-[160px] aurora-blob-3" />
        </div>

        {/* Light Mode Aurora Mesh */}
        <div className="dark:hidden block">
          <div className="absolute -top-[18%] -left-[10%] w-[58vw] h-[58vw] rounded-full bg-gradient-to-tr from-blue-100/80 via-indigo-100/60 to-transparent blur-[130px] aurora-blob-1" />
          <div className="absolute top-[30%] -right-[15%] w-[52vw] h-[52vw] rounded-full bg-gradient-to-bl from-indigo-100/70 via-purple-50/60 to-transparent blur-[140px] aurora-blob-2" />
          <div className="absolute -bottom-[20%] left-[20%] w-[62vw] h-[62vw] rounded-full bg-gradient-to-t from-sky-100/70 via-slate-100/60 to-transparent blur-[150px] aurora-blob-3" />
        </div>
      </div>

      {/* Hidden global file input triggered by central button or paperclip */}
      <input
        type="file"
        ref={globalFileInputRef}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleUploadFile(e.target.files[0]);
            e.target.value = '';
          }
        }}
        accept=".pdf,application/pdf,image/png,image/jpeg,image/webp,image/jpg"
        className="hidden"
      />

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Left Sidebar (320px) */}
        <Sidebar
          isOpen={isSidebarOpen}
          onToggleSidebar={handleToggleSidebar}
          chats={chats}
          activeChatId={currentChatId}
          onNewChat={handleNewChat}
          onNewTemporaryChat={handleNewTemporaryChat}
          onSelectChat={handleSelectChat}
          onDeleteChat={handleDeleteChat}
          activeDoc={activeDoc}
          isUploading={isUploading}
          uploadProgressText={uploadProgressText}
          onUploadFile={handleUploadFile}
          onRemoveDoc={handleRemoveDoc}
          serverStatus={serverStatus}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          user={user}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          onLogout={handleLogout}
          isTemporaryChat={isTemporaryChat}
          onToggleTemporaryChat={handleToggleTemporaryChat}
        />

        {/* Right Main Panel */}
        <main
          onDragOver={handleMainDragOver}
          onDragLeave={handleMainDragLeave}
          onDrop={handleMainDrop}
          className="flex-1 flex flex-col bg-transparent min-w-0 h-full overflow-hidden relative"
        >
          {/* Drag & Drop Full-screen Overlay */}
          {isDragOverMain && (
            <div className="absolute inset-0 z-40 bg-zinc-900/10 dark:bg-white/5 backdrop-blur-xs border-2 border-dashed border-zinc-400 dark:border-zinc-700 flex flex-col items-center justify-center p-6 pointer-events-none animate-in fade-in duration-150">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-zinc-900 to-zinc-700 dark:from-zinc-100 dark:to-zinc-300 text-white dark:text-zinc-950 flex items-center justify-center shadow-lg shadow-black/25 mb-3 animate-bounce">
                <UploadCloud className="w-8 h-8" />
              </div>
              <p className="text-base font-bold text-zinc-900 dark:text-white">
                Drop your PDF here
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Release to upload and begin analyzing
              </p>
            </div>
          )}

          <TopBar
            isSidebarOpen={isSidebarOpen}
            onToggleSidebar={handleToggleSidebar}
            activeDoc={activeDoc}
            chatTitle={activeDoc ? activeDoc.filename : activeChat?.title || 'New Chat'}
            onNewChat={handleNewChat}
            onNewTemporaryChat={handleNewTemporaryChat}
            onClearChat={handleClearChat}
            isDarkMode={isDarkMode}
            onToggleTheme={() => setIsDarkMode(!isDarkMode)}
            onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            user={user}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
            onLogout={handleLogout}
            isTemporaryChat={isTemporaryChat}
            onToggleTemporaryChat={handleToggleTemporaryChat}
          />

          {/* Temporary Chat Notice Banner */}
          {isTemporaryChat && (
            <div className="bg-amber-50/95 dark:bg-amber-950/60 px-4 py-2 flex items-center justify-between text-xs text-amber-800 dark:text-amber-300 transition-all shadow-xs shrink-0 border-b border-amber-200/50 dark:border-amber-800/30">
              <div className="flex items-center gap-2 min-w-0">
                <MessageCircleDashed className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="truncate">
                  <strong>Temporary Chat:</strong> Not saved to device. All messages disappear when you close this tab.
                </span>
              </div>
              <button
                onClick={handleToggleTemporaryChat}
                title="Convert this chat into a persistent chat saved in your history"
                className="text-amber-800 dark:text-amber-200 font-semibold underline hover:text-amber-950 dark:hover:text-white ml-3 shrink-0 cursor-pointer"
              >
                Keep in History
              </button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            <MessageList
              activeDoc={activeDoc}
              messages={messages}
              isLoading={isLoading}
              onSelectPrompt={handleSendMessage}
              user={user}
              onOpenAuthModal={() => setIsAuthModalOpen(true)}
              onTriggerUpload={triggerUpload}
              isTemporaryChat={isTemporaryChat}
              onToggleTemporaryChat={handleToggleTemporaryChat}
            />
          </div>

          <InputFooter
            activeDoc={activeDoc}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            user={user}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
            isTemporaryChat={isTemporaryChat}
          />
        </main>
      </div>

      {/* Authentication Modal - Mandatory when no active session */}
      <AuthModal
        isOpen={isAuthModalOpen || !user}
        onClose={() => {
          if (user) {
            setIsAuthModalOpen(false);
          }
        }}
        onLoginSuccess={handleLoginSuccess}
        isMandatory={!user}
      />

      {/* In-page Confirmation & Alert Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        type={confirmModal.type}
        onConfirm={confirmModal.onConfirm}
        onCancel={confirmModal.onCancel}
      />
    </div>
  );
}

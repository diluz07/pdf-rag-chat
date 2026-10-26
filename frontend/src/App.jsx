import React, { useState, useEffect, useRef } from 'react';
import { UploadCloud } from 'lucide-react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import MessageList from './components/MessageList';
import InputFooter from './components/InputFooter';
import AuthModal from './components/AuthModal';

import { BACKEND_URL } from './config';

export default function App() {
  const [activeDoc, setActiveDoc] = useState(null);
  const [messages, setMessages] = useState([]);
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
  }); // Default to user preference / dark mode
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

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    localStorage.setItem('documind_user', JSON.stringify(userData));
    setIsAuthModalOpen(false);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('documind_user');
    setActiveDoc(null);
    setMessages([]);
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

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      alert('Only .pdf files are supported.');
      return;
    }
    if (file.size > 30 * 1024 * 1024) {
      alert('File exceeds 30 MB limit.');
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
      alert(`Upload error: ${err.message}\n(Backend endpoint: ${BACKEND_URL}/upload)`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveDoc = () => {
    if (confirm('Remove current document and start a new session?')) {
      setActiveDoc(null);
      setMessages([]);
    }
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
    if (confirm('Clear current conversation?')) {
      setMessages([]);
    }
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
    <div className="h-screen w-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans antialiased overflow-hidden transition-colors duration-200">
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
        accept=".pdf,application/pdf"
        className="hidden"
      />

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Left Sidebar (320px) */}
        <Sidebar
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
        />

        {/* Right Main Panel */}
        <main
          onDragOver={handleMainDragOver}
          onDragLeave={handleMainDragLeave}
          onDrop={handleMainDrop}
          className="flex-1 flex flex-col bg-slate-50/50 dark:bg-slate-950/60 min-w-0 h-full overflow-hidden relative"
        >
          {/* Drag & Drop Full-screen Overlay */}
          {isDragOverMain && (
            <div className="absolute inset-0 z-40 bg-sky-600/10 dark:bg-sky-500/15 backdrop-blur-xs border-2 border-dashed border-sky-500 flex flex-col items-center justify-center p-6 pointer-events-none animate-in fade-in duration-150">
              <div className="w-16 h-16 rounded-2xl bg-sky-500 text-white flex items-center justify-center shadow-lg shadow-sky-500/30 mb-3 animate-bounce">
                <UploadCloud className="w-8 h-8" />
              </div>
              <p className="text-base font-bold text-slate-900 dark:text-white">
                Drop your PDF here
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Release to upload and begin analyzing
              </p>
            </div>
          )}

          <TopBar
            activeDoc={activeDoc}
            onClearChat={handleClearChat}
            isDarkMode={isDarkMode}
            onToggleTheme={() => setIsDarkMode(!isDarkMode)}
            onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            user={user}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
            onLogout={handleLogout}
          />

          <div className="flex-1 overflow-y-auto">
            <MessageList
              activeDoc={activeDoc}
              messages={messages}
              isLoading={isLoading}
              onSelectPrompt={handleSendMessage}
              user={user}
              onOpenAuthModal={() => setIsAuthModalOpen(true)}
              onTriggerUpload={triggerUpload}
            />
          </div>

          <InputFooter
            activeDoc={activeDoc}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            user={user}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
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
    </div>
  );
}

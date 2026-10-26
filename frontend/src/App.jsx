import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import MessageList from './components/MessageList';
import InputFooter from './components/InputFooter';
import AuthModal from './components/AuthModal';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export default function App() {
  const [activeDoc, setActiveDoc] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');
  const [serverStatus, setServerStatus] = useState('checking');
  const [isDarkMode, setIsDarkMode] = useState(true); // Default to sleek dark mode
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('documind_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    localStorage.setItem('documind_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('documind_user');
  };

  // Sync dark mode class on <html>
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
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
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      alert('Only .pdf files are supported.');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      alert('File exceeds 15 MB limit.');
      return;
    }

    setIsUploading(true);
    setUploadProgressText('Uploading document...');

    const formData = new FormData();
    formData.append('file', file);

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
      alert(`Upload error: ${err.message}`);
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

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans antialiased overflow-hidden transition-colors duration-200">
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
        />

        {/* Right Main Panel */}
        <main className="flex-1 flex flex-col bg-slate-50/50 dark:bg-slate-950/60 min-w-0 h-full overflow-hidden relative">
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
            />
          </div>

          <InputFooter
            activeDoc={activeDoc}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
          />
        </main>
      </div>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
}

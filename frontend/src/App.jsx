import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import UploadArea from './components/UploadArea';
import ChatArea from './components/ChatArea';
import InputBar from './components/InputBar';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export default function App() {
  const [activeDoc, setActiveDoc] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [serverStatus, setServerStatus] = useState('checking');
  const [isBooting, setIsBooting] = useState(false);
  const [threshold, setThreshold] = useState(0.35);

  // Check backend server health on mount & interval
  useEffect(() => {
    let bootingTimeout;

    const checkHealth = async () => {
      try {
        bootingTimeout = setTimeout(() => {
          setIsBooting(true);
        }, 3000);

        const res = await fetch(`${BACKEND_URL}/health`);
        if (res.ok) {
          clearTimeout(bootingTimeout);
          setServerStatus('online');
          setIsBooting(false);
        } else {
          setServerStatus('offline');
        }
      } catch (err) {
        setServerStatus('offline');
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => {
      clearInterval(interval);
      clearTimeout(bootingTimeout);
    };
  }, []);

  const handleUploadSuccess = (docData) => {
    setActiveDoc(docData);
    setMessages([]);
  };

  const handleResetDocument = () => {
    if (confirm('Upload a new document? Current conversation will be reset.')) {
      setActiveDoc(null);
      setMessages([]);
    }
  };

  const handleSendMessage = async (userText) => {
    if (!activeDoc || !userText.trim()) return;

    // Add user message to UI immediately
    const userMsg = { role: 'user', content: userText };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      // Build history for follow-up questions
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
          similarity_threshold: threshold,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || `Query failed with status ${res.status}`);
      }

      const data = await res.json();

      const botMsg = {
        role: 'assistant',
        content: data.answer,
        sources: data.sources || [],
        grounded: data.grounded,
        provider: data.provider,
        gated: data.gated,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      const errorMsg = {
        role: 'assistant',
        content: `Error: ${err.message || 'Failed to generate response. Please check your connection or re-upload your document.'}`,
        sources: [],
        grounded: false,
        provider: 'error',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    if (confirm('Clear conversation history?')) {
      setMessages([]);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-white">
      {/* Top Header */}
      <Header
        serverStatus={serverStatus}
        activeDoc={activeDoc}
        onResetDocument={handleResetDocument}
        isBooting={isBooting}
      />

      {/* Main Body */}
      <main className="flex-1 flex flex-col items-center justify-between overflow-hidden relative">
        {/* Ambient Lighting Gradients */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute bottom-10 left-1/3 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none -z-10" />

        {!activeDoc ? (
          <div className="flex-1 flex items-center justify-center w-full">
            <UploadArea
              onUploadSuccess={handleUploadSuccess}
              backendUrl={BACKEND_URL}
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col w-full h-full overflow-hidden">
            <ChatArea
              messages={messages}
              isLoading={isLoading}
              activeDoc={activeDoc}
              onSelectPrompt={(prompt) => handleSendMessage(prompt)}
            />

            <InputBar
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
              disabled={!activeDoc}
              onClearChat={handleClearChat}
              threshold={threshold}
              setThreshold={setThreshold}
            />
          </div>
        )}
      </main>
    </div>
  );
}

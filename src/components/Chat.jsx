import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import ChatMessage from './chat/ChatMessage';
import ChatInput from './chat/ChatInput';
import { 
  sendMessage, 
  uploadResumeForChat, 
  getResumesForChat, 
  deleteResumeForChat 
} from '../services/api';
import Navigation from './common/Navigation';
import { Upload, FileText, Trash2, AlertCircle, ChevronDown, Plus, MessageSquare, Menu, X } from 'lucide-react';

const MAX_MESSAGES_PER_CHAT = 20;

export default function Chat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [resumes, setResumes] = useState([]);
  const [selectedResumeId, setSelectedResumeId] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [chatSessions, setChatSessions] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Load resumes and chat sessions on component mount
  useEffect(() => {
    if (user) {
      loadResumes();
      loadChatSessions();
    }
  }, [user]);

  // Load chat history when current chat changes
  useEffect(() => {
    if (user && currentChatId) {
      loadChatHistory();
    }
  }, [user, currentChatId]);

  // Save chat history to localStorage whenever messages change
  useEffect(() => {
    if (user && currentChatId && messages.length > 0) {
      saveChatHistory();
      updateChatSession();
    }
  }, [messages, user, currentChatId]);

  const loadResumes = async () => {
    try {
      const { resumes: resumeList } = await getResumesForChat();
      setResumes(resumeList);
      
      // Select previously selected resume or first available
      const savedSelectedId = localStorage.getItem(`chat_selected_resume_${user.id}`);
      if (savedSelectedId && resumeList.find(r => r.id === savedSelectedId)) {
        setSelectedResumeId(savedSelectedId);
      } else if (resumeList.length > 0) {
        setSelectedResumeId(resumeList[0].id);
      } else {
        setSelectedResumeId(null);
      }
    } catch (error) {
      console.error('Error loading resumes:', error);
    }
  };

  const loadChatSessions = () => {
    if (user) {
      const savedSessions = localStorage.getItem(`chat_sessions_${user.id}`);
      if (savedSessions) {
        try {
          const parsedSessions = JSON.parse(savedSessions);
          setChatSessions(parsedSessions);
          
          // Load the most recent chat if no current chat is selected
          if (!currentChatId && parsedSessions.length > 0) {
            setCurrentChatId(parsedSessions[0].id);
            setSelectedResumeId(parsedSessions[0].resumeId);
          }
        } catch (error) {
          console.error('Error loading chat sessions:', error);
        }
      }
    }
  };

  const loadChatHistory = () => {
    if (user && currentChatId) {
      const savedHistory = localStorage.getItem(`chat_history_${user.id}_${currentChatId}`);
      if (savedHistory) {
        try {
          const parsedHistory = JSON.parse(savedHistory);
          setMessages(parsedHistory);
        } catch (error) {
          console.error('Error loading chat history:', error);
          setMessages([]);
        }
      } else {
        setMessages([]);
      }
    }
  };

  const saveChatHistory = () => {
    if (user && currentChatId && messages.length > 0) {
      localStorage.setItem(`chat_history_${user.id}_${currentChatId}`, JSON.stringify(messages));
    }
  };

  const updateChatSession = () => {
    if (user && currentChatId && messages.length > 0) {
      const updatedSessions = chatSessions.map(session => {
        if (session.id === currentChatId) {
          const lastMessage = messages[messages.length - 1];
          return {
            ...session,
            lastMessage: lastMessage.text.substring(0, 50) + (lastMessage.text.length > 50 ? '...' : ''),
            messageCount: messages.length,
            updatedAt: new Date().toISOString()
          };
        }
        return session;
      });
      setChatSessions(updatedSessions);
      localStorage.setItem(`chat_sessions_${user.id}`, JSON.stringify(updatedSessions));
    }
  };

  const createNewChat = () => {
    if (!selectedResumeId) {
      alert('Please select a resume first');
      return;
    }

    const newChatId = `chat_${Date.now()}`;
    const selectedResume = resumes.find(r => r.id === selectedResumeId);
    
    const newSession = {
      id: newChatId,
      resumeId: selectedResumeId,
      resumeName: selectedResume?.fileName || 'Unknown Resume',
      title: `Chat with ${selectedResume?.fileName || 'Resume'}`,
      lastMessage: '',
      messageCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updatedSessions = [newSession, ...chatSessions];
    setChatSessions(updatedSessions);
    localStorage.setItem(`chat_sessions_${user.id}`, JSON.stringify(updatedSessions));
    
    setCurrentChatId(newChatId);
    setMessages([{
      text: "Hello! How can I help you?",
      isBot: true,
      isSystem: true
    }]);
  };

  const switchToChat = (chatId) => {
    const session = chatSessions.find(s => s.id === chatId);
    if (session) {
      setCurrentChatId(chatId);
      setSelectedResumeId(session.resumeId);
      setSidebarOpen(false);
    }
  };

  const deleteChat = (chatId) => {
    if (!window.confirm("Delete this chat?")) return;
    
    const updatedSessions = chatSessions.filter(s => s.id !== chatId);
    setChatSessions(updatedSessions);
    localStorage.setItem(`chat_sessions_${user.id}`, JSON.stringify(updatedSessions));
    localStorage.removeItem(`chat_history_${user.id}_${chatId}`);
    
    if (currentChatId === chatId) {
      if (updatedSessions.length > 0) {
        setCurrentChatId(updatedSessions[0].id);
        setSelectedResumeId(updatedSessions[0].resumeId);
      } else {
        setCurrentChatId(null);
        setMessages([]);
      }
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setUploadError('Please upload a PDF file only.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File size must be less than 10MB.');
      return;
    }

    if (resumes.length >= 3) {
      setUploadError('Maximum 3 resumes allowed. Please delete an existing resume first.');
      return;
    }

    setIsUploading(true);
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('resume', file);

      const result = await uploadResumeForChat(formData);
      
      // Reload resumes list
      await loadResumes();
      
      // Select the newly uploaded resume and create a new chat
      if (result.resume) {
        setSelectedResumeId(result.resume.id);
        // Create new chat with the uploaded resume
        const newChatId = `chat_${Date.now()}`;
        const newSession = {
          id: newChatId,
          resumeId: result.resume.id,
          resumeName: result.resume.fileName,
          title: `Chat with ${result.resume.fileName}`,
          lastMessage: '',
          messageCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        const updatedSessions = [newSession, ...chatSessions];
        setChatSessions(updatedSessions);
        localStorage.setItem(`chat_sessions_${user.id}`, JSON.stringify(updatedSessions));
        
        setCurrentChatId(newChatId);
        setMessages([{
          text: "Hello! How can I help you?",
          isBot: true,
          isSystem: true
        }]);
      }
    } catch (error) {
      console.error('Error uploading resume:', error);
      setUploadError(error.response?.data?.error || 'Failed to upload resume. Please try again.');
    } finally {
      setIsUploading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const handleDeleteResume = async (resumeId) => {
    const resumeToDelete = resumes.find(r => r.id === resumeId);
    if (!resumeToDelete) return;

    if (!window.confirm(`Do you want to delete "${resumeToDelete.fileName}"?`)) {
      return;
    }

    try {
      await deleteResumeForChat(resumeId);
      
      // Remove from local state
      const updatedResumes = resumes.filter(r => r.id !== resumeId);
      setResumes(updatedResumes);
      
      // Remove all chat sessions related to this resume
      const updatedSessions = chatSessions.filter(s => s.resumeId !== resumeId);
      setChatSessions(updatedSessions);
      localStorage.setItem(`chat_sessions_${user.id}`, JSON.stringify(updatedSessions));
      
      // Clear chat histories for deleted resume
      chatSessions.forEach(session => {
        if (session.resumeId === resumeId) {
          localStorage.removeItem(`chat_history_${user.id}_${session.id}`);
        }
      });
      
      // If current chat was using deleted resume, switch to another or clear
      const currentSession = chatSessions.find(s => s.id === currentChatId);
      if (currentSession && currentSession.resumeId === resumeId) {
        if (updatedSessions.length > 0) {
          setCurrentChatId(updatedSessions[0].id);
          setSelectedResumeId(updatedSessions[0].resumeId);
        } else {
          setCurrentChatId(null);
          setSelectedResumeId(updatedResumes.length > 0 ? updatedResumes[0].id : null);
          setMessages([]);
        }
      }
      
    } catch (error) {
      console.error('Error deleting resume:', error);
      alert(`Failed to delete resume "${resumeToDelete.fileName}". Please try again.`);
    }
  };

  const handleSendMessage = async (message) => {
    if (!selectedResumeId) {
      setMessages(prev => [
        ...prev,
        { text: message, isBot: false },
        { 
          text: 'Please upload and select a resume first to start chatting about it.',
          isBot: true,
          isSystem: true
        }
      ]);
      return;
    }

    // Check message limit
    if (messages.length >= MAX_MESSAGES_PER_CHAT) {
      if (window.confirm(`You've reached the limit of ${MAX_MESSAGES_PER_CHAT} messages per chat. Would you like to start a new chat?`)) {
        createNewChat();
      }
      return;
    }

    try {
      setIsLoading(true);
      setMessages(prev => [...prev, { text: message, isBot: false }]);
      
      // Get recent conversation context (last 10 messages)
      const recentMessages = messages.slice(-10).map(msg => ({
        role: msg.isBot ? 'assistant' : 'user',
        content: msg.text
      }));
      
      const response = await sendMessage(message, recentMessages, selectedResumeId);
      setMessages(prev => [...prev, { 
        text: response.answer, 
        isBot: true,
        relevantChunks: response.relevantChunks,
        confidence: response.confidence
      }]);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = error.response?.data?.error || 'Sorry, something went wrong. Please try again.';
      setMessages(prev => [
        ...prev,
        { 
          text: errorMessage,
          isBot: true,
          isError: true
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  const messageVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: "easeOut"
      }
    }
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white relative">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-40 w-64 bg-gray-800 p-4 border-r border-gray-700 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 lg:w-1/4 transition-transform duration-300 ease-in-out`}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-white/20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Chat History</h2>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden p-1 hover:bg-white/10 rounded absolute top-4 right-4"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Resume Selection Dropdown */}
            {resumes.length > 0 && (
              <div className="mb-3">
                <select
                  value={selectedResumeId || ''}
                  onChange={(e) => setSelectedResumeId(e.target.value)}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-sm text-white"
                >
                  <option value="">Select Resume</option>
                  {resumes.map((resume, index) => (
                    <option key={resume.id} value={resume.id}>
                      Resume {index + 1}: {resume.fileName.length > 20 ? resume.fileName.substring(0, 20) + '...' : resume.fileName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* New Chat Button */}
            <button
              onClick={createNewChat}
              disabled={!selectedResumeId}
              className="w-full flex items-center justify-center space-x-2 p-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded text-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>New Chat</span>
            </button>
          </div>

          {/* Chat Sessions List */}
          <div className="flex-1 overflow-y-auto p-2">
            {chatSessions.map((session) => (
              <div
                key={session.id}
                className={`p-3 mb-2 rounded-lg cursor-pointer transition-colors ${
                  currentChatId === session.id 
                    ? 'bg-blue-500/20 border border-blue-500/40' 
                    : 'bg-white/5 hover:bg-white/10'
                }`}
                onClick={() => switchToChat(session.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{session.title}</p>
                    <p className="text-xs text-gray-400 truncate">{session.lastMessage || 'No messages yet'}</p>
                  </div>
                  <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteChat(session.id);
                      }}
                      className="p-1 hover:bg-white/10 rounded"
                    >
                      <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Resume Management */}
            <div className="p-4 border-t border-white/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Resumes ({resumes.length}/3)</span>
                {resumes.length < 3 && (
                  <label className="flex items-center space-x-1 px-2 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-xs cursor-pointer transition-colors">
                    <Upload className="w-3 h-3" />
                    <span>{isUploading ? 'Uploading...' : 'Add'}</span>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
              {resumes.map((resume, index) => (
                <div key={resume.id} className="flex items-center justify-between p-2 bg-white/5 rounded mb-1">
                  <span className="text-xs text-gray-300 truncate flex-1">
                    {index + 1}. {resume.fileName.length > 20 ? resume.fileName.substring(0, 20) + '...' : resume.fileName}
                  </span>
                  <button
                    onClick={() => handleDeleteResume(resume.id)}
                    className="p-1 hover:bg-red-500/20 text-red-400 rounded ml-2"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {uploadError && (
                <div className="mt-2 text-red-400 text-xs">
                  {uploadError}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Chat Area */}
      <div className="flex-1 flex flex-col pt-16 sm:pt-20 lg:ml-1/4">
        {/* Navigation Bar */}
        <Navigation />
        
        {/* Mobile Sidebar Toggle */}
        <div className="lg:hidden p-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex items-center space-x-2 p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
          >
            <Menu className="w-5 h-5" />
            <span>Chat History</span>
          </button>
        </div>
        
        <div className="flex-1 flex flex-col px-4">
          <motion.div 
            className="w-full max-w-4xl mx-auto flex flex-col bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-white/20 h-[calc(100vh-8rem)]"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/20 bg-white/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <h1 className="text-xl font-bold text-white">RAG Resume Chat</h1>
                  {currentChatId && (
                    <div className="text-sm text-gray-400">
                      {messages.length}/{MAX_MESSAGES_PER_CHAT} messages
                    </div>
                  )}
                </div>
                {selectedResumeId && (
                  <div className="text-sm text-green-400">
                    {resumes.find(r => r.id === selectedResumeId)?.fileName.substring(0, 20)}
                    {resumes.find(r => r.id === selectedResumeId)?.fileName.length > 20 ? '...' : ''}
                  </div>
                )}
              </div>
            </div>

            {/* No Resume State */}
            {resumes.length === 0 && (
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center">
                  <AlertCircle className="w-16 h-16 text-blue-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">Upload Your First Resume</h3>
                  <p className="text-gray-300 mb-6">
                    Upload your resume (PDF) to start an intelligent conversation. You can upload up to 3 resumes.
                  </p>
                  <label className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg cursor-pointer transition-colors">
                    <Upload className="w-5 h-5" />
                    <span>{isUploading ? 'Uploading...' : 'Choose PDF'}</span>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                      className="hidden"
                    />
                  </label>
                  {isUploading && (
                    <div className="flex items-center justify-center space-x-2 text-blue-400 mt-4">
                      <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-sm">Processing...</span>
                    </div>
                  )}
                  {uploadError && (
                    <div className="mt-4 text-red-400 text-sm">
                      {uploadError}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* No Chat Selected State */}
            {resumes.length > 0 && !currentChatId && (
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center">
                  <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">Start a New Chat</h3>
                  <p className="text-gray-300 mb-6">
                    Select a resume and create a new chat to get started.
                  </p>
                </div>
              </div>
            )}

            {/* Messages container */}
            {currentChatId && (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((message, index) => (
                    <motion.div
                      key={index}
                      variants={messageVariants}
                      initial="hidden"
                      animate="visible"
                    >
                      <ChatMessage
                        message={message.text}
                        isBot={message.isBot}
                      />
                    </motion.div>
                  ))}
                  {isLoading && (
                    <div className="flex items-center space-x-2">
                        <div className="w-10 h-10 rounded-full bg-gray-700/50 flex-shrink-0"></div>
                        <div className="p-3 bg-gray-700/50 rounded-lg">
                            <div className="flex space-x-1">
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-75"></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-150"></div>
                            </div>
                        </div>
                    </div>
                  )}
                </div>

                {/* Input area */}
                <div className="p-4 border-t border-white/20">
                  <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
                </div>
              </>
            )}
          </motion.div>
        </div>
      </div>
      
      {/* Sidebar Overlay for Mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}

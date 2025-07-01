import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import ChatMessage from './chat/ChatMessage';
import ChatInput from './chat/ChatInput';
import { 
  sendMessage, 
  uploadResumeForChat, 
  getResumesForChat, 
  deleteResumeForChat,
  saveChatHistory,
  getChatHistory,
  getChatSessions,
  deleteChatHistory
} from '../services/api';
import Navigation from './common/Navigation';
import { Upload, FileText, Trash2, AlertCircle, ChevronDown, Plus, MessageSquare, Menu, X } from 'lucide-react';

const MAX_USER_MESSAGES_PER_CHAT = 10; // Only count user messages, not bot responses

export default function Chat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [resumes, setResumes] = useState([]);
  const [selectedResumeId, setSelectedResumeId] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingResumes, setIsLoadingResumes] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [resumeLoadError, setResumeLoadError] = useState(null);
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
  
  // Reload chat sessions when user changes
  useEffect(() => {
    if (user) {
      loadChatSessions();
    }
  }, [user?.id]);

  // Load chat history when current chat changes
  useEffect(() => {
    if (user && currentChatId) {
      loadChatHistory();
    }
  }, [user, currentChatId]);

  // Save chat history to database whenever messages change
  useEffect(() => {
    if (user && currentChatId && messages.length > 0) {
      // Use a debounce to avoid too many saves
      const saveTimeout = setTimeout(() => {
        saveChatHistoryToDatabase();
        updateChatSession();
      }, 1000);
      
      return () => clearTimeout(saveTimeout);
    }
  }, [messages, user, currentChatId, selectedResumeId]);

  const loadResumes = async () => {
    setResumeLoadError(null); // Clear any previous errors
    setIsLoadingResumes(true);
    
    try {
      // Check if user is authenticated
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        setResumeLoadError('Authentication required. Please log in to access your resumes.');
        return;
      }
      //ignore
      // getResumesForChat now has built-in retry logic
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
      
      // Store resumes in localStorage as a fallback
      if (resumeList && resumeList.length > 0) {
        localStorage.setItem(`resumes_backup_${user.id}`, JSON.stringify(resumeList));
      }
    } catch (error) {
      console.error('Error loading resumes:', error);
      
      // Handle authentication errors specifically
      if (error.response && error.response.status === 401) {
        setResumeLoadError('Authentication required. Please log in again to continue.');
        return;
      }
      
      setResumeLoadError('Unable to load resumes. Please check your connection and try again.');
      
      // Try to load from localStorage backup if available
      const backupResumes = localStorage.getItem(`resumes_backup_${user.id}`);
      if (backupResumes) {
        try {
          const parsedResumes = JSON.parse(backupResumes);
          console.log('Loaded resumes from localStorage backup:', parsedResumes.length);
          setResumes(parsedResumes);
          
          // Select previously selected resume or first available from backup
          const savedSelectedId = localStorage.getItem(`chat_selected_resume_${user.id}`);
          if (savedSelectedId && parsedResumes.find(r => r.id === savedSelectedId)) {
            setSelectedResumeId(savedSelectedId);
          } else if (parsedResumes.length > 0) {
            setSelectedResumeId(parsedResumes[0].id);
          }
        } catch (parseError) {
          console.error('Error parsing backup resumes:', parseError);
        }
      }
    } finally {
      setIsLoadingResumes(false);
    }
  };

  const loadChatSessions = async () => {
    if (user) {
      try {
        const sessions = await getChatSessions();
        setChatSessions(sessions);
        
        // Load the most recent chat if no current chat is selected
        if (!currentChatId && sessions.length > 0) {
          setCurrentChatId(sessions[0].id);
          setSelectedResumeId(sessions[0].resumeId);
        }
      } catch (error) {
        console.error('Error loading chat sessions:', error);
        // Fallback to localStorage for backward compatibility
        const savedSessions = localStorage.getItem(`chat_sessions_${user.id}`);
        if (savedSessions) {
          try {
            const parsedSessions = JSON.parse(savedSessions);
            setChatSessions(parsedSessions);
            
            if (!currentChatId && parsedSessions.length > 0) {
              setCurrentChatId(parsedSessions[0].id);
              setSelectedResumeId(parsedSessions[0].resumeId);
            }
          } catch (parseError) {
            console.error('Error parsing localStorage sessions:', parseError);
          }
        }
      }
    }
  };

  const loadChatHistory = async () => {
    if (user && currentChatId) {
      try {
        console.log('Loading chat history for chat ID:', currentChatId);
        const history = await getChatHistory(currentChatId);
        if (history && history.length > 0) {
          console.log('Chat history loaded from database:', history.length, 'messages');
          setMessages(history);
          
          // Find the chat session to get the resumeId
          const session = chatSessions.find(s => s.id === currentChatId);
          if (session && session.resumeId) {
            setSelectedResumeId(session.resumeId);
          }
        } else {
          console.log('No chat history found in database');
          setMessages([]);
          
          // Fallback to localStorage for backward compatibility
          const savedHistory = localStorage.getItem(`chat_history_${user.id}_${currentChatId}`);
          if (savedHistory) {
            try {
              const parsedHistory = JSON.parse(savedHistory);
              setMessages(parsedHistory);
            } catch (parseError) {
              console.error('Error parsing localStorage history:', parseError);
            }
          }
        }
      } catch (error) {
        console.error('Error loading chat history from database:', error);
        // Fallback to localStorage for backward compatibility
        const savedHistory = localStorage.getItem(`chat_history_${user.id}_${currentChatId}`);
        if (savedHistory) {
          try {
            const parsedHistory = JSON.parse(savedHistory);
            setMessages(parsedHistory);
          } catch (parseError) {
            console.error('Error parsing localStorage history:', parseError);
            setMessages([]);
          }
        } else {
          setMessages([]);
        }
      }
    } else {
      setMessages([]);
    }
  };

  const saveChatHistoryToDatabase = async () => {
    if (user && currentChatId && selectedResumeId && messages.length > 0) {
      try {
        console.log('Saving chat history to database for chat ID:', currentChatId);
        const currentSession = chatSessions.find(session => session.id === currentChatId);
        const chatName = currentSession ? currentSession.name : `Chat ${new Date().toLocaleDateString()}`;
        
        // Ensure the selected resume exists in the resumes array
        const resumeExists = resumes.some(resume => resume.id === selectedResumeId);
        if (!resumeExists && resumes.length > 0) {
          console.warn('Selected resume not found, using first available resume');
          setSelectedResumeId(resumes[0].id);
        }
        
        const finalResumeId = resumeExists ? selectedResumeId : (resumes.length > 0 ? resumes[0].id : selectedResumeId);
        
        await saveChatHistory({
          chatId: currentChatId,
          resumeId: finalResumeId,
          chatName: chatName,
          messages: messages.map(msg => ({
            text: msg.text,
            isBot: msg.isBot,
            timestamp: msg.timestamp || new Date()
          }))
        });
        console.log('Chat history saved to database successfully');
        
        // Update local storage as backup
        localStorage.setItem(`chat_history_${user.id}_${currentChatId}`, JSON.stringify(messages));
      } catch (error) {
        console.error('Error saving chat history to database:', error);
        // Fallback to localStorage
        localStorage.setItem(`chat_history_${user.id}_${currentChatId}`, JSON.stringify(messages));
      }
    } else {
      console.warn('Cannot save chat history: missing user, chatId, resumeId, or messages');
      if (user && currentChatId && messages.length > 0) {
        // Save to localStorage if we have at least user, chatId and messages
        localStorage.setItem(`chat_history_${user.id}_${currentChatId}`, JSON.stringify(messages));
      }
    }
  };

  const updateChatSession = async () => {
    if (user && currentChatId && messages.length > 0) {
      const updatedSessions = chatSessions.map(session => {
        if (session.id === currentChatId) {
          const lastMessage = messages[messages.length - 1];
          return {
            ...session,
            lastMessage: lastMessage.text.substring(0, 50) + (lastMessage.text.length > 50 ? '...' : ''),
            messageCount: messages.length,
            lastActivity: new Date(),
            updatedAt: new Date().toISOString()
          };
        }
        return session;
      });
      setChatSessions(updatedSessions);
      
      // Save to database
      await saveChatHistoryToDatabase();
      
      // Keep localStorage as backup
      localStorage.setItem(`chat_sessions_${user.id}`, JSON.stringify(updatedSessions));
    }
  };

  const createNewChat = () => {
    if (!selectedResumeId) {
      // Check if we have any resumes available
      if (resumes.length > 0) {
        setSelectedResumeId(resumes[0].id);
      } else {
        alert('Please upload a resume first');
        return;
      }
    }

    // Ensure the selected resume exists in the resumes array
    const resumeExists = resumes.some(resume => resume.id === selectedResumeId);
    const finalResumeId = resumeExists ? selectedResumeId : (resumes.length > 0 ? resumes[0].id : null);
    
    if (!finalResumeId) {
      alert('Please upload a resume first');
      return;
    }

    const newChatId = `chat_${Date.now()}`;
    const selectedResume = resumes.find(r => r.id === finalResumeId);
    
    const newSession = {
      id: newChatId,
      resumeId: finalResumeId,
      resumeName: selectedResume?.fileName || 'Unknown Resume',
      name: `Chat with ${selectedResume?.fileName || 'Resume'}`,
      lastMessage: '',
      messageCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastActivity: new Date()
    };

    const updatedSessions = [newSession, ...chatSessions];
    setChatSessions(updatedSessions);
    
    // Save to localStorage as backup
    localStorage.setItem(`chat_sessions_${user.id}`, JSON.stringify(updatedSessions));
    localStorage.setItem(`chat_selected_resume_${user.id}`, finalResumeId);
    
    setCurrentChatId(newChatId);
    setSelectedResumeId(finalResumeId);
    
    const initialMessage = {
      text: `Hello! I'm ready to help you with your resume: ${selectedResume?.fileName || 'Resume'}. What would you like to know?`,
      isBot: true,
      isSystem: true,
      timestamp: new Date()
    };
    
    setMessages([initialMessage]);
    
    // Save this initial chat to the database
    setTimeout(() => {
      saveChatHistoryToDatabase();
    }, 500);
  };

  const switchToChat = async (chatId) => {
    const session = chatSessions.find(s => s.id === chatId);
    if (session) {
      // Save current chat before switching
      if (currentChatId && messages.length > 0) {
        await saveChatHistoryToDatabase();
      }
      
      // Update selected resume ID
      const resumeExists = resumes.some(resume => resume.id === session.resumeId);
      if (resumeExists) {
        setSelectedResumeId(session.resumeId);
        localStorage.setItem(`chat_selected_resume_${user.id}`, session.resumeId);
      } else if (resumes.length > 0) {
        // If the resume doesn't exist anymore, use the first available one
        setSelectedResumeId(resumes[0].id);
        localStorage.setItem(`chat_selected_resume_${user.id}`, resumes[0].id);
      }
      
      // Switch to the new chat
      setCurrentChatId(chatId);
      setSidebarOpen(false);
      
      // Load chat history for the new chat
      try {
        const history = await getChatHistory(chatId);
        if (history && history.length > 0) {
          setMessages(history);
        } else {
          // If no history is found, initialize with a welcome message
          const selectedResume = resumes.find(r => resumeExists ? r.id === session.resumeId : r.id === resumes[0].id);
          setMessages([{
            text: `Hello! I'm ready to help you with your resume: ${selectedResume?.fileName || 'Resume'}. What would you like to know?`,
            isBot: true,
            isSystem: true,
            timestamp: new Date()
          }]);
        }
      } catch (error) {
        console.error('Error loading chat history when switching chats:', error);
        // Initialize with a welcome message if there's an error
        const selectedResume = resumes.find(r => resumeExists ? r.id === session.resumeId : r.id === resumes[0].id);
        setMessages([{
          text: `Hello! I'm ready to help you with your resume: ${selectedResume?.fileName || 'Resume'}. What would you like to know?`,
          isBot: true,
          isSystem: true,
          timestamp: new Date()
        }]);
      }
    }
  };

  const deleteChat = async (chatId) => {
    if (!window.confirm("Delete this chat?")) return;
    
    try {
      // Delete from database
      await deleteChatHistory(chatId);
      console.log('Chat deleted from database successfully');
    } catch (error) {
      console.error('Error deleting chat from database:', error);
    }
    
    // Update local state
    const updatedSessions = chatSessions.filter(s => s.id !== chatId);
    setChatSessions(updatedSessions);
    
    // Clean up localStorage as backup
    localStorage.setItem(`chat_sessions_${user.id}`, JSON.stringify(updatedSessions));
    localStorage.removeItem(`chat_history_${user.id}_${chatId}`);
    
    if (currentChatId === chatId) {
      if (updatedSessions.length > 0) {
        // Switch to the first available chat
        const nextChat = updatedSessions[0];
        setCurrentChatId(nextChat.id);
        
        // Ensure the resume exists
        const resumeExists = resumes.some(resume => resume.id === nextChat.resumeId);
        if (resumeExists) {
          setSelectedResumeId(nextChat.resumeId);
        } else if (resumes.length > 0) {
          // If the resume doesn't exist anymore, use the first available one
          setSelectedResumeId(resumes[0].id);
        }
        
        // Load the chat history for the next chat
        loadChatHistory();
      } else {
        // No more chats available
        setCurrentChatId(null);
        setMessages([]);
        
        // If there are resumes available, prompt to create a new chat
        if (resumes.length > 0) {
          setSelectedResumeId(resumes[0].id);
          setTimeout(() => {
            if (window.confirm('Would you like to start a new chat with your resume?')) {
              createNewChat();
            }
          }, 500);
        }
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
    
    // Clear previous errors
    setUploadError('');

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
        localStorage.setItem(`chat_selected_resume_${user.id}`, result.resume.id);
        
        // Create new chat with the uploaded resume
        const newChatId = `chat_${Date.now()}`;
        const newSession = {
          id: newChatId,
          resumeId: result.resume.id,
          resumeName: result.resume.fileName,
          name: `Chat with ${result.resume.fileName}`,
          lastMessage: '',
          messageCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastActivity: new Date()
        };

        const updatedSessions = [newSession, ...chatSessions];
        setChatSessions(updatedSessions);
        localStorage.setItem(`chat_sessions_${user.id}`, JSON.stringify(updatedSessions));
        
        setCurrentChatId(newChatId);
        
        const initialMessage = {
          text: `Hello! I'm ready to help you with your resume: ${result.resume.fileName}. What would you like to know?`,
          isBot: true,
          isSystem: true,
          timestamp: new Date()
        };
        
        setMessages([initialMessage]);
        
        // Save this initial chat to the database
        setTimeout(() => {
          saveChatHistoryToDatabase();
        }, 500);
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
    setDeleteError(''); // Clear any previous delete errors
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
          // Switch to another chat
          const nextChat = updatedSessions[0];
          setCurrentChatId(nextChat.id);
          setSelectedResumeId(nextChat.resumeId);
          localStorage.setItem(`chat_selected_resume_${user.id}`, nextChat.resumeId);
          
          // Load the chat history for the next chat
          setTimeout(() => {
            loadChatHistory();
          }, 100);
        } else if (updatedResumes.length > 0) {
          // No chats left, but we have resumes - create a new chat
          setCurrentChatId(null);
          setSelectedResumeId(updatedResumes[0].id);
          localStorage.setItem(`chat_selected_resume_${user.id}`, updatedResumes[0].id);
          setMessages([]);
          
          // Prompt to create a new chat
          setTimeout(() => {
            if (window.confirm('Would you like to start a new chat with your remaining resume?')) {
              createNewChat();
            }
          }, 500);
        } else {
          // No resumes left
          setCurrentChatId(null);
          setSelectedResumeId(null);
          localStorage.removeItem(`chat_selected_resume_${user.id}`);
          setMessages([]);
        }
      } else if (selectedResumeId === resumeId) {
        // If selected resume was deleted but not the current chat
        if (updatedResumes.length > 0) {
          setSelectedResumeId(updatedResumes[0].id);
          localStorage.setItem(`chat_selected_resume_${user.id}`, updatedResumes[0].id);
        } else {
          setSelectedResumeId(null);
          localStorage.removeItem(`chat_selected_resume_${user.id}`);
        }
      }
      
    } catch (error) {
      console.error('Error deleting resume:', error);
      setDeleteError(`Failed to delete resume "${resumeToDelete.fileName}". Please try again.`);
    } finally {
      await loadResumes(); // Ensure resumes are reloaded after delete attempt
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

    // Count only user messages for the limit check
    const userMessageCount = messages.filter(msg => !msg.isBot).length;
    
    // Check user message limit
    if (userMessageCount >= MAX_USER_MESSAGES_PER_CHAT) {
      if (window.confirm(`You've reached the limit of ${MAX_USER_MESSAGES_PER_CHAT} user messages per chat. Would you like to start a new chat?`)) {
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
      
      // Ensure the selected resume exists in the resumes array
      const resumeExists = resumes.some(resume => resume.id === selectedResumeId);
      if (!resumeExists) {
        throw new Error('Please upload your resume first');
      }
      
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
      <div className={`fixed inset-y-0 left-0 w-64 bg-gray-800 p-4 border-r border-gray-700 transform ${sidebarOpen ? 'translate-x-0 z-50' : '-translate-x-full z-40'} lg:relative lg:translate-x-0 lg:w-1/4 transition-transform duration-300 ease-in-out`}>
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
            <div className="mb-3">
              {isLoadingResumes ? (
                <div className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-sm text-white flex items-center justify-center">
                  <div className="animate-pulse">Loading resumes...</div>
                </div>
              ) : resumeLoadError ? (
                <div className="w-full p-2 bg-red-900/30 border border-red-600 rounded text-sm text-white">
                  <div className="flex items-center mb-1">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    <span>Error loading resumes</span>
                  </div>
                  <div className="text-xs opacity-80">{resumeLoadError}</div>
                  {resumeLoadError.includes('Authentication') ? (
                    <button 
                      onClick={() => window.location.href = '/login'} 
                      className="mt-1 text-xs bg-blue-500 hover:bg-blue-600 px-2 py-1 rounded w-full"
                    >
                      Log In
                    </button>
                  ) : (
                    <button 
                      onClick={loadResumes} 
                      className="mt-1 text-xs bg-white/10 hover:bg-white/20 px-2 py-1 rounded w-full"
                    >
                      Retry
                    </button>
                  )}
                </div>
              ) : resumes.length > 0 ? (
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
              ) : (
                <div className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-sm text-white text-center">
                  No resumes available
                </div>
              )}
            </div>

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
                <div className="mt-2 text-red-500 text-sm flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {uploadError}
                </div>
              )}

              {deleteError && (
                <div className="mt-2 text-red-500 text-sm flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {deleteError}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Chat Area */}
      <div className="flex-1 flex flex-col pt-16 sm:pt-20 lg:ml-1/4 relative">
        {/* Overlay for mobile when sidebar is open */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          ></div>
        )}
        {/* Navigation Bar */}
        <Navigation setSidebarOpen={setSidebarOpen} />
        
        {/* Mobile Sidebar Toggle */}
        {/* <div className="lg:hidden p-2">
          <button
              onClick={() => setSidebarOpen(true)}
              className="flex items-center space-x-1 p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
        </div> */}
        
        <div className="flex-1 flex flex-col px-2 sm:px-4 md:mt-8">
          <motion.div 
            className="w-[95vw] max-w-5xl mx-auto flex flex-col bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-white/20 h-[calc(100vh-5rem)] lg:h-[calc(100vh-8rem)]"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/20 bg-white/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <h1 className="text-xl font-bold text-white whitespace-nowrap">Chat with AI</h1>
                  {currentChatId && (
                    <div className="text-sm text-gray-400">
                      {messages.filter(msg => !msg.isBot).length}/{MAX_USER_MESSAGES_PER_CHAT}
                    </div>
                  )}
                </div>
                {selectedResumeId && (
                  <div className="text-xs text-green-400">
                    {resumes.find(r => r.id === selectedResumeId)?.fileName.substring(0, 20)}
                    {resumes.find(r => r.id === selectedResumeId)?.fileName.length > 20 ? '...' : ''}
                  </div>
                )}
              </div>
            </div>

            {/* No Resume State */}
            {isLoadingResumes ? (
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center">
                  <div className="w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <h3 className="text-xl font-semibold text-white mb-2">Loading Resumes</h3>
                  <p className="text-gray-300 mb-6">
                    Please wait while we load your resumes...
                  </p>
                </div>
              </div>
            ) : resumeLoadError ? (
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center">
                  <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">Error Loading Resumes</h3>
                  <p className="text-gray-300 mb-6">
                    {resumeLoadError}
                  </p>
                  {resumeLoadError.includes('Authentication') ? (
                    <button 
                      onClick={() => window.location.href = '/login'}
                      className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg cursor-pointer transition-colors"
                    >
                      <span>Log In</span>
                    </button>
                  ) : (
                    <button 
                      onClick={loadResumes}
                      className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg cursor-pointer transition-colors"
                    >
                      <span>Try Again</span>
                    </button>
                  )}
                </div>
              </div>
            ) : resumes.length === 0 && (
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
            {!isLoadingResumes && !resumeLoadError && resumes.length > 0 && !currentChatId && (
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
            {!isLoadingResumes && !resumeLoadError && currentChatId && (
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

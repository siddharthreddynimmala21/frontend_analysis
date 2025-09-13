import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
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
// Navigation removed for Chat page per new layout
import { Upload, FileText, Trash2, AlertCircle, ChevronDown, Plus, MessageSquare, Menu, X } from 'lucide-react';
import ConfirmationDialog from './common/ConfirmationDialog';

const MAX_USER_MESSAGES_PER_CHAT = 10; // Only count user messages, not bot responses
const MAX_ACTIVE_CHATS = 5; // Maximum number of active chats a user can have

// Custom Dropdown Component
function CustomDropdown({ value, onChange, disabled, options }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  const selectedOption = options.find(option => option.value === value) || options[0];
  
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        className={`w-full p-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900 flex items-center justify-between ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <span>{selectedOption.label}</span>
        <ChevronDown className={`h-4 w-4 text-gray-600 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-50 max-h-48 overflow-y-auto">
          {options.map((option) => (
            <div
              key={option.value}
              className={`p-2 hover:bg-gray-50 cursor-pointer ${option.value === value ? 'bg-gray-100' : ''}`}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Chat() {
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();
  const [messages, setMessages] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resumes, setResumes] = useState([]);
  const [selectedResumeId, setSelectedResumeId] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingResumes, setIsLoadingResumes] = useState(false);
  const [chatSessions, setChatSessions] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Dialog state for resume and chat deletion
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmDialogMessage, setConfirmDialogMessage] = useState('');
  const [confirmDialogAction, setConfirmDialogAction] = useState(() => () => {});
  const [showProfileInfo, setShowProfileInfo] = useState(false);
  // Logout confirmation
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

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

  // Cross-device synchronization using BroadcastChannel
  useEffect(() => {
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel('resume-updates');
      
      const handleBroadcastMessage = (event) => {
        const { type, data } = event.data;
        
        switch (type) {
          case 'RESUME_UPLOADED':
            console.log('Received resume upload broadcast:', data);
            // Immediately update local state and then refresh from server
            if (data.resume) {
              setResumes(prev => {
                const exists = prev.find(r => r.id === data.resume.id);
                if (!exists) {
                  return [...prev, data.resume];
                }
                return prev;
              });
            }
            // Also refresh from server to ensure consistency
            setTimeout(() => loadResumes(false), 500);
            break;
            
          case 'RESUME_DELETED':
            console.log('Received resume deletion broadcast:', data);
            // Immediately update local state
            if (data.resumeId) {
              setResumes(prev => prev.filter(r => r.id !== data.resumeId));
              // Handle state cleanup if deleted resume was selected
              if (selectedResumeId === data.resumeId) {
                const remainingResumes = resumes.filter(r => r.id !== data.resumeId);
                if (remainingResumes.length > 0) {
                  setSelectedResumeId(remainingResumes[0].id);
                  localStorage.setItem(`chat_selected_resume_${user.id}`, remainingResumes[0].id);
                } else {
                  setSelectedResumeId(null);
                  localStorage.removeItem(`chat_selected_resume_${user.id}`);
                }
              }
            }
            // Also refresh from server to ensure consistency
            setTimeout(() => loadResumes(false), 500);
            break;
            
          case 'RESUMES_UPDATED':
            console.log('Received resumes update broadcast:', data);
            // Update local state with fresh data
            if (data.resumes) {
              setResumes(data.resumes);
            }
            break;
        }
      };
      
      channel.addEventListener('message', handleBroadcastMessage);
      
      return () => {
        channel.removeEventListener('message', handleBroadcastMessage);
        channel.close();
      };
    }
  }, []);

  const loadResumes = async (showErrorToUser = false) => {
    setIsLoadingResumes(true);
    
    try {
      // Check if user is authenticated
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        return;
      }
      
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
      
      // Successfully loaded resumes
      
    } catch (error) {
      console.error('Error loading resumes:', error);
      
      // Handle authentication errors specifically
      if (error.response && error.response.status === 401) {
        console.error('Authentication error - token may be expired');
        return;
      }
      
      // Log error details for debugging
      console.error('Failed to load resumes:', {
        status: error.response?.status,
        message: error.response?.data?.message || error.message
      });
      
      // Always try to load from localStorage backup silently
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
    // Always bind chat history to the chat session's own resumeId
    const session = chatSessions.find(session => session.id === currentChatId);
    const sessionResumeId = session?.resumeId || selectedResumeId;
    if (user && currentChatId && sessionResumeId && messages.length > 0) {
      try {
        console.log('Saving chat history to database for chat ID:', currentChatId);
        const currentSession = chatSessions.find(session => session.id === currentChatId);
        const chatName = currentSession ? currentSession.name : `Chat ${new Date().toLocaleDateString()}`;
        const finalResumeId = sessionResumeId;
        
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

  const createNewChat = async (explicitResumeId = null) => {
    if (isCreatingChat) return;
    setIsCreatingChat(true);
    try {
      // Clear any existing suggestions when starting a new chat
      setSuggestions([]);
      // Check if user has reached the maximum number of active chats
      if (chatSessions.length >= MAX_ACTIVE_CHATS) {
        alert(`You've reached the maximum limit of ${MAX_ACTIVE_CHATS} active chats. Please delete an existing chat before creating a new one.`);
        return;
      }
    
      // Determine the resume to use for the new chat
      // Prefer the explicitly provided resumeId (e.g., just uploaded),
      // then fall back to the currently selected resumeId
      let finalResumeId = explicitResumeId || selectedResumeId;
      let selectedResume = null;
      let chatName = 'General Chat';
      let initialMessage = {
        text: 'Hi! I\'m your AI assistant. How can I help you today?',
        isBot: true,
        isSystem: true,
        timestamp: new Date()
      };
      
      // If we have resumes available and a specific resume is targeted, use it as-is without overriding
      if (resumes.length > 0) {
        // Only override if finalResumeId is not set at all
        if (!finalResumeId) {
          finalResumeId = resumes[0].id;
        }
        
        selectedResume = resumes.find(r => r.id === finalResumeId);
        if (selectedResume) {
          chatName = `Chat with ${selectedResume.fileName}`;
          initialMessage = {
            text: `Hi! I'm your resume analysis assistant. I can help you with your resume: ${selectedResume.fileName}. How can I assist you today?`,
            isBot: true,
            isSystem: true,
            timestamp: new Date()
          };
        }
      } else {
        // No resumes available - create a general chat
        finalResumeId = null;
        console.log('Creating general chat without resume');
      }
  
      // Generate unique chat ID
      const newChatId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const newSession = {
        id: newChatId,
        resumeId: finalResumeId,
        resumeName: selectedResume?.fileName || null,
        name: chatName,
        lastMessage: initialMessage.text.substring(0, 50) + (initialMessage.text.length > 50 ? '...' : ''),
        messageCount: 1, // Start with 1 for the initial message
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastActivity: new Date(),
        isGeneralChat: !finalResumeId // Flag to indicate this is a general chat
      };
  
      // Update state
      const updatedSessions = [newSession, ...chatSessions];
      setChatSessions(updatedSessions);
      setCurrentChatId(newChatId);
      
      // Only set selectedResumeId if we have a resume
      if (finalResumeId) {
        setSelectedResumeId(finalResumeId);
        localStorage.setItem(`chat_selected_resume_${user.id}`, finalResumeId);
      }
      
      // Set initial message immediately
      setMessages([initialMessage]);
      setSuggestions([]);
      
      // Save to localStorage
      localStorage.setItem(`chat_sessions_${user.id}`, JSON.stringify(updatedSessions));
      
      // Save to database immediately to ensure persistence
      (async () => {
        try {
          await saveChatHistory({
            chatId: newChatId,
            resumeId: finalResumeId || 'general', // Use 'general' as fallback for empty chats
            chatName: chatName,
            messages: [initialMessage]
          });
          console.log('New chat saved to database successfully');
        } catch (error) {
          console.error('Error saving new chat to database:', error);
        }
      })();
      
      console.log('New chat created:', newChatId, finalResumeId ? `with resume: ${selectedResume.fileName}` : 'as general chat');
    } finally {
      setIsCreatingChat(false);
    }
  };

  const switchToChat = async (chatId) => {
    const session = chatSessions.find(s => s.id === chatId);
    if (session) {
      // Save current chat before switching
      if (currentChatId && messages.length > 0) {
        await saveChatHistoryToDatabase();
      }
      // Clear suggestions when switching chats
      setSuggestions([]);
      // Always use the resumeId associated with this chat session
      setSelectedResumeId(session.resumeId);
      localStorage.setItem(`chat_selected_resume_${user.id}`, session.resumeId);
      setCurrentChatId(chatId);
      setSidebarOpen(false);
      // Load chat history for the new chat
      try {
        const history = await getChatHistory(chatId);
        if (history && history.length > 0) {
          setTimeout(() => {
            setMessages(history);
          }, 100);
        } else {
          setTimeout(() => {
            setMessages([]);
          }, 100);
        }
      } catch (error) {
        console.error('Error loading chat history when switching chats:', error);
        setTimeout(() => {
          setMessages([]);
        }, 100);
      }
    }
  };

  const deleteChat = (chatId) => {
    setConfirmDialogMessage('Delete this chat?');
    setConfirmDialogAction(() => async () => {
      setShowConfirmDialog(false);
      await deleteChatHistory(chatId);
      await loadChatSessions();
      if (currentChatId === chatId) {
        setCurrentChatId(null);
        setMessages([]);
      }
    });
    setShowConfirmDialog(true);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      console.warn('Invalid file type: Please upload a PDF file only.');
      alert('Please upload a PDF file only.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      console.warn('File size too large: File size must be less than 10MB.');
      alert('File size too large: File size must be less than 10MB.');
      return;
    }
    
    // Check resume limit
    if (resumes.length >= 3) {
      console.warn('Maximum resume limit reached (3/3)');
      alert('Maximum resume limit reached (3/3). Please delete an existing resume before uploading a new one.');
      return;
    }
    
    // Check chat limit since uploading a resume automatically creates a new chat
    if (chatSessions.length >= MAX_ACTIVE_CHATS) {
      console.warn(`Maximum chat limit reached (${MAX_ACTIVE_CHATS}/${MAX_ACTIVE_CHATS})`);
      alert(`You've reached the maximum limit of ${MAX_ACTIVE_CHATS} active chats. Please delete an existing chat before uploading a new resume.`);
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('resume', file);

      console.log('Starting resume upload...');
      const result = await uploadResumeForChat(formData);
      console.log('Resume upload successful:', result);
      
      // Check if the upload was actually successful
      if (result && result.success && result.resume) {
        console.log('Resume uploaded successfully, updating UI immediately...');
        
        const resumeId = result.resume._id || result.resume.id;
        const newResume = {
          id: resumeId,
          fileName: result.resume.fileName || file.name,
          ...result.resume
        };
        
        // Immediately update local state for instant UI feedback
        setResumes(prev => {
          const idx = prev.findIndex(r => r.id === resumeId);
          if (idx !== -1) {
            // Replace the existing resume and move it to the top
            const updated = [...prev];
            updated.splice(idx, 1);
            return [newResume, ...updated];
          } else {
            // Add new resume to the top
            return [newResume, ...prev];
          }
        });
        
        // Select the newly uploaded resume
        setSelectedResumeId(resumeId);
        localStorage.setItem(`chat_selected_resume_${user.id}`, resumeId);
        
        // Broadcast update to other tabs/windows
        if (typeof BroadcastChannel !== 'undefined') {
          const channel = new BroadcastChannel('resume-updates');
          channel.postMessage({ 
            type: 'RESUME_UPLOADED', 
            data: { resume: newResume, selectedResumeId: resumeId }
          });
        }
        
        // Refresh from server in background to ensure consistency
        setTimeout(async () => {
          try {
            await loadResumes(false);
            console.log('Background refresh completed after upload');
          } catch (loadError) {
            console.error('Background refresh failed after upload:', loadError);
          }
        }, 1000);
        
        // Create new chat bound to the newly uploaded resumeId
        setTimeout(() => {
          createNewChat(resumeId);
        }, 200);
        
        console.log('Resume upload and setup completed successfully');
      } else {
        console.error('Upload response missing expected data:', result);
        // Silently handle incomplete response - don't show error to user
      }
    } catch (error) {
      console.error('Error uploading resume:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      // Handle authentication errors by redirecting
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        window.location.reload();
        return;
      }
      
      // For all other errors, silently fail and log
      console.error('Upload failed silently:', {
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
        fileName: file.name,
        fileSize: file.size
      });
    } finally {
      setIsUploading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const handleDeleteResume = (resumeId) => {
    const resumeToDelete = resumes.find(r => r.id === resumeId);
    if (!resumeToDelete) return;
    setConfirmDialogMessage(`Do you want to delete "${resumeToDelete.fileName}"?`);
    setConfirmDialogAction(() => async () => {
      setShowConfirmDialog(false);
      try {
        await deleteResumeForChat(resumeId);
        // Only update resumes state, do NOT remove chat sessions
        const updatedResumes = resumes.filter(r => r.id !== resumeId);
        setResumes(updatedResumes);
        if (updatedResumes.length > 0) {
          localStorage.setItem(`resumes_backup_${user.id}`, JSON.stringify(updatedResumes));
        } else {
          localStorage.removeItem(`resumes_backup_${user.id}`);
        }
        // If current chat was using deleted resume, show warning but do not remove chat
        if (selectedResumeId === resumeId) {
          if (updatedResumes.length > 0) {
            setSelectedResumeId(updatedResumes[0].id);
            localStorage.setItem(`chat_selected_resume_${user.id}`, updatedResumes[0].id);
          } else {
            setSelectedResumeId(null);
            localStorage.removeItem(`chat_selected_resume_${user.id}`);
          }
        }
        // Broadcast update to other tabs/windows
        if (typeof BroadcastChannel !== 'undefined') {
          const channel = new BroadcastChannel('resume-updates');
          channel.postMessage({ 
            type: 'RESUME_DELETED', 
            data: { resumeId, deletedResume: resumeToDelete }
          });
        }
      } finally {
        await loadResumes(false);
      }
    });
    setShowConfirmDialog(true);
  };

  const handleSendMessage = async (message) => {
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
      
      const response = await sendMessage(message, recentMessages, selectedResumeId);
      setMessages(prev => [...prev, { 
        text: response.answer, 
        isBot: true,
        relevantChunks: response.relevantChunks,
        confidence: response.confidence
      }]);
      // Update follow-up suggestions after each bot response
      if (response.followUpSuggestions && Array.isArray(response.followUpSuggestions)) {
        setSuggestions(response.followUpSuggestions.slice(0, 3));
      } else {
        setSuggestions([]);
      }
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
      setSuggestions([]);
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
        ease: "easeOut",
        // Ensure animation completes
        when: "beforeChildren"
      }
    },
    exit: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.2
      }
    }
  };

  // Helper to find the resume for the current chat
  const currentSession = chatSessions.find(s => s.id === currentChatId);
  const currentResume = resumes.find(r => r.id === currentSession?.resumeId);
  const isResumeDeleted = currentSession && !currentResume && currentSession.resumeId;

  return (
    <div className="flex min-h-screen bg-white text-gray-900">
      {/* Section 1: App Sidebar (Dashboard style, fixed) */}
      <aside className="fixed inset-y-0 left-0 w-60 border-r border-gray-200 p-4 hidden sm:flex flex-col bg-white">
        <button
          type="button"
          aria-label="Go to Dashboard"
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 px-2 mb-6 cursor-pointer select-none hover:opacity-90 transition"
        >
          <div className="w-8 h-8 flex items-center justify-center">
            <img src="/new_logo.png" alt="ResumeRefiner Logo" className="w-8 h-8 object-contain rounded" />
          </div>
          <div className="text-xl font-semibold">Resume Refiner</div>
        </button>
        <nav className="space-y-1">
          <button
            className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 text-gray-700"
            onClick={() => navigate('/dashboard')}
          >
            Dashboard
          </button>
          {isAdmin && (
            <button
              className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 text-gray-700"
              onClick={() => navigate('/admin')}
            >
              Admin
            </button>
          )}
          {!isAdmin && (
            <button
              className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 text-gray-700"
              onClick={() => setShowProfileInfo(true)}
            >
              My Profile
            </button>
          )}
          <button
            className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 text-gray-700"
            onClick={() => setShowLogoutConfirm(true)}
          >
            Logout
          </button>
        </nav>
      </aside>

      {/* Content wrapper shifted to accommodate fixed sidebar */}
      <div className="flex flex-1 w-full ml-0 sm:ml-60 min-h-screen">

      {/* Section 2: Chats panel (collapsible) */}
      <div className={`${sidebarOpen ? 'block' : 'hidden lg:block'} w-72 bg-white p-4 border-r border-gray-200 transition-all duration-300 ease-in-out`}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Chats</h2>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="text-xs text-gray-500 mb-2">
              Active Chats: {chatSessions.length}/{MAX_ACTIVE_CHATS}
            </div>

            {/* Resume Selection Dropdown */}
            <div className="mb-3 relative">
              {isLoadingResumes ? (
                <div className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-sm text-gray-700 flex items-center justify-center">
                  <div className="animate-pulse">Loading resumes...</div>
                </div>
              ) : resumes.length > 0 ? (
                <CustomDropdown 
                  value={selectedResumeId || ''}
                  onChange={(value) => {
                    // Prevent resume switching if there's an active chat with messages
                    if (currentChatId && messages.length > 1) {
                      alert('Cannot switch resumes during an active chat. Please create a new chat to use a different resume.');
                      return;
                    }
                    setSelectedResumeId(value);
                    localStorage.setItem(`chat_selected_resume_${user.id}`, value);
                  }}
                  disabled={currentChatId && messages.length > 1}
                  options={[
                    { value: '', label: 'Select Resume' },
                    ...resumes.map((resume, index) => ({
                      value: resume.id,
                      label: `Resume ${index + 1}: ${resume.fileName.length > 20 ? resume.fileName.substring(0, 20) + '...' : resume.fileName}`
                    }))
                  ]}
                />
              ) : (
                <div className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-sm text-gray-700 text-center">
                  No resumes available
                </div>
              )}
            </div>

            {/* New Chat Button */}
            <button
              onClick={createNewChat}
              disabled={isCreatingChat || chatSessions.length >= MAX_ACTIVE_CHATS}
              className="w-full flex items-center justify-center space-x-2 p-2 bg-gray-900 hover:bg-black disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed text-white rounded-md text-sm transition-colors border border-gray-900"
            >
              <Plus className="w-4 h-4" />
              <span>
                {isCreatingChat ? 'Creating...' : 
                 chatSessions.length >= MAX_ACTIVE_CHATS ? 'Chat Limit Reached' : 'New Chat'}
              </span>
            </button>
            
            {resumes.length === 0 && (
              <div className="mt-2 text-xs text-gray-400 text-center">
                No resume selected - general chat mode
              </div>
            )}
            
            {chatSessions.length >= MAX_ACTIVE_CHATS && (
              <div className="mt-2 text-xs text-red-400 text-center">
                You've reached the maximum limit of {MAX_ACTIVE_CHATS} active chats. Please delete an existing chat to create a new one.
              </div>
            )}
          </div>

          {/* Chat Sessions List */}
          <div className="flex-1 overflow-y-auto p-2">
            {chatSessions.map((session) => (
              <div
                key={session.id}
                className={`p-3 mb-2 rounded-lg cursor-pointer transition-colors border ${
                  currentChatId === session.id 
                    ? 'bg-gray-50 border-gray-300' 
                    : 'bg-white hover:bg-gray-50 border-gray-200'
                }`}
                onClick={() => switchToChat(session.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-gray-900">{session.name}</p>
                    <p className="text-xs text-gray-500 truncate">{session.lastMessage || 'No messages yet'}</p>
                  </div>
                  <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteChat(session.id);
                      }}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <Trash2 className="w-4 h-4 text-gray-500 hover:text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Resume Management */}
            <div className="p-4 border-t border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Resumes ({resumes.length}/3)</span>
                {resumes.length < 3 && (
                  <label className="flex items-center space-x-1 px-2 py-1 bg-gray-900 hover:bg-black text-white rounded text-xs cursor-pointer transition-colors border border-gray-900">
                    <Upload className="w-3 h-3" />
                    <span>{isUploading ? 'Uploading...' : 'Upload PDF'}</span>
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
                <div key={resume.id} className="flex items-center justify-between p-2 bg-white rounded border border-gray-200 mb-1">
                  <span className="text-xs text-gray-700 truncate flex-1">
                    {index + 1}. {resume.fileName.length > 20 ? resume.fileName.substring(0, 20) + '...' : resume.fileName}
                  </span>
                  <button
                    onClick={() => handleDeleteResume(resume.id)}
                    className="p-1 hover:bg-red-50 text-red-600 rounded ml-2"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

      {/* Section 3: Main Chat Area */}
      <div className="flex-1 flex flex-col relative min-h-screen">
        <div className="flex-1 flex flex-col px-2 sm:px-4">
          <motion.div 
            className="w-full max-w-none mx-auto my-3 flex flex-col bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200 h-[calc(100vh-1.5rem)]"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-200 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <h1 className="text-xl font-semibold text-gray-900 whitespace-nowrap">AI Chat</h1>
                  {currentChatId && (
                    <div className="text-sm text-gray-500">
                      {messages.filter(msg => !msg.isBot).length}/{MAX_USER_MESSAGES_PER_CHAT}
                    </div>
                  )}
                </div>
                {selectedResumeId && (
                  <div className="text-xs text-gray-600">
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
                  <div className="w-16 h-16 border-4 border-gray-300 border-t-gray-900 rounded-full animate-spin mx-auto mb-4"></div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Loading Resumes</h3>
                  <p className="text-gray-500 mb-6">
                    Please wait while we load your resumes...
                  </p>
                </div>
              </div>
            ) : resumes.length === 0 && !currentChatId && (
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center">
                  <AlertCircle className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Upload Your First Resume</h3>
                  <p className="text-gray-600 mb-6">
                    Upload your resume (PDF) to start an intelligent conversation. You can upload up to 3 resumes.
                  </p>
                  <label className="inline-flex items-center space-x-2 px-6 py-3 bg-gray-900 hover:bg-black text-white rounded-lg cursor-pointer transition-colors border border-gray-900">
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
                    <div className="flex flex-col items-center justify-center space-y-2 text-gray-600 mt-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin"></div>
                        <span className="text-sm">Processing...</span>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            )}

            {/* No Chat Selected State */}
            {!isLoadingResumes && resumes.length > 0 && !currentChatId && (
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center">
                  <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Start a New Chat</h3>
                  <p className="text-gray-600 mb-6">
                    Create a new chat to get started with your selected resume.
                  </p>
                </div>
              </div>
            )}

            {/* Messages container */}
            {!isLoadingResumes && currentChatId && (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                  {messages.map((message, index) => (
                    <motion.div
                      key={index}
                      variants={messageVariants}
                      initial="visible"
                      animate="visible"
                      exit="visible"
                    >
                      <ChatMessage
                        message={message.text}
                        isBot={message.isBot}
                      />
                    </motion.div>
                  ))}
                  {isLoading && (
                    <div className="flex items-center space-x-2">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0"></div>
                        <div className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                            <div className="flex space-x-1">
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-75"></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-150"></div>
                            </div>
                        </div>
                    </div>
                  )}
                  
                  {resumes.length === 0 && messages.length === 0 && (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center p-6 bg-white rounded-lg border border-gray-200">
                        <MessageSquare className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">General Chat Mode</h3>
                        <p className="text-sm text-gray-600">
                          You're chatting without a resume. For personalized resume analysis, upload a resume using the sidebar.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Input area */}
                <div className="p-4 border-t border-gray-200 bg-white">
                  {/* Follow-up suggestions */}
                  {suggestions && suggestions.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {suggestions.map((s, idx) => (
                        <button
                          key={`${s}-${idx}`}
                          type="button"
                          className="text-sm px-3 py-1.5 rounded-full border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 disabled:opacity-50"
                          disabled={isLoading}
                          onClick={() => handleSendMessage(s)}
                          title={s}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                  <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
                </div>
              </>
            )}

            {/* Resume Deletion Warning */}
            {isResumeDeleted && (
              <div className="bg-yellow-50 text-yellow-800 p-2 rounded mb-2 flex items-center border border-yellow-200">
                <AlertCircle className="w-5 h-5 mr-2" />
                This resume has been deleted. You can still view the chat history.
              </div>
            )}
          </motion.div>
        </div>
      </div>

      </div>

      {/* Render ConfirmationDialog - Delete chat/resume */}
      {showConfirmDialog && (
        <ConfirmationDialog
          message={confirmDialogMessage}
          onConfirm={confirmDialogAction}
          onCancel={() => setShowConfirmDialog(false)}
          confirmText="Delete"
          cancelText="Cancel"
        />
      )}

      {/* Logout confirmation */}
      {showLogoutConfirm && (
        <ConfirmationDialog
          message={
            <div className="text-center">
              <div className="text-xl font-semibold text-gray-800 mb-2">See you soon!</div>
              <div className="text-sm text-gray-600">Are you sure you want to logout?</div>
            </div>
          }
          onConfirm={() => { logout(); setShowLogoutConfirm(false); }}
          onCancel={() => setShowLogoutConfirm(false)}
          confirmText="Yes, logout"
          cancelText="Cancel"
        />
      )}

      {/* Simple My Profile dialog (match Dashboard style) */}
      {showProfileInfo && (
        <ConfirmationDialog
          message={
            <div className="text-center">
              <div className="text-base text-gray-700">Profile feature is coming soon.</div>
            </div>
          }
          onConfirm={() => setShowProfileInfo(false)}
          onCancel={() => setShowProfileInfo(false)}
          confirmText="OK"
          cancelText="Close"
        />
      )}
    </div>
  );
}

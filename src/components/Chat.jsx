import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import ChatMessage from './chat/ChatMessage';
import ChatInput from './chat/ChatInput';
import { sendMessage, uploadResumeForChat, checkHasResume, deleteResumeData } from '../services/api';
import Navigation from './common/Navigation';
import { Upload, FileText, Trash2, AlertCircle } from 'lucide-react';

export default function Chat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasResume, setHasResume] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [resumeInfo, setResumeInfo] = useState(null);

  // Load chat history from localStorage on component mount
  useEffect(() => {
    loadChatHistory();
    checkResumeStatus();
  }, []);

  // Save chat history to localStorage whenever messages change
  useEffect(() => {
    if (user && messages.length > 0) {
      localStorage.setItem(`chat_history_${user.id}`, JSON.stringify(messages));
    }
  }, [messages, user]);

  const loadChatHistory = () => {
    if (user) {
      const savedHistory = localStorage.getItem(`chat_history_${user.id}`);
      if (savedHistory) {
        try {
          const parsedHistory = JSON.parse(savedHistory);
          setMessages(parsedHistory);
        } catch (error) {
          console.error('Error loading chat history:', error);
        }
      }
    }
  };

  const clearChatHistory = () => {
    if (user) {
      if (!window.confirm("Do you want to delete the chat ?")) {
        return;
      }
      localStorage.removeItem(`chat_history_${user.id}`);
      setMessages([]);
      // Add a system message after clearing
      if (hasResume && resumeInfo) {
        setMessages([{
          text: `Chat history cleared. I can see you have a resume uploaded with ${resumeInfo.chunksCount} sections. Feel free to ask me anything about your resume!`,
          isBot: true,
          isSystem: true
        }]);
      }
    }
  };

  const checkResumeStatus = async () => {
    try {
      const result = await checkHasResume();
      setHasResume(result.hasResume);
      if (result.hasResume) {
        setResumeInfo({ chunksCount: result.chunksCount });
        // Only add welcome message if chat history is empty
        if (messages.length === 0) {
          setMessages(prev => [
            ...prev,
            // {
            //   text: `Welcome! I can see you have a resume uploaded with ${result.chunksCount} sections. Feel free to ask me anything about your resume!`,
            //   isBot: true,
            //   isSystem: true
            // }
          ]);
        }
      }
    } catch (error) {
      console.error('Error checking resume status:', error);
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

    setIsUploading(true);
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('resume', file);

      const result = await uploadResumeForChat(formData);
      setHasResume(true);
      setResumeInfo({ 
        chunksCount: result.chunksStored,
        textLength: result.textLength 
      });
      
      setMessages(prev => [
        ...prev,
        {
          text: `Great! I've successfully processed your resume. It has been split into ${result.chunksStored} sections for better analysis. You can now ask me questions about your resume!`,
          isBot: true,
          isSystem: true
        }
      ]);
    } catch (error) {
      console.error('Error uploading resume:', error);
      setUploadError(error.response?.data?.error || 'Failed to upload resume. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteResume = async () => {
    if (!window.confirm("Do you want to delete your resume?")) {
      return;
    }
    try {
      await deleteResumeData();
      setHasResume(false);
      setResumeInfo(null);
      setMessages(prev => [
        ...prev,
        {
          text: 'Your resume data has been deleted. Please upload a new resume to continue chatting.',
          isBot: true,
          isSystem: true
        }
      ]);
    } catch (error) {
      console.error('Error deleting resume:', error);
      setMessages(prev => [
        ...prev,
        {
          text: 'Failed to delete resume data. Please try again.',
          isBot: true,
          isSystem: true
        }
      ]);
    }
  };

  const handleSendMessage = async (message) => {
    if (!hasResume) {
      setMessages(prev => [
        ...prev,
        { text: message, isBot: false },
        { 
          text: 'Please upload your resume first to start chatting about it.',
          isBot: true,
          isSystem: true
        }
      ]);
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
      
      const response = await sendMessage(message, recentMessages);
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
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-900 to-black text-white pt-16 sm:pt-28">
      <Navigation showBack={false} />
      <div className="flex flex-col items-center px-2 sm:px-4">
<motion.div 
           className="w-full max-w-5xl flex flex-col bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-white/20 min-h-[calc(100vh-4rem)] md:min-h-[85vh]"
           variants={containerVariants}
           initial="hidden"
           animate="visible"
           exit="hidden"
         >
        {/* Header */}
        <div className="p-3 sm:p-4 border-b border-white/20 bg-white/5">
          <div className="flex justify-between items-center mb-3">
              <div className="flex items-center space-x-2 sm:space-x-4">
                <h1 className="text-xl sm:text-2xl font-bold text-white">RAG Resume Chat</h1>
                {hasResume && resumeInfo && (
                  <div className="flex items-center space-x-2 text-sm text-green-400">
                    <FileText className="w-4 h-4" />
                    <span>{resumeInfo.chunksCount} sections</span>
                  </div>
                )}
                {hasResume && (
                  <button
                    onClick={handleDeleteResume}
                    className="flex items-center space-x-1 px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                    title="Delete resume"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {messages.length > 0 && (
                  <button
                    onClick={clearChatHistory}
                    className="flex items-center space-x-1 px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                    title="Clear chat history"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Clear Chat</span>
                  </button>
                )}
              </div>
          </div>
          
          {/* Resume Upload Section */}
          {!hasResume && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <AlertCircle className="w-5 h-5 text-blue-400" />
                <h3 className="text-blue-400 font-medium">Upload Your Resume</h3>
              </div>
              <p className="text-gray-300 text-sm mb-3">
                Upload your resume (PDF) to start an intelligent conversation about your experience, skills, and qualifications.
              </p>
              <div className="flex items-center space-x-3">
                <label className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg cursor-pointer transition-colors">
                  <Upload className="w-4 h-4" />
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
                  <div className="flex items-center space-x-2 text-blue-400">
                    <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm">Processing...</span>
                  </div>
                )}
              </div>
              {uploadError && (
                <div className="mt-2 text-red-400 text-sm flex items-center space-x-1">
                  <AlertCircle className="w-4 h-4" />
                  <span>{uploadError}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Messages container */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-4">
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
        <div className="p-3 sm:p-6 border-t border-white/20">
          <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
        </div>
      </motion.div>
      </div>
    </div>
  );
}

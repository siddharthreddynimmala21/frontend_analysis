import { useState } from 'react';
import { motion } from 'framer-motion';
import { LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ChatMessage from './chat/ChatMessage';
import ChatInput from './chat/ChatInput';
import { sendMessage } from '../services/api';
import ConfirmationDialog from './common/ConfirmationDialog';
import Navigation from './common/Navigation';

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const { logout } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleSendMessage = async (message) => {
    try {
      setIsLoading(true);
      setMessages(prev => [...prev, { text: message, isBot: false }]);
      
      const response = await sendMessage(message);
      setMessages(prev => [...prev, { text: response.response, isBot: true }]);
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [
        ...prev,
        { 
          text: 'Sorry, something went wrong. Please try again.',
          isBot: true 
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
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
      <motion.div 
        className="w-full max-w-3xl h-[90vh] flex flex-col bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl overflow-hidden border border-white/20"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <div className="p-4 border-b border-white/20 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Navigation />
            <h1 className="text-xl sm:text-2xl font-bold text-white">AI Chat</h1>
          </div>
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="flex items-center space-x-2 px-3 py-2 rounded-lg text-white/70 hover:bg-white/20 hover:text-white transition-colors duration-300"
            aria-label="Log out"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>

        {/* Messages container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
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
        <div className="p-4 sm:p-6 border-t border-white/20">
          <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
        </div>
      </motion.div>

      {showLogoutConfirm && (
        <ConfirmationDialog
          message="Are you sure you want to log out?"
          onConfirm={() => {
            logout();
            setShowLogoutConfirm(false);
          }}
          onCancel={() => setShowLogoutConfirm(false)}
        />
      )}
    </div>
  );
}

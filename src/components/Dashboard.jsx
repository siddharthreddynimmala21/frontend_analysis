import { motion } from 'framer-motion';
import { LogOut, MessageSquare, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';
import ConfirmationDialog from './common/ConfirmationDialog';
import Navigation from './common/Navigation';

export default function Dashboard() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

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

  const cardVariants = {
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
        className="w-full max-w-4xl h-[90vh] flex flex-col bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl overflow-hidden border border-white/20"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <div className="p-4 border-b border-white/20 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Navigation showBack={false} />
            <h1 className="text-xl sm:text-2xl font-bold text-white">Welcome to AI Assistant</h1>
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

        {/* Main content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* AI Chat Option */}
            <motion.div
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              className="bg-white/5 rounded-xl p-6 border border-white/10 hover:bg-white/10 transition-all duration-300 cursor-pointer"
              onClick={() => navigate('/chat')}
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center mb-4">
                  <MessageSquare className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-xl font-semibold text-white mb-2">AI Chat</h2>
                <p className="text-gray-300">
                  Chat with our AI assistant to get help with your questions and tasks.
                </p>
              </div>
            </motion.div>

            {/* Resume Analysis Option */}
            <motion.div
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              className="bg-white/5 rounded-xl p-6 border border-white/10 hover:bg-white/10 transition-all duration-300 cursor-pointer"
              onClick={() => navigate('/resume-analysis')}
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center mb-4">
                  <FileText className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-xl font-semibold text-white mb-2">Resume Analysis</h2>
                <p className="text-gray-300">
                  Upload your resume for AI-powered analysis and personalized feedback.
                </p>
              </div>
            </motion.div>
          </div>
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
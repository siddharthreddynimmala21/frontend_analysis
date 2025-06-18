import { motion } from 'framer-motion';
import { MessageSquare, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navigation from './common/Navigation';

export default function Dashboard() {
  const navigate = useNavigate();

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
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-black text-white p-4 sm:p-6 lg:p-8">
      {/* Navbar at the very top */}
      <Navigation showBack={false} />
      {/* Centered main cards */}
      <div className="flex-1 flex flex-col items-center justify-center w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {/* AI Chat Option */}
          <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className="bg-white/5 rounded-xl p-8 border border-white/10 hover:bg-white/10 transition-all duration-300 cursor-pointer shadow-lg flex flex-col items-center text-center"
            onClick={() => navigate('/chat')}
          >
            <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center mb-6 shadow-lg">
              <MessageSquare className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-semibold text-white mb-2">AI Chat</h2>
            <p className="text-gray-300 text-base">
              Chat with our AI assistant to get help with your questions and tasks.
            </p>
          </motion.div>

          {/* Resume Analysis Option */}
          <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className="bg-white/5 rounded-xl p-8 border border-white/10 hover:bg-white/10 transition-all duration-300 cursor-pointer shadow-lg flex flex-col items-center text-center"
            onClick={() => navigate('/resume-analysis')}
          >
            <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center mb-6 shadow-lg">
              <FileText className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-semibold text-white mb-2">Resume Analysis</h2>
            <p className="text-gray-300 text-base">
              Upload your resume for AI-powered analysis and personalized feedback.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
} 
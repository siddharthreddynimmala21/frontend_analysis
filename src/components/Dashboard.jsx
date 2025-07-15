import { motion } from 'framer-motion';
import { MessageSquare, FileText, Briefcase, Calculator, FileSearch } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navigation from './common/Navigation';
import React from 'react';





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
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-black text-white p-2 sm:p-4 lg:p-8">
      <Navigation showBack={false} />
      
      <div className="flex-1 flex flex-col items-center justify-center w-full mt-6">
        <motion.div
          className="w-full max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 mt-16 sm:mt-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-6 sm:mb-12">Welcome to ResumeRefiner Pro+</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {/* AI Chat Card */}
            <motion.div
              className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden hover:bg-white/20 transition-all duration-100 cursor-pointer"
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/chat')}
            >
              <div className="p-4 sm:p-6 lg:p-8">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mb-4 sm:mb-6">
                  <MessageSquare className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold mb-2">AI Chat</h2>
                <p className="text-sm sm:text-base text-gray-300">Chat with our AI assistant about your resume, career advice, or job search questions.</p>
              </div>
            </motion.div>

            {/* AI Resume Analysis Card */}
            <motion.div
              className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden hover:bg-white/20 transition-all duration-100 cursor-pointer"
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/upload-resume')}
            >
              <div className="p-4 sm:p-6 lg:p-8">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mb-4 sm:mb-6">
                  <Briefcase className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold mb-2">AI Resume Analysis</h2>
                <p className="text-sm sm:text-base text-gray-300">Get detailed feedback on your resume with AI-powered analysis and improvement suggestions.</p>
              </div>
            </motion.div>

            {/* Resume Analyzer Card */}
            <motion.div
              className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden hover:bg-white/20 transition-all duration-100 cursor-pointer"
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/resume-analyzer')}
            >
              <div className="p-4 sm:p-6 lg:p-8">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center mb-4 sm:mb-6">
                  <FileSearch className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold mb-2">Resume Analyzer</h2>
                <p className="text-sm sm:text-base text-gray-300">Analyze your resume against job descriptions and get AI-powered improvement suggestions.</p>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
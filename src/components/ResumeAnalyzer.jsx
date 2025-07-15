import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Upload, Briefcase } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Navigation from './common/Navigation';
import toast from 'react-hot-toast';
import { analyzeResume } from '../services/api';

export default function ResumeAnalyzer() {
  const { user } = useAuth();
  const [currentRole, setCurrentRole] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [experience, setExperience] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setError(null);
    } else {
      setSelectedFile(null);
      setError('Please select a valid PDF file');
      toast.error('Please select a valid PDF file');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!selectedFile) {
      setError('Please upload a resume PDF file');
      toast.error('Please upload a resume PDF file');
      return;
    }

    if (!currentRole.trim()) {
      setError('Please enter your current role');
      toast.error('Please enter your current role');
      return;
    }

    if (!targetRole.trim()) {
      setError('Please enter your target role');
      toast.error('Please enter your target role');
      return;
    }

    if (!experience.trim() || isNaN(experience)) {
      setError('Please enter a valid number for years of experience');
      toast.error('Please enter a valid number for years of experience');
      return;
    }

    if (!jobDescription.trim()) {
      setError('Please enter the job description');
      toast.error('Please enter the job description');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Create form data
      const formData = new FormData();
      formData.append('resume', selectedFile);
      formData.append('currentRole', currentRole);
      formData.append('targetRole', targetRole);
      formData.append('experience', experience);
      formData.append('jobDescription', jobDescription);
      // Include the JWT token for backend validation
      const token = localStorage.getItem('token');
      if (token) {
        formData.append('token', token);
      }

      // Send request to backend using the API service
      const response = await analyzeResume(formData);
      
      // Log the response for debugging
      console.log('Resume Analysis Response:', response);
      
      // Set the result
      setResult(response);
      toast.success('Resume analysis completed successfully!');
    } catch (error) {
      console.error('Error analyzing resume:', error);
      
      const errorMessage = error.response?.data?.error || error.message || 
        'An unexpected error occurred during resume analysis.';
      
      setError(errorMessage);
      toast.error(errorMessage);
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

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-900 to-black text-white p-4">
      <Navigation showBack={true} />
      
      <motion.div 
        className="flex-1 flex flex-col items-center justify-center w-full max-w-4xl mx-auto mt-16"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <h1 className="text-3xl md:text-4xl font-bold text-center mb-8">Resume Analyzer</h1>
        
        <motion.div 
          className="w-full bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl p-6 md:p-8"
          variants={cardVariants}
        >
          <div className="mb-6 flex items-center">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center mr-4">
              <Briefcase className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl font-bold">Analyze Your Resume</h2>
          </div>
          
          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2" htmlFor="resume">
                Upload Resume (PDF)
              </label>
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-white/5 border-white/20 hover:bg-white/10">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-3 text-gray-400" />
                    <p className="mb-2 text-sm text-gray-400">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-400">
                      PDF files only (MAX. 10MB)
                    </p>
                  </div>
                  <input 
                    id="resume" 
                    type="file" 
                    className="hidden" 
                    accept="application/pdf"
                    onChange={handleFileChange}
                    disabled={isLoading}
                  />
                </label>
              </div>
              {selectedFile && (
                <div className="mt-2 flex items-center text-sm text-blue-300">
                  <FileText className="w-4 h-4 mr-2" />
                  {selectedFile.name}
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium mb-2" htmlFor="currentRole">
                  Current Role
                </label>
                <input
                  id="currentRole"
                  type="text"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 text-white"
                  placeholder="e.g., Software Engineer"
                  value={currentRole}
                  onChange={(e) => setCurrentRole(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2" htmlFor="targetRole">
                  Target Role
                </label>
                <input
                  id="targetRole"
                  type="text"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 text-white"
                  placeholder="e.g., Senior Software Engineer"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2" htmlFor="experience">
                Years of Experience
              </label>
              <input
                id="experience"
                type="number"
                min="0"
                step="1"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 text-white"
                placeholder="e.g., 3"
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                disabled={isLoading}
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2" htmlFor="jobDescription">
                Job Description
              </label>
              <textarea
                id="jobDescription"
                rows="5"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 text-white"
                placeholder="Paste the job description here..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                disabled={isLoading}
              ></textarea>
            </div>
            
            <button
              type="submit"
              className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 ${isLoading ? 'bg-gray-600 cursor-not-allowed' : 'bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700'}`}
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Analyzing Resume...
                </span>
              ) : 'Analyze Resume'}
            </button>
          </form>
          
          {result && (
            <motion.div 
              className="mt-8 p-6 bg-white/5 border border-white/20 rounded-xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h3 className="text-lg font-semibold mb-4">Analysis Results</h3>
              {/* Render markdown as plain text without heading markers */}
              <pre className="whitespace-pre-wrap text-sm text-white">
                {result.message.replace(/^#+\s+/gm, '')}
              </pre>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
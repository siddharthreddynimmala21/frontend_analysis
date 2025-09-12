import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { motion } from 'framer-motion';
import { FileText, Upload, Briefcase, Wand2, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { analyzeResume } from '../services/api';
import ConfirmationDialog from './common/ConfirmationDialog';

export default function ResumeAnalyzer() {
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();
  const [currentRole, setCurrentRole] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [experience, setExperience] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [jobDescriptionOption, setJobDescriptionOption] = useState('paste'); // 'paste' or 'generate'
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

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

    if (jobDescriptionOption === 'paste' && !jobDescription.trim()) {
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
      formData.append('generateJobDescription', jobDescriptionOption === 'generate' ? 'true' : 'false');
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
    <div className="flex min-h-screen overflow-y-auto bg-white text-gray-900">
      {/* Sidebar (fixed, Dashboard/Chat style) */}
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
              onClick={() => alert('Profile feature is coming soon.')}
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

      {/* Mobile sidebar drawer (matches AdminDashboard) */}
      {navOpen && (
        <div className="fixed inset-0 z-40 sm:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setNavOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-60 bg-white border-r border-gray-200 p-4 shadow-xl">
            <button
              type="button"
              aria-label="Close menu"
              className="flex items-center gap-2 px-2 mb-6 cursor-pointer select-none hover:opacity-90 transition"
              onClick={() => setNavOpen(false)}
            >
              <X className="w-5 h-5" />
              <span className="text-sm">Close</span>
            </button>
            <button
              type="button"
              aria-label="Go to Dashboard"
              onClick={() => { setNavOpen(false); navigate('/dashboard'); }}
              className="flex items-center gap-2 px-2 mb-6 cursor-pointer select-none hover:opacity-90 transition"
            >
              <div className="w-8 h-8 flex items-center justify-center">
                <img src="/new_logo.png" alt="ResumeRefiner Logo" className="w-8 h-8 object-contain rounded" />
              </div>
              <div className="text-xl font-semibold">Resume Refiner</div>
            </button>
            <nav className="space-y-1">
              <button
                className="w-full text-left px-3 py-2 rounded-md bg-gray-100 text-gray-900 font-medium"
                onClick={() => { setNavOpen(false); navigate('/dashboard'); }}
              >
                Dashboard
              </button>
              {!isAdmin && (
                <button
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 text-gray-700"
                  onClick={() => { setNavOpen(false); alert('Profile feature is coming soon.'); }}
                >
                  My Profile
                </button>
              )}
              {isAdmin && (
                <button
                  className="w-full text-left px-3 py-2 rounded-md bg-gray-100 text-gray-900 font-medium"
                  onClick={() => { setNavOpen(false); navigate('/admin'); }}
                >
                  Admin
                </button>
              )}
              <button
                className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 text-gray-700"
                onClick={() => { setNavOpen(false); setShowLogoutConfirm(true); }}
              >
                Logout
              </button>
            </nav>
          </aside>
        </div>
      )}

      {/* Content wrapper shifted to accommodate fixed sidebar */}
      <div className="flex flex-col sm:flex-row flex-1 w-full ml-0 sm:ml-60 min-h-screen px-4 py-4 overflow-y-auto">
      {/* Loading Overlay */}
      {isLoading && (
        <motion.div 
          className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-50 flex flex-col items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
            <div className="flex justify-center mb-6">
              <svg className="animate-spin h-12 w-12 text-purple-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-4 text-gray-900">Analyzing Your Resume</h3>
            <p className="text-gray-600 mb-6">This may take a few moments.</p>
            <p className="text-gray-700 font-medium">Feel free to close the application — we'll email your personalized Resume Analysis Report shortly!</p>
          </div>
        </motion.div>
      )}
      
      <motion.div 
        className="flex-1 flex flex-col justify-start relative w-full max-w-5xl mx-auto my-0"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Mobile top bar (hamburger, logo, title) matching AdminDashboard */}
        <div className="sm:hidden sticky top-0 z-30 bg-white mb-3 w-full shrink-0">
          <div className="flex items-center gap-3 w-full">
            <button
              type="button"
              className="inline-flex items-center justify-center w-9 h-9 rounded-md border border-gray-300 text-gray-800"
              aria-label={navOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setNavOpen(v => !v)}
            >
              {navOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center w-10 h-10"
              aria-label="Go to Dashboard"
              onClick={() => navigate('/dashboard')}
            >
              <img src="/new_logo.png" alt="ResumeRefiner Logo" className="w-9 h-9 object-contain rounded" />
            </button>
            <span className="text-base font-semibold text-gray-900">Resume Refiner</span>
          </div>
        </div>

        <motion.div
          className="w-full bg-white border border-gray-200 rounded-2xl shadow-lg p-4 md:p-6 flex flex-col h-auto"
          variants={cardVariants}
        >
          <div className="mb-6 flex items-center">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-gray-900 rounded-xl flex items-center justify-center mr-4">
              <Briefcase className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <h2 className="text-lg md:text-xl font-bold">Analyze Your Resume</h2>
          </div>
          {/* Content area */}
          <div>
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2" htmlFor="resume">
                Upload Resume (PDF)
              </label>
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 border-gray-300 hover:bg-gray-100">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-3 text-gray-500" />
                    <p className="mb-2 text-sm text-gray-600">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">
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
                <div className="mt-2 flex items-center text-sm text-blue-700">
                  <FileText className="w-4 h-4 mr-2 text-blue-700" />
                  {selectedFile.name}
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium mb-2" htmlFor="currentRole">
                  Current Role
                </label>
                <input
                  id="currentRole"
                  type="text"
                  className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-900 text-gray-900"
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
                  className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-900 text-gray-900"
                  placeholder="e.g., Senior Software Engineer"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" htmlFor="experience">
                  Years of Experience
                </label>
                <input
                  id="experience"
                  type="number"
                  min="0"
                  step="1"
                  className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-900 text-gray-900"
                  placeholder="e.g., 3"
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2" htmlFor="jobDescriptionOption">
                Job Description
              </label>
              
              <div className="flex space-x-4 mb-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio h-4 w-4 text-purple-600"
                    name="jobDescriptionOption"
                    value="paste"
                    checked={jobDescriptionOption === 'paste'}
                    onChange={() => setJobDescriptionOption('paste')}
                    disabled={isLoading}
                  />
                  <span className="ml-2 text-sm">Paste Job Description</span>
                </label>
                
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio h-4 w-4 text-purple-600"
                    name="jobDescriptionOption"
                    value="generate"
                    checked={jobDescriptionOption === 'generate'}
                    onChange={() => setJobDescriptionOption('generate')}
                    disabled={isLoading}
                  />
                  <span className="ml-2 text-sm">Generate Job Description</span>
                </label>
              </div>
              
              {jobDescriptionOption === 'paste' ? (
                <textarea
                  id="jobDescription"
                  rows="4"
                  className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-900 text-gray-900"
                  placeholder="Paste the job description here..."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  disabled={isLoading}
                ></textarea>
              ) : (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg flex items-center">
                  <Wand2 className="w-5 h-5 text-gray-700 mr-3" />
                  <p className="text-sm text-gray-700">
                    We'll generate a job description based on your target role and experience.
                    <br />
                    <span className="text-xs text-gray-500 mt-1 block">
                      This will be used for analysis.
                    </span>
                  </p>
                </div>
              )}
            </div>
            
            {/* Submit area */}
            <div className="mt-4 pt-4 border-t">
              <button
                type="submit"
                className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 ${isLoading ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-black text-white hover:bg-gray-900'}`}
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
            </div>
            </form>
          
          {result && (
            <motion.div 
              className="mt-6 p-4 bg-white border border-gray-200 rounded-xl text-gray-800"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h3 className="text-lg font-semibold mb-3">Analysis Results</h3>
              <div className="max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    ul: ({node, ...props}) => <ul style={{listStyleType:'disc', listStylePosition:'outside', paddingLeft:20, marginBottom:8}} {...props} />,
                    ol: ({node, ...props}) => <ol style={{listStyleType:'decimal', listStylePosition:'outside', paddingLeft:20, marginBottom:8}} {...props} />,
                    h1: ({node, ...props}) => <h1 style={{fontSize:22, fontWeight:700, marginTop:14, marginBottom:10}} {...props} />,
                    h2: ({node, ...props}) => <h2 style={{fontSize:18, fontWeight:700, marginTop:12, marginBottom:8}} {...props} />,
                    h3: ({node, ...props}) => <h3 style={{fontSize:16, fontWeight:700, marginTop:10, marginBottom:6}} {...props} />,
                    p: ({node, ...props}) => <p style={{fontSize:14, lineHeight:1.7, marginBottom:8}} {...props} />,
                    li: ({node, ...props}) => <li style={{fontSize:14, lineHeight:1.7, marginBottom:6}} {...props} />
                  }}
                >
                  {result.message}
                </ReactMarkdown>
              </div>
            </motion.div>
          )}
          </div>
        </motion.div>
      </motion.div>
      </div>

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
    </div>
  );
}
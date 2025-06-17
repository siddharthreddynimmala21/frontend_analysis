import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { LogOut, Upload } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ConfirmationDialog from './common/ConfirmationDialog';
import Navigation from './common/Navigation';
import { uploadResume } from '../services/api';

export default function ResumeAnalysis() {
  const { user, logout } = useAuth();
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    
    // Validate file type
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setError(null);
    } else {
      setError('Please upload a valid PDF file');
      setFile(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    try {
      setIsLoading(true);
      setError(null);

      const formData = new FormData();
      formData.append('resume', file);

      const response = await uploadResume(formData);
      
      // Log the response for debugging
      console.log('Resume Upload Response:', response);
      
      // Assuming the response contains the extracted text
      setAnalysis(response);
    } catch (error) {
      console.error('Full Error Object:', error);
      
      // More detailed error handling
      const errorMessage = error.message || 
        'An unexpected error occurred while uploading the resume.';
      
      setError(errorMessage);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto bg-white/5 rounded-xl shadow-lg p-6 space-y-6">
          <h2 className="text-2xl font-bold text-center mb-4">Resume Analysis</h2>
          
          <div className="space-y-4">
            <label className="block">
              <input 
                type="file" 
                className="hidden"
                accept=".pdf"
                onChange={handleFileChange}
              />
              <div 
                className="w-full py-2 px-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white rounded-lg text-center cursor-pointer"
              >
                Choose PDF
              </div>
            </label>

            {file && (
              <div className="text-center text-sm text-white/70">
                Selected: {file.name}
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={!file || isLoading}
              className="w-full py-2 px-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
            >
              {isLoading ? 'Analyzing...' : 'Upload and Analyze'}
            </button>
          </div>

          {error && (
            <div className="mt-6 bg-red-500/10 rounded-lg p-6 border border-red-500/20">
              <h3 className="text-xl font-semibold text-red-400 mb-4">Error</h3>
              <div className="space-y-4 text-red-300">
                {error}
              </div>
            </div>
          )}

          {analysis && (
            <div className="mt-6 bg-white/5 rounded-lg p-6 border border-white/10">
              <h3 className="text-xl font-semibold text-white mb-4">Analysis Results</h3>
              <div className="space-y-4 text-white/70">
                <pre className="whitespace-pre-wrap">{analysis.text}</pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 
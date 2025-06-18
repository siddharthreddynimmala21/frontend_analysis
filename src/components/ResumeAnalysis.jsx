import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { LogOut, Upload, Briefcase, GraduationCap, Code, FileText, Download } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ConfirmationDialog from './common/ConfirmationDialog';
import Navigation from './common/Navigation';
import { uploadResume, analyzeResume } from '../services/api';

export default function ResumeAnalysis() {
  const { user, logout } = useAuth();
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);
  const [analysisType, setAnalysisType] = useState('ai'); // 'ai' or 'text'

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

      let response;
      if (analysisType === 'ai') {
        response = await analyzeResume(formData);
      } else {
        response = await uploadResume(formData);
      }
      
      // Log the response for debugging
      console.log('Resume Upload Response:', response);
      
      // Set the analysis data
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

  const renderStructuredAnalysis = () => {
    if (!analysis?.data) return null;

    const { workExperience, education, skills } = analysis.data;

    return (
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        {/* Work Experience Section */}
        {workExperience && workExperience.length > 0 && (
          <motion.div variants={cardVariants} className="bg-white/5 rounded-lg p-6 border border-white/10">
            <div className="flex items-center mb-4">
              <Briefcase className="w-6 h-6 text-cyan-400 mr-3" />
              <h3 className="text-xl font-semibold text-white">Work Experience</h3>
            </div>
            <div className="space-y-4">
              {workExperience.map((job, index) => (
                <div key={index} className="bg-white/5 rounded-lg p-4 border border-white/5">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-lg font-medium text-white">{job.position}</h4>
                    <span className="text-sm text-gray-400 bg-gray-700/50 px-2 py-1 rounded">
                      {job.duration}
                    </span>
                  </div>
                  <p className="text-cyan-400 font-medium mb-2">{job.company}</p>
                  <p className="text-gray-300 text-sm">{job.description}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Education Section */}
        {education && education.length > 0 && (
          <motion.div variants={cardVariants} className="bg-white/5 rounded-lg p-6 border border-white/10">
            <div className="flex items-center mb-4">
              <GraduationCap className="w-6 h-6 text-green-400 mr-3" />
              <h3 className="text-xl font-semibold text-white">Education</h3>
            </div>
            <div className="space-y-4">
              {education.map((edu, index) => (
                <div key={index} className="bg-white/5 rounded-lg p-4 border border-white/5">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-lg font-medium text-white">{edu.degree}</h4>
                    <span className="text-sm text-gray-400 bg-gray-700/50 px-2 py-1 rounded">
                      {edu.duration}
                    </span>
                  </div>
                  <p className="text-green-400 font-medium mb-2">{edu.institution}</p>
                  <p className="text-gray-400 text-sm mb-1">{edu.field}</p>
                  {edu.description && (
                    <p className="text-gray-300 text-sm">{edu.description}</p>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Skills Section */}
        {skills && skills.length > 0 && (
          <motion.div variants={cardVariants} className="bg-white/5 rounded-lg p-6 border border-white/10">
            <div className="flex items-center mb-4">
              <Code className="w-6 h-6 text-purple-400 mr-3" />
              <h3 className="text-xl font-semibold text-white">Skills</h3>
            </div>
            <div className="space-y-4">
              {skills.map((skillGroup, index) => (
                <div key={index} className="bg-white/5 rounded-lg p-4 border border-white/5">
                  <h4 className="text-lg font-medium text-white mb-3">{skillGroup.category}</h4>
                  <div className="flex flex-wrap gap-2">
                    {skillGroup.skills.map((skill, skillIndex) => (
                      <span 
                        key={skillIndex}
                        className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 px-3 py-1 rounded-full text-sm border border-purple-500/30"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Raw Text Section (if available) */}
        {analysis?.rawText && (
          <motion.div variants={cardVariants} className="bg-white/5 rounded-lg p-6 border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <FileText className="w-6 h-6 text-blue-400 mr-3" />
                <h3 className="text-xl font-semibold text-white">Raw Text</h3>
              </div>
              <button
                onClick={() => {
                  const blob = new Blob([analysis.rawText], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'resume-text.txt';
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="flex items-center text-blue-400 hover:text-blue-300 text-sm"
              >
                <Download className="w-4 h-4 mr-1" />
                Download
              </button>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-4 max-h-60 overflow-y-auto">
              <pre className="text-gray-300 text-sm whitespace-pre-wrap">{analysis.rawText}</pre>
            </div>
          </motion.div>
        )}
      </motion.div>
    );
  };

  const renderTextAnalysis = () => {
    if (!analysis?.text) return null;

    return (
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="bg-white/5 rounded-lg p-6 border border-white/10"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <FileText className="w-6 h-6 text-blue-400 mr-3" />
            <h3 className="text-xl font-semibold text-white">Extracted Text</h3>
          </div>
          <button
            onClick={() => {
              const blob = new Blob([analysis.text], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'resume-text.txt';
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="flex items-center text-blue-400 hover:text-blue-300 text-sm"
          >
            <Download className="w-4 h-4 mr-1" />
            Download
          </button>
        </div>
        <div className="bg-gray-900/50 rounded-lg p-4 max-h-96 overflow-y-auto">
          <pre className="text-gray-300 text-sm whitespace-pre-wrap">{analysis.text}</pre>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
      <Navigation />
      <div className="container mx-auto px-4 mt-32">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-4xl mx-auto space-y-6"
        >
          <div className="bg-white/5 rounded-xl shadow-lg p-6">
            <h2 className="text-3xl font-bold text-center mb-6">Resume Analysis</h2>
            
            {/* Analysis Type Selection */}
            <div className="flex justify-center mb-6">
              <div className="bg-gray-800/50 rounded-lg p-1 flex">
                <button
                  onClick={() => setAnalysisType('ai')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    analysisType === 'ai'
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  AI Analysis
                </button>
                <button
                  onClick={() => setAnalysisType('text')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    analysisType === 'text'
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Text Only
                </button>
              </div>
            </div>
            
            <div className="space-y-4">
              <label className="block">
                <input 
                  type="file" 
                  className="hidden"
                  accept=".pdf"
                  onChange={handleFileChange}
                />
                <div 
                  className="w-full py-3 px-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white rounded-lg text-center cursor-pointer transition-all duration-300"
                >
                  <Upload className="w-5 h-5 inline mr-2" />
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
                className="w-full py-3 px-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-medium"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    {analysisType === 'ai' ? 'Analyzing with AI...' : 'Extracting Text...'}
                  </div>
                ) : (
                  analysisType === 'ai' ? 'Upload and Analyze with AI' : 'Upload and Extract Text'
                )}
              </button>
            </div>
          </div>

          {error && (
            <motion.div 
              variants={cardVariants}
              className="bg-red-500/10 rounded-lg p-6 border border-red-500/20"
            >
              <h3 className="text-xl font-semibold text-red-400 mb-4">Error</h3>
              <div className="space-y-4 text-red-300">
                {error}
              </div>
            </motion.div>
          )}

          {/* Analysis Results */}
          {analysis && (
            <div className="space-y-6">
              {analysisType === 'ai' ? renderStructuredAnalysis() : renderTextAnalysis()}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
} 
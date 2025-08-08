import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Upload, Wand2 } from 'lucide-react';
import Navigation from './common/Navigation';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../services/api';

export default function AIInterview() {
  const [currentRole, setCurrentRole] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [experience, setExperience] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [jobDescriptionOption, setJobDescriptionOption] = useState('paste');
  const [answers, setAnswers] = useState({ mcq: {}, desc: {} });

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
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('resume', selectedFile);
      formData.append('currentRole', currentRole);
      formData.append('targetRole', targetRole);
      formData.append('experience', experience);
      formData.append('jobDescription', jobDescription);
      const token = localStorage.getItem('token');
      // Use the correct API endpoint
      const response = await fetch(`${API_BASE_URL}/api/ai-interview/start`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      console.log(data);
      // Clean and parse questions if returned as a fenced code block string
      if (typeof data.questions === 'string') {
        const cleaned = data.questions
          .replace(/```[a-zA-Z]*\n?/, '')
          .replace(/```/g, '')
          .trim();
        try {
          data.questions = JSON.parse(cleaned);
        } catch (_) {
          // leave as string fallback
        }
      }
      if (!response.ok) {
        throw new Error(data?.message || data?.error || 'Failed to start interview practice.');
      }
      setResult(data);
      toast.success('Interview practice started!');
    } catch (err) {
      console.error('AI Interview error:', err);
      let errorMessage = err.message || 'An error occurred.';
      
      // If it's a fetch error, try to get more details
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        errorMessage = 'Network error: Unable to connect to the server.';
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-black text-white p-2 sm:p-4 lg:p-8">
      <Navigation showBack={true} />
      <motion.div
        className="w-full max-w-2xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 mt-16 sm:mt-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-6 mt-8 sm:mb-12">AI Interview Practice</h1>
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

          <div className="mb-6">
            <label className="block text-sm font-medium mb-2" htmlFor="currentRole">
              Current Role
            </label>
            <input
              id="currentRole"
              type="text"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 text-white"
              placeholder="e.g., Software Engineer"
              value={currentRole}
              onChange={(e) => setCurrentRole(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-2" htmlFor="targetRole">
              Target Role
            </label>
            <input
              id="targetRole"
              type="text"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 text-white"
              placeholder="e.g., Senior Software Engineer"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              disabled={isLoading}
            />
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
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 text-white"
              placeholder="e.g., 3"
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-2" htmlFor="jobDescriptionOption">
              Job Description
            </label>
            <div className="flex items-center mb-2">
              <label className="mr-4 flex items-center">
                <input
                  type="radio"
                  name="jobDescriptionOption"
                  value="paste"
                  checked={jobDescriptionOption === 'paste'}
                  onChange={() => setJobDescriptionOption('paste')}
                  disabled={isLoading}
                  className="mr-2"
                />
                Paste
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="jobDescriptionOption"
                  value="generate"
                  checked={jobDescriptionOption === 'generate'}
                  onChange={() => setJobDescriptionOption('generate')}
                  disabled={isLoading}
                  className="mr-2"
                />
                Generate with AI <Wand2 className="w-4 h-4 ml-1 text-green-400" />
              </label>
            </div>
            {jobDescriptionOption === 'paste' && (
              <textarea
                id="jobDescription"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 text-white"
                placeholder="Paste the job description here..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                disabled={isLoading}
                rows={4}
              />
            )}
          </div>

          {error && <div className="mb-4 text-red-400 text-sm">{error}</div>}
          <button
            type="submit"
            className="w-full py-3 px-6 rounded-lg bg-green-600 hover:bg-green-700 transition-colors font-bold text-lg mt-2 disabled:opacity-60"
            disabled={isLoading}
          >
            {isLoading ? 'Starting Practice...' : 'Start Interview Practice'}
          </button>
        </form>
        {result?.questions && (
          <div className="mt-6 p-4 bg-gray-800 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Round {result.round} Questions</h2>
            <ul className="space-y-4 text-left list-decimal list-inside">
              {Array.isArray(result.questions)
                ? result.questions.map((q, idx) => (
                    <li key={idx} className="mb-2 whitespace-pre-line">
                      {typeof q === 'string' ? q : JSON.stringify(q, null, 2)}
                    </li>
                  ))
                : (
                  <>
                    {result.questions.mcq_questions && (
                      <>
                        <h3 className="text-lg font-medium mb-2">MCQ Questions</h3>
                        {result.questions.mcq_questions.map((item, idx) => (
                          <li key={idx} className="mb-4">
                            <p className="font-semibold">{item.question}</p>
                            <div className="ml-4 space-y-1">
                              {item.options.map((opt, i) => (
                                <label key={i} className="flex items-center">
                                  <input
                                    type="radio"
                                    name={`mcq-${idx}`}
                                    value={opt}
                                    checked={answers.mcq[idx] === opt}
                                    onChange={() =>
                                      setAnswers((prev) => ({
                                        ...prev,
                                        mcq: { ...prev.mcq, [idx]: opt },
                                      }))
                                    }
                                    className="mr-2"
                                  />
                                  {opt}
                                </label>
                              ))}
                            </div>
                          </li>
                        ))}
                      </>
                    )}
                    {result.questions.desc_questions && (
                      <>
                        <h3 className="text-lg font-medium mb-2 mt-4">Descriptive Questions</h3>
                        {result.questions.desc_questions.map((q, idx) => (
                          <li key={idx} className="mb-4">
                            <p className="font-semibold mb-2">{q}</p>
                            <textarea
                              className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2"
                              rows={3}
                              value={answers.desc[idx] || ''}
                              onChange={(e) =>
                                setAnswers((prev) => ({
                                  ...prev,
                                  desc: { ...prev.desc, [idx]: e.target.value },
                                }))
                              }
                            />
                          </li>
                        ))}
                      </>
                    )}
                  </>
                )}
            </ul>
            <button
              className="mt-6 py-2 px-4 bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-60"
              disabled={isLoading || !result?.sessionId}
              onClick={async () => {
                try {
                  const token = localStorage.getItem('token');
                  const res = await fetch(`${API_BASE_URL}/api/ai-interview/submit`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                      sessionId: result.sessionId,
                      round: result.round,
                      answers,
                    }),
                  });
                  if (!res.ok) throw new Error('Failed to submit answers');
                  toast.success('Answers submitted!');
                } catch (err) {
                  console.error(err);
                  toast.error(err.message || 'Submit failed');
                }
              }}
            >
              Submit Answers
            </button>
          </div>
        )}
        </motion.div>
      </div>
    );
  }
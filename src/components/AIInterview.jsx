import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Upload, Wand2, Brain } from 'lucide-react';
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
  // Initialize answers state with proper structure
  const [answers, setAnswers] = useState({ mcq: {}, desc: {} });
  const [validation, setValidation] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [answersSubmitted, setAnswersSubmitted] = useState(false);
  const [showFullReport, setShowFullReport] = useState(false);
  const [currentRound, setCurrentRound] = useState(1);
  const [roundHistory, setRoundHistory] = useState([]);
  const [sessionId, setSessionId] = useState(null); // Store session ID for reuse across rounds
  // Session ID Management:
  // - Round 1: Generate new session ID (backend creates new interview)
  // - Rounds 2-4: Reuse existing session ID (backend adds rounds to existing interview)
  // - New Interview: Reset session ID to null (forces new session creation)

  // Debug answers state changes
  useEffect(() => {
    console.log('Answers state updated:', answers);
  }, [answers]);

  // Debug session ID changes
  useEffect(() => {
    console.log('Session ID updated:', sessionId);
  }, [sessionId]);

  // Debug current round changes
  useEffect(() => {
    console.log('Current round updated:', currentRound);
  }, [currentRound]);

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

    // Reset session ID and round history for new interview
    setSessionId(null);
    setCurrentRound(1);
    setRoundHistory([]);
    setAnswers({ mcq: {}, desc: {} });
    setValidation(null);
    setAnswersSubmitted(false);
    try {
      const formData = new FormData();
      formData.append('resume', selectedFile);
      formData.append('currentRole', currentRole);
      formData.append('targetRole', targetRole);
      formData.append('experience', experience);
      formData.append('jobDescription', jobDescriptionOption === 'paste' ? jobDescription : '');
      formData.append('jobDescriptionOption', jobDescriptionOption);
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
      // Store session ID for subsequent rounds
      if (data.sessionId) {
        setSessionId(data.sessionId);
      }
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

  const startNextRound = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Reset states for new round
      setAnswers({ mcq: {}, desc: {} });
      setAnswersSubmitted(false);
      setShowFullReport(false);

      // Store current round result in history
      setRoundHistory(prev => [...prev, { round: currentRound, validation }]);

      // Move to next round
      const nextRound = currentRound + 1;
      setCurrentRound(nextRound);
      setValidation(null);
      setResult(null); // Clear previous questions

      const formData = new FormData();
      formData.append('resume', selectedFile);
      formData.append('currentRole', currentRole);
      formData.append('targetRole', targetRole);
      formData.append('experience', experience);
      formData.append('jobDescription', jobDescriptionOption === 'paste' ? jobDescription : '');
      formData.append('jobDescriptionOption', jobDescriptionOption);
      formData.append('round', nextRound.toString()); // Add round parameter

      // Pass existing session ID for subsequent rounds
      if (sessionId) {
        formData.append('sessionId', sessionId);
      }

      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/ai-interview/start`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      console.log('Next round data:', data);

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
        throw new Error(data?.message || data?.error || 'Failed to start next round.');
      }

      setResult(data);
      // Ensure we keep the same session ID (should be the same as what we sent)
      if (data.sessionId && data.sessionId !== sessionId) {
        console.warn('Session ID mismatch detected:', { sent: sessionId, received: data.sessionId });
      }
      toast.success(`${getRoundName(nextRound)} started!`);

    } catch (err) {
      console.error('Next round error:', err);
      toast.error(err.message || 'Failed to start next round');
    } finally {
      setIsLoading(false);
    }
  };

  const getRoundName = (round) => {
    switch (round) {
      case 1: return 'Technical Round 1';
      case 2: return 'Technical Round 2';
      case 3: return 'Managerial Round';
      case 4: return 'HR Round';
      default: return `Round ${round}`;
    }
  };

  const canProceedToNextRound = () => {
    if (!validation) return false;

    // For Technical Round 1 to Technical Round 2: Need Pass verdict (60% score)
    if (currentRound === 1) {
      return validation.verdict === 'Pass';
    }

    // For Technical Round 2 to Managerial Round: Need Pass verdict (60% score)
    if (currentRound === 2) {
      return validation.verdict === 'Pass';
    }

    // For Managerial Round to HR Round: No minimum score requirement (any completion)
    if (currentRound === 3) {
      return true; // Always allow progression from Managerial to HR
    }

    // HR Round is the final round
    if (currentRound === 4) {
      return false;
    }

    return false;
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

      {/* Loading Overlay */}
      {isLoading && (
        <motion.div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
            <div className="flex justify-center mb-6">
              <svg className="animate-spin h-12 w-12 text-purple-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-4">Starting Interview Practice</h3>
            <p className="text-gray-300 mb-6">Generating personalized questions based on your resume and job description.</p>
            <p className="text-gray-300 font-medium">This may take a few moments...</p>
          </div>
        </motion.div>
      )}

      <motion.div
        className="flex-1 flex flex-col items-center justify-center w-full max-w-4xl mx-auto mt-6 sm:mt-16"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >

        <motion.div
          className="w-full bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl p-6 md:p-8 mt-12"
          variants={cardVariants}
        >
          <div className="mb-6 flex items-center">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center mr-4">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">AI Interview Practice</h2>
              <p className="text-sm text-gray-400">{getRoundName(currentRound)}</p>
              {sessionId && (
                <p className="text-xs text-gray-500 mt-1">Session: {sessionId.slice(-8)}</p>
              )}
              {roundHistory.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {roundHistory.map((round, idx) => (
                    <span
                      key={idx}
                      className={`px-2 py-1 text-xs rounded-full ${round.validation.verdict === 'Pass'
                        ? 'bg-green-500/20 text-green-300'
                        : 'bg-red-500/20 text-red-300'
                        }`}
                    >
                      {getRoundName(round.round)}: {round.validation.verdict}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200">
              {error}
            </div>
          )}

          {/* Round-specific instructions */}
          <div className="mb-6 p-4 bg-blue-500/20 border border-blue-500/50 rounded-lg">
            <h3 className="font-medium mb-2">Round Information:</h3>
            <p className="text-sm text-blue-200">
              {currentRound === 1 && "This round focuses on fundamental technical skills and basic concepts. You need 60% to pass."}
              {currentRound === 2 && "This round covers advanced technical skills, system design, and architecture. You need 60% to pass."}
              {currentRound === 3 && "This round evaluates your leadership, management, and team handling skills. Any score allows progression to HR round."}
              {currentRound === 4 && "This is the final round focusing on cultural fit, communication skills, and career goals."}
            </p>
          </div>

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
                  rows="5"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 text-white"
                  placeholder="Paste the job description here..."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  disabled={isLoading}
                ></textarea>
              ) : (
                <div className="p-4 bg-white/5 border border-white/10 rounded-lg flex items-center">
                  <Wand2 className="w-5 h-5 text-purple-400 mr-3" />
                  <p className="text-sm text-gray-300">
                    We'll generate a job description based on your target role and experience.
                    <br />
                    <span className="text-xs text-gray-400 mt-1 block">
                      This will be used for generating interview questions.
                    </span>
                  </p>
                </div>
              )}
            </div>

            {error && <div className="mb-4 text-red-400 text-sm">{error}</div>}
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
                  Starting Practice...
                </span>
              ) : 'Start Interview Practice'}
            </button>
          </form>

          {result?.questions && (
            <motion.div
              className="mt-8 p-6 bg-white/5 border border-white/20 rounded-xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h3 className="text-lg font-semibold mb-4">{getRoundName(result.round)} Questions</h3>
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
              <div className="flex flex-col space-y-4">
                <button
                  className="mt-6 py-3 px-4 rounded-lg font-medium transition-all duration-200 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 disabled:opacity-60 flex items-center justify-center"
                  disabled={isLoading || !result?.sessionId || answersSubmitted || isValidating}
                  onClick={async () => {
                    try {
                      // Log the data being sent
                      console.log('Submitting answers:', {
                        sessionId: result.sessionId,
                        storedSessionId: sessionId,
                        round: result.round,
                        answers: answers
                      });

                      // Validate session ID consistency
                      if (sessionId && result.sessionId !== sessionId) {
                        console.warn('Session ID mismatch detected during submission:', {
                          stored: sessionId,
                          fromResult: result.sessionId
                        });
                      }

                      // Check if answers have content
                      const hasMcqAnswers = Object.keys(answers.mcq).length > 0;
                      const hasDescAnswers = Object.keys(answers.desc).length > 0;

                      if (!hasMcqAnswers && !hasDescAnswers) {
                        toast.error('Please answer at least one question before submitting');
                        return;
                      }

                      const token = localStorage.getItem('token');

                      // Step 1: Submit answers
                      const submitRes = await fetch(`${API_BASE_URL}/api/ai-interview/submit`, {
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

                      const submitResponseData = await submitRes.json();
                      console.log('Submit response:', submitResponseData);

                      if (!submitRes.ok) {
                        throw new Error(submitResponseData.error || 'Failed to submit answers');
                      }

                      toast.success('Answers submitted successfully!');
                      setAnswersSubmitted(true);

                      // Step 2: Automatically start validation
                      setIsValidating(true);
                      toast.loading('Validating your answers...', { duration: 2000 });

                      const validateRes = await fetch(`${API_BASE_URL}/api/ai-interview/validate`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                          sessionId: result.sessionId,
                          round: result.round,
                        }),
                      });

                      const validateResponseData = await validateRes.json();
                      console.log('Validation response:', validateResponseData);

                      if (!validateRes.ok) {
                        throw new Error(validateResponseData.error || 'Failed to validate answers');
                      }

                      // Check if we have a validation response or an error
                      if (!validateResponseData.validation) {
                        if (validateResponseData.error) {
                          // Handle specific error cases
                          if (validateResponseData.error.includes('GROQ_API_KEY')) {
                            throw new Error('AI validation service is currently unavailable. Please try again later.');
                          } else {
                            throw new Error(`Validation error: ${validateResponseData.error}`);
                          }
                        } else {
                          throw new Error('Invalid validation response structure');
                        }
                      }

                      // Ensure validation has the expected structure with fallbacks for missing data
                      const validationData = {
                        verdict: validateResponseData.validation?.verdict || 'No Verdict',
                        total_score: validateResponseData.validation?.total_score ?? 0,
                        max_possible_score: validateResponseData.validation?.max_possible_score ?? 0,
                        percentage: validateResponseData.validation?.percentage ?? 0,
                        mcq: validateResponseData.validation?.mcq ?? { score: 0, max_score: 0, details: [] },
                        descriptive: validateResponseData.validation?.descriptive ?? { score: 0, max_score: 0, details: [] }
                      };

                      setValidation(validationData);
                      toast.success(`Validation complete! Verdict: ${validationData.verdict}`);

                    } catch (err) {
                      console.error('Submit/Validation error:', err);
                      toast.error(err.message || 'Submit/Validation failed');
                    } finally {
                      setIsValidating(false);
                    }
                  }}
                >
                  {isValidating ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Validating...
                    </>
                  ) : answersSubmitted ? 'Completed' : 'Submit & Validate Answers'}
                </button>
              </div>
            </motion.div>
          )}

          {validation && (
            <motion.div
              className="mt-8 p-6 bg-gray-800 rounded-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Brain className="w-6 h-6 mr-2 text-purple-400" />
                Interview Results
              </h2>

              {/* Summary Card */}
              <div className="mb-6 p-6 rounded-lg" style={{ backgroundColor: validation.verdict === 'Pass' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)' }}>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-2xl font-bold">
                    Verdict: {validation.verdict}
                  </h3>
                  <span className="text-3xl font-bold">
                    {validation.total_score || 0}/{validation.max_possible_score || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center text-lg">
                  <span>Overall Score</span>
                  <span className="font-semibold">{validation.percentage || 0}%</span>
                </div>
                <div className="mt-2 bg-gray-700 rounded-full h-3">
                  <div
                    className="h-3 rounded-full transition-all duration-500"
                    style={{
                      width: `${validation.percentage || 0}%`,
                      backgroundColor: validation.verdict === 'Pass' ? '#22c55e' : '#ef4444'
                    }}
                  ></div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-700 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-400">{validation.mcq?.score || 0}/{validation.mcq?.max_score || 0}</div>
                  <div className="text-sm text-gray-300">MCQ Questions</div>
                </div>
                <div className="bg-gray-700 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-400">{validation.descriptive?.score || 0}/{validation.descriptive?.max_score || 0}</div>
                  <div className="text-sm text-gray-300">Descriptive Questions</div>
                </div>
              </div>

              {/* Progression Info */}
              {currentRound < 4 && (
                <div className="mb-6 p-4 bg-gray-700 rounded-lg">
                  <h4 className="font-medium mb-2">Next Round Requirements:</h4>
                  <p className="text-sm text-gray-300">
                    {currentRound === 1 && "To proceed to Technical Round 2, you need to Pass (≥60% score)"}
                    {currentRound === 2 && "To proceed to Managerial Round, you need to Pass (≥60% score)"}
                    {currentRound === 3 && "You can proceed to HR Round regardless of score"}
                  </p>
                  {canProceedToNextRound() ? (
                    <div className="mt-2 flex items-center text-green-400">
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Eligible for next round
                    </div>
                  ) : (
                    <div className="mt-2 flex items-center text-red-400">
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      Need higher score to proceed
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="text-center space-y-4">
                <button
                  onClick={() => setShowFullReport(!showFullReport)}
                  className="py-3 px-6 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 rounded-lg font-medium transition-all duration-200 flex items-center mx-auto"
                >
                  {showFullReport ? 'Hide Detailed Report' : 'View Detailed Report'}
                  <svg
                    className={`w-5 h-5 ml-2 transition-transform duration-200 ${showFullReport ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Next Round Button - Show based on round-specific requirements */}
                {canProceedToNextRound() && currentRound < 4 && (
                  <button
                    onClick={startNextRound}
                    disabled={isLoading}
                    className="py-3 px-6 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-lg font-medium transition-all duration-200 flex items-center mx-auto disabled:opacity-60"
                  >
                    {isLoading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Starting Next Round...
                      </>
                    ) : (
                      <>
                        Proceed to {getRoundName(currentRound + 1)}
                        <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </>
                    )}
                  </button>
                )}

                {/* Final Round Completion Message */}
                {currentRound === 4 && (
                  <div className="py-4 px-6 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg text-center">
                    <div className="flex items-center justify-center mb-2">
                      <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <h4 className="text-lg font-bold">Interview Process Complete!</h4>
                    </div>
                    <p className="text-sm opacity-90">
                      Congratulations! You have completed all 4 rounds of the interview process.
                    </p>
                  </div>
                )}

                {/* Start New Interview Button - Show after completing any round */}
                {validation && (
                  <button
                    onClick={() => {
                      // Reset all states for a completely new interview
                      setSessionId(null);
                      setCurrentRound(1);
                      setRoundHistory([]);
                      setAnswers({ mcq: {}, desc: {} });
                      setValidation(null);
                      setAnswersSubmitted(false);
                      setResult(null);
                      setShowFullReport(false);
                      toast.success('Ready to start a new interview!');
                    }}
                    disabled={isLoading}
                    className="py-3 px-6 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 rounded-lg font-medium transition-all duration-200 flex items-center mx-auto disabled:opacity-60 mt-4"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Start New Interview
                  </button>
                )}
              </div>

              {/* Detailed Report */}
              {showFullReport && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mt-6"
                >
                  <div className="mb-6">
                    <h3 className="text-lg font-medium mb-3">MCQ Questions ({validation.mcq?.score || 0}/{validation.mcq?.max_score || 0})</h3>
                    <ul className="space-y-4">
                      {validation.mcq?.details?.map((item, idx) => (
                        <li key={idx} className="p-3 rounded-lg" style={{ backgroundColor: item.is_correct ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)' }}>
                          <p className="font-semibold">{item.question}</p>
                          <div className="mt-2 grid grid-cols-1 gap-1">
                            {item.options.map((opt, i) => {
                              const isUserAnswer = item.user_answer && (item.user_answer === opt || item.user_answer.startsWith(opt.split('.')[0]));
                              const isCorrectAnswer = item.correct_answer === opt || item.correct_answer.startsWith(opt.split('.')[0]);

                              let bgColor = 'transparent';
                              if (isUserAnswer && isCorrectAnswer) bgColor = 'rgba(34, 197, 94, 0.3)';
                              else if (isUserAnswer) bgColor = 'rgba(239, 68, 68, 0.3)';
                              else if (isCorrectAnswer) bgColor = 'rgba(34, 197, 94, 0.2)';

                              return (
                                <div
                                  key={i}
                                  className="p-2 rounded flex items-start"
                                  style={{ backgroundColor: bgColor }}
                                >
                                  <span>{opt}</span>
                                  {isUserAnswer && (
                                    <span className="ml-2 text-sm">(Your answer)</span>
                                  )}
                                  {isCorrectAnswer && (
                                    <span className="ml-2 text-sm text-green-400">(Correct answer)</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-3">Descriptive Questions ({validation.descriptive?.score || 0}/{validation.descriptive?.max_score || 0})</h3>
                    <ul className="space-y-6">
                      {validation.descriptive?.details?.map((item, idx) => (
                        <li key={idx} className="p-4 rounded-lg" style={{ backgroundColor: item.score === 3 ? 'rgba(34, 197, 94, 0.1)' : item.score > 0 ? 'rgba(234, 179, 8, 0.1)' : 'rgba(239, 68, 68, 0.1)' }}>
                          <p className="font-semibold mb-2">{item.question}</p>
                          <div className="mb-3 p-3 bg-gray-700 rounded whitespace-pre-wrap">
                            {item.user_answer || <em className="text-gray-400">No answer provided</em>}
                          </div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium">Score: {item.score}/{item.max_score}</span>
                          </div>
                          <div className="p-3 bg-gray-700 rounded">
                            <p className="font-medium mb-1">Feedback:</p>
                            <p>{item.feedback}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
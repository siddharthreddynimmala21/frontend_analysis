import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle, ArrowRight, ArrowLeft, FileText, MessageSquare, Brain, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../services/api';
import Navigation from './common/Navigation';
import '../styles/InterviewExam.css';

export default function InterviewExam() {
    const navigate = useNavigate();
    const location = useLocation();

    // Get interview data from navigation state
    const interviewData = location.state;

    // Debug logging
    console.log('InterviewExam - interviewData:', interviewData);
    console.log('InterviewExam - location:', location);
    console.log('InterviewExam - mcqQuestions raw:', interviewData?.questions?.mcq_questions);
    console.log('InterviewExam - descQuestions raw:', interviewData?.questions?.desc_questions);

    // State management
    const [currentSection, setCurrentSection] = useState('mcq'); // 'mcq' or 'descriptive'
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState({ mcq: {}, desc: {} });
    const [timeElapsed, setTimeElapsed] = useState(0);
    // No question timer state needed anymore
    const [showExitWarning, setShowExitWarning] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [sectionCompleted, setSectionCompleted] = useState({ mcq: false, desc: false });

    // Refs
    const examRef = useRef(null);

    // Extract questions from interview data
    const mcqQuestions = Array.isArray(interviewData?.questions?.mcq_questions) ? interviewData.questions.mcq_questions : [];
    const descQuestions = Array.isArray(interviewData?.questions?.desc_questions) ? interviewData.questions.desc_questions : [];
    
    // Additional debug logging for questions
    console.log('InterviewExam - mcqQuestions after extraction:', mcqQuestions);
    console.log('InterviewExam - descQuestions after extraction:', descQuestions);

    // Debug logging
    console.log('InterviewExam - mcqQuestions:', mcqQuestions);
    console.log('InterviewExam - descQuestions:', descQuestions);
    console.log('InterviewExam - questions structure:', interviewData?.questions);

    const currentQuestions = currentSection === 'mcq' ? mcqQuestions : descQuestions;
    const currentAnswer = currentSection === 'mcq'
        ? answers.mcq[currentQuestionIndex]
        : answers.desc[currentQuestionIndex];

    // No timer constants needed anymore
    // No timer progress percentage needed anymore

    // Handle interview completion
    const handleCompleteInterview = useCallback(async () => {
        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('token');

            // Submit answers
            const submitResponse = await fetch(`${API_BASE_URL}/api/ai-interview/submit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    sessionId: interviewData.sessionId,
                    round: interviewData.round,
                    answers: answers,
                }),
            });

            if (!submitResponse.ok) {
                throw new Error('Failed to submit answers');
            }

            // Validate answers
            const validateResponse = await fetch(`${API_BASE_URL}/api/ai-interview/validate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    sessionId: interviewData.sessionId,
                    round: interviewData.round,
                }),
            });

            if (!validateResponse.ok) {
                throw new Error('Failed to validate answers');
            }

            const validationData = await validateResponse.json();

            toast.success('Interview completed successfully!');

            // Navigate back to main interview page with results
            navigate('/ai-interview', {
                state: {
                    completed: true,
                    validation: validationData.validation,
                    sessionId: interviewData.sessionId,
                    round: interviewData.round,
                    formData: {
                        currentRole: interviewData.currentRole,
                        targetRole: interviewData.targetRole,
                        experience: interviewData.experience,
                        jobDescription: interviewData.jobDescription,
                        jobDescriptionOption: interviewData.jobDescriptionOption
                    }
                }
            });

        } catch (error) {
            console.error('Error completing interview:', error);
            toast.error('Failed to complete interview. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    }, [interviewData.sessionId, interviewData.round, answers, navigate]);

    // No auto-progression function needed anymore

    // Overall timer effect
    useEffect(() => {
        const timer = setInterval(() => {
            setTimeElapsed(prev => prev + 1);
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // No question timer needed anymore

    // No timer code needed

    // No question timer effect needed anymore



    // Navigation warning effect
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            e.preventDefault();
            e.returnValue = '';
            return '';
        };

        const handlePopState = (e) => {
            e.preventDefault();
            setShowExitWarning(true);
            window.history.pushState(null, '', window.location.pathname);
        };

        // Add event listeners
        window.addEventListener('beforeunload', handleBeforeUnload);
        window.addEventListener('popstate', handlePopState);

        // Push initial state to prevent back navigation
        window.history.pushState(null, '', window.location.pathname);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            window.removeEventListener('popstate', handlePopState);
            // No cleanup needed
        };
    }, []);

    // Format time display
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // No question timer display needed anymore

    // Handle answer submission for current question
    const handleSubmitAnswer = () => {
        if (!currentAnswer || (typeof currentAnswer === 'string' && !currentAnswer.trim())) {
            toast.error('Please provide an answer before proceeding');
            return;
        }

        // Move to next question or section
        if (currentQuestionIndex < currentQuestions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        } else {
            // Section completed
            setSectionCompleted(prev => ({ ...prev, [currentSection]: true }));

            if (currentSection === 'mcq' && descQuestions.length > 0) {
                // Move to descriptive section
                setCurrentSection('descriptive');
                setCurrentQuestionIndex(0);
                toast.success('MCQ section completed! Moving to descriptive questions.');
            } else {
                // All sections completed
                handleCompleteInterview();
            }
        }
    };

    // Handle going back to previous question
    const handlePreviousQuestion = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(prev => prev - 1);
        } else if (currentSection === 'descriptive' && mcqQuestions.length > 0) {
            // Go back to MCQ section
            setCurrentSection('mcq');
            setCurrentQuestionIndex(mcqQuestions.length - 1);
            setSectionCompleted(prev => ({ ...prev, desc: false }));
        }
    };

    // Handle answer change
    const handleAnswerChange = (value) => {
        if (currentSection === 'mcq') {
            setAnswers(prev => ({
                ...prev,
                mcq: { ...prev.mcq, [currentQuestionIndex]: value }
            }));
        } else {
            setAnswers(prev => ({
                ...prev,
                desc: { ...prev.desc, [currentQuestionIndex]: value }
            }));
        }
    };

    // Handle exit confirmation
    const handleExitInterview = () => {
        navigate('/ai-interview');
    };

    if (!interviewData || !interviewData.questions) {
        console.log('InterviewExam - No interview data or questions, showing fallback');
        console.log('InterviewExam - interviewData:', interviewData);
        return (
            <div className="h-screen flex flex-col bg-gradient-to-br from-gray-900 to-black text-white overflow-hidden">
                <Navigation showBack={true} />
                <div className="flex-1 flex items-center justify-center p-4 pt-16 sm:pt-20">
                    <div className="text-center bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl p-8 max-w-md w-full">
                        <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center mx-auto mb-6">
                            <Brain className="w-8 h-8 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-4">No Interview Data</h2>
                        <p className="text-gray-300 mb-6">Please start an interview from the main page.</p>
                        <button
                            onClick={() => navigate('/ai-interview')}
                            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white rounded-xl transition-all duration-200 font-medium"
                        >
                            Go to Interview Page
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Check if we have any questions to show
    if (mcqQuestions.length === 0 && descQuestions.length === 0) {
        console.log('InterviewExam - No questions found, showing fallback');
        return (
            <div className="h-screen flex flex-col bg-gradient-to-br from-gray-900 to-black text-white overflow-hidden">
                <Navigation showBack={true} />
                <div className="flex-1 flex items-center justify-center p-4 pt-16 sm:pt-20">
                    <div className="text-center bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl p-8 max-w-md w-full">
                        <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center mx-auto mb-6">
                            <Brain className="w-8 h-8 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-4">No Questions Available</h2>
                        <p className="text-gray-300 mb-6">The interview questions could not be loaded. Please try starting the interview again.</p>
                        <button
                            onClick={() => navigate('/ai-interview')}
                            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white rounded-xl transition-all duration-200 font-medium"
                        >
                            Go Back to Interview Setup
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Safely get the current question
    const currentQuestion = currentQuestions && currentQuestionIndex < currentQuestions.length ? currentQuestions[currentQuestionIndex] : null;
    const progress = currentQuestions && currentQuestions.length > 0 ? ((currentQuestionIndex + 1) / currentQuestions.length) * 100 : 0;
    const totalQuestions = mcqQuestions.length + descQuestions.length;

    // Debug current question
    console.log('InterviewExam - currentQuestion:', currentQuestion);
    console.log('InterviewExam - currentSection:', currentSection);
    console.log('InterviewExam - currentQuestionIndex:', currentQuestionIndex);
    console.log('InterviewExam - totalQuestions:', totalQuestions);

    // Add a simple loading check
    if (!currentQuestion) {
        console.log('InterviewExam - No current question, showing loading');
        return (
            <div className="h-screen flex flex-col bg-gradient-to-br from-gray-900 to-black text-white overflow-hidden">
                <Navigation showBack={true} />
                <div className="flex-1 flex items-center justify-center p-4 pt-16 sm:pt-20">
                    <div className="text-center">
                        <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center mx-auto mb-6">
                            <Brain className="w-8 h-8 text-white animate-pulse" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-4">Loading Question...</h2>
                        <p className="text-gray-300">Please wait while we prepare your interview question.</p>
                    </div>
                </div>
            </div>
        );
    }
    const completedQuestions = Object.keys(answers.mcq).length + Object.keys(answers.desc).length;

    console.log('InterviewExam - Rendering main component');

    return (
        <div className="h-screen flex flex-col bg-gradient-to-br from-gray-900 to-black text-white overflow-hidden">
            <Navigation showBack={true} />
            <div className="flex-1 flex flex-col pt-16 sm:pt-20 p-4">

                {/* Header */}
                <div className="mb-4">
                    <div className="max-w-4xl mx-auto">
                        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl p-3 sm:p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center">
                                        {currentSection === 'mcq' ? (
                                            <FileText className="w-4 h-4 text-white" />
                                        ) : (
                                            <MessageSquare className="w-4 h-4 text-white" />
                                        )}
                                    </div>
                                    <div>
                                        <h1 className="text-lg font-bold text-white">
                                            {interviewData.roundName || `Round ${interviewData.round}`}
                                        </h1>
                                        <div className="text-xs text-gray-400">
                                            Session: {interviewData.sessionId?.slice(-8)}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-4 text-sm">
                                    <div className="flex items-center space-x-1 text-gray-300">
                                        <Clock className="w-4 h-4" />
                                        <span className="font-mono">{formatTime(timeElapsed)}</span>
                                    </div>
                                    <div className="text-gray-400">
                                        {completedQuestions}/{totalQuestions}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
                    {/* Section Indicator */}
                    <div className="px-4 mb-4">
                        <div className="flex items-center justify-center space-x-4 mb-2">
                            <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full ${currentSection === 'mcq'
                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                : sectionCompleted.mcq
                                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                    : 'bg-white/10 text-gray-400 border border-white/20'
                                }`}>
                                <FileText className="w-4 h-4" />
                                <span className="text-sm font-medium">Multiple Choice Questions</span>
                                {sectionCompleted.mcq && <CheckCircle className="w-3 h-3" />}
                            </div>

                            <div className={`w-8 h-0.5 rounded-full ${sectionCompleted.mcq ? 'bg-green-400' : 'bg-white/20'}`} />

                            <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full ${currentSection === 'descriptive'
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                : sectionCompleted.desc
                                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                    : 'bg-white/10 text-gray-400 border border-white/20'
                                }`}>
                                <MessageSquare className="w-4 h-4" />
                                <span className="text-sm font-medium">Descriptive Questions</span>
                                {sectionCompleted.desc && <CheckCircle className="w-3 h-3" />}
                            </div>
                        </div>
                        <div className="text-center text-xs text-gray-400">
                            Selected answers are saved automatically.
                        </div>
                    </div>

                    {/* Question Timer Progress */}
                    <div className="px-4 mb-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-300">
                                {currentSection === 'mcq' ? 'Multiple Choice Questions' : 'Descriptive Questions'}
                            </span>
                            <span className="text-sm text-gray-400">
                                {currentQuestionIndex + 1} of {currentQuestions.length}
                            </span>
                        </div>
                        
                        {/* Timer removed */}
                    </div>

                    {/* Question Card */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={`${currentSection}-${currentQuestionIndex}`}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{
                                opacity: 1,
                                x: 0
                            }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{
                                duration: 0.3
                            }}
                            className="flex-1 mx-4 mb-4 backdrop-blur-xl rounded-2xl shadow-2xl p-4 sm:p-6 flex flex-col transition-all duration-300 bg-white/10 border border-white/20"
                        >
                            <div className="mb-4">
                                <div className="flex items-center space-x-3 mb-3">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold ${currentSection === 'mcq' ? 'bg-blue-500' : 'bg-green-500'
                                        }`}>
                                        {currentQuestionIndex + 1}
                                    </div>
                                    <h2 className="text-base font-semibold text-white">
                                        {currentSection === 'mcq' ? 'Multiple Choice Question' : 'Descriptive Question'}
                                    </h2>
                                </div>

                                <div className="text-gray-300 text-sm sm:text-base leading-relaxed">
                                    {typeof currentQuestion === 'object' ? currentQuestion?.question : currentQuestion}
                                </div>
                            </div>

                            {/* Answer Section */}
                            <div className="flex-1 flex flex-col">
                                {currentSection === 'mcq' ? (
                                    // MCQ Options
                                    <div className="space-y-2">
                                        {Array.isArray(currentQuestion?.options) ? currentQuestion.options.map((option, index) => (
                                            <label
                                                key={index}
                                                className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all ${currentAnswer === option
                                                    ? 'border-blue-500 bg-blue-500/10'
                                                    : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                                                    }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="mcq-answer"
                                                    value={option}
                                                    checked={currentAnswer === option}
                                                    onChange={(e) => handleAnswerChange(e.target.value)}
                                                    className="w-4 h-4 text-blue-500 bg-gray-700 border-gray-600 mr-3 focus:ring-blue-500 focus:ring-2"
                                                />
                                                <span className="text-sm text-gray-300">{option}</span>
                                            </label>
                                        )) : <div className="text-gray-400">No options available for this question</div>}
                                    </div>
                                ) : (
                                    // Descriptive Answer
                                    <div className="flex-1 flex flex-col">
                                        <textarea
                                            value={currentAnswer || ''}
                                            onChange={(e) => handleAnswerChange(e.target.value)}
                                            placeholder="Type your detailed answer here..."
                                            className="flex-1 p-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 resize-none focus:border-green-400 focus:outline-none"
                                        />
                                        <div className="mt-2 text-sm text-gray-400">
                                            {currentAnswer?.length || 0} characters
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </AnimatePresence>

                    {/* Navigation Buttons */}
                    <div className="px-4 pb-4">
                        <div className="flex items-center justify-between">
                            <button
                                onClick={handlePreviousQuestion}
                                disabled={(currentQuestionIndex === 0 && currentSection === 'mcq')}
                                className="flex items-center space-x-2 px-4 py-2 bg-white/10 border border-white/20 rounded-lg hover:bg-white/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-gray-300"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                <span className="text-sm">Previous</span>
                            </button>

                            <button
                                onClick={handleSubmitAnswer}
                                disabled={!currentAnswer || (typeof currentAnswer === 'string' && !currentAnswer.trim()) || isSubmitting}
                                className="flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-white"
                            >
                                <span className="text-sm">
                                    {isSubmitting ? 'Submitting...' :
                                        currentQuestionIndex === currentQuestions.length - 1 && currentSection === 'descriptive' ? 'Complete Interview' :
                                            currentQuestionIndex === currentQuestions.length - 1 ? 'Next Section' : 'Next Question'}
                                </span>
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Exit Warning Modal */}
                <AnimatePresence>
                    {showExitWarning && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50"
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl p-6 max-w-md mx-4"
                            >
                                <div className="flex items-center space-x-3 mb-4">
                                    <AlertTriangle className="w-6 h-6 text-amber-400" />
                                    <h3 className="text-lg font-semibold text-white">Exit Interview?</h3>
                                </div>

                                <p className="text-gray-300 mb-6">
                                    Are you sure you want to exit the interview? Your progress will be lost and you'll need to start over.
                                </p>

                                <div className="flex space-x-3">
                                    <button
                                        onClick={() => setShowExitWarning(false)}
                                        className="flex-1 px-4 py-2 bg-white/10 border border-white/20 text-gray-300 rounded-lg hover:bg-white/20 hover:border-white/30 transition-all"
                                    >
                                        Continue Interview
                                    </button>
                                    <button
                                        onClick={handleExitInterview}
                                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                    >
                                        Exit Interview
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
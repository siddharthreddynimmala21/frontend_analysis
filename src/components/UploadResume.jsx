import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Navigation from './common/Navigation';
import React, { useState } from 'react';
import { matchResumeSkills, generateJobDescription, getRoleRelevanceReport, analyzeProjects, analyzeWorkExperience } from '../services/api';

// Minimal UI components
const Card = ({ children, className = '' }) => (
  <div className={`rounded-2xl shadow-2xl p-6 ${className}`}>{children}</div>
);
const CardHeader = ({ children }) => <div className="mb-4">{children}</div>;
const CardTitle = ({ children, className = '' }) => <h3 className={`text-xl font-bold mb-1 ${className}`}>{children}</h3>;
const CardDescription = ({ children, className = '' }) => <p className={`text-base mb-2 ${className}`}>{children}</p>;
const CardContent = ({ children, className = '' }) => <div className={className}>{children}</div>;
const Label = ({ children, ...props }) => <label {...props} className={props.className + ' block font-medium mb-1'}>{children}</label>;
const Input = ({ className = '', ...props }) => (
  <input className={`w-full rounded-lg px-3 py-2 border focus:outline-none focus:ring-2 focus:ring-purple-500 ${className}`} {...props} />
);
const Textarea = ({ className = '', ...props }) => (
  <textarea className={`w-full rounded-lg px-3 py-2 border focus:outline-none focus:ring-2 focus:ring-purple-500 ${className}`} {...props} />
);
const Select = ({ value, onChange, children, ...props }) => (
  <select value={value} onChange={e => onChange(e.target.value)} {...props} className={(props.className || '') + ' w-full rounded-lg px-3 py-2 border focus:outline-none focus:ring-2 focus:ring-purple-500'}>{children}</select>
);
const Button = ({ children, ...props }) => <button {...props} className={(props.className || '') + ' rounded-lg px-6 py-2 font-semibold transition-all duration-200'}>{children}</button>;
const Alert = ({ children, className = '' }) => <div className={`rounded-lg p-4 border ${className}`}>{children}</div>;
const AlertDescription = ({ children, className = '' }) => <div className={className}>{children}</div>;

const SkillMatchReportDisplay = ({ report }) => {
  if (!report) return null;
  
  try {
    // Try to parse the report for structured display
    let score = null, strengths = [], improvements = [], justification = '';
    
    // Try to extract info from the report string
    if (typeof report === 'string') {
      // Score
      const scoreMatch = report.match(/skill match score:?\s*(\d{1,3})/i);
      score = scoreMatch ? scoreMatch[1] : null;
      
      // Strengths
      const strengthsMatch = report.match(/strengths:?\s*([\s\S]*?)\n(?:areas for improvement|$)/i);
      if (strengthsMatch) {
        strengths = strengthsMatch[1].split(/\n/).map(s => s.trim().replace(/^-\s*/, '')).filter(Boolean);
      }
      
      // Areas for improvement
      const improvementsMatch = report.match(/areas for improvement:?\s*([\s\S]*?)\n(?:justification|$)/i);
      if (improvementsMatch) {
        improvements = improvementsMatch[1].split(/\n/).map(s => s.trim().replace(/^-\s*/, '')).filter(Boolean);
      }
      
      // Justification
      const justificationMatch = report.match(/justification:?\s*([\s\S]*)/i);
      if (justificationMatch) {
        justification = justificationMatch[1].trim();
      }
    }
  
    return (
      <div className="space-y-3 sm:space-y-4">
        {score && (
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="relative w-16 h-16 sm:w-24 sm:h-24">
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl sm:text-2xl font-bold">{score}%</span>
              </div>
              <svg className="w-16 h-16 sm:w-24 sm:h-24" viewBox="0 0 100 100">
                <circle
                  className="text-gray-200 dark:text-gray-700"
                  strokeWidth="10"
                  stroke="currentColor"
                  fill="transparent"
                  r="40"
                  cx="50"
                  cy="50"
                />
                <circle
                  className="text-blue-600 dark:text-blue-400"
                  strokeWidth="10"
                  strokeDasharray={`${score * 2.51} 251`}
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="transparent"
                  r="40"
                  cx="50"
                  cy="50"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-semibold">Match Score</h3>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Based on your skills and the job requirements</p>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {strengths.length > 0 && (
            <div className="bg-green-50 dark:bg-green-900/20 p-3 sm:p-4 rounded-lg">
              <h3 className="text-base sm:text-lg font-semibold text-green-700 dark:text-green-400 mb-1 sm:mb-2">Strengths</h3>
              <ul className="list-disc pl-4 sm:pl-5 space-y-0.5 sm:space-y-1 text-xs sm:text-sm">
                {strengths.map((skill, index) => (
                  <li key={index} className="text-gray-700 dark:text-gray-300">{skill}</li>
                ))}
              </ul>
            </div>
          )}
          
          {improvements.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/20 p-3 sm:p-4 rounded-lg">
              <h3 className="text-base sm:text-lg font-semibold text-amber-700 dark:text-amber-400 mb-1 sm:mb-2">Areas for Improvement</h3>
              <ul className="list-disc pl-4 sm:pl-5 space-y-0.5 sm:space-y-1 text-xs sm:text-sm">
                {improvements.map((skill, index) => (
                  <li key={index} className="text-gray-700 dark:text-gray-300">{skill}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        
        {justification && (
          <div className="bg-gray-50 dark:bg-gray-800/50 p-3 sm:p-4 rounded-lg">
            <h3 className="text-base sm:text-lg font-semibold mb-1 sm:mb-2">Analysis</h3>
            <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">{justification}</p>
          </div>
        )}
        
        {/* Raw report fallback */}
        {!score && !strengths.length && !improvements.length && (
          <pre className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 sm:p-4 text-xs sm:text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap overflow-x-auto">{report}</pre>
        )}
      </div>
    );
  } catch (error) {
    console.error('Error parsing skill match report:', error);
    return (
      <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg text-red-800 dark:text-red-200">
        <h3 className="text-lg font-semibold mb-2">Error Displaying Report</h3>
        <p>There was an error parsing the skill match report. Please try again or contact support.</p>
        <pre className="mt-2 p-2 bg-red-100 dark:bg-red-800/30 rounded text-xs overflow-auto">{report}</pre>
      </div>
    );
  }
};

function RoleRelevanceReportDisplay({ report }) {
  try {
    // Try to parse the report for structured display
    let score = null, strengths = [], improvements = [], justification = '';
    
    // Try to extract info from the report string
    if (typeof report === 'string') {
      // Score
      const scoreMatch = report.match(/skill match score:?\s*(\d{1,3})/i);
      score = scoreMatch ? scoreMatch[1] : null;
      
      // Strengths
      const strengthsMatch = report.match(/strengths:?\s*([\s\S]*?)\n(?:areas for improvement|$)/i);
      if (strengthsMatch) {
        strengths = strengthsMatch[1].split(/\n/).map(s => s.trim().replace(/^-\s*/, '')).filter(Boolean);
      }
      
      // Areas for improvement
      const improvementsMatch = report.match(/areas for improvement:?\s*([\s\S]*?)\n(?:justification|$)/i);
      if (improvementsMatch) {
        improvements = improvementsMatch[1].split(/\n/).map(s => s.trim().replace(/^-\s*/, '')).filter(Boolean);
      }
      
      // Justification
      const justificationMatch = report.match(/justification:?\s*([\s\S]*)/i);
      if (justificationMatch) {
        justification = justificationMatch[1].trim();
      }
    }
  
  return (
    <div className="space-y-3 sm:space-y-4">
      {score && (
        <div className="flex items-center space-x-3 sm:space-x-4">
          <div className="relative w-16 h-16 sm:w-24 sm:h-24">
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xl sm:text-2xl font-bold">{score}%</span>
            </div>
            <svg className="w-16 h-16 sm:w-24 sm:h-24" viewBox="0 0 100 100">
              <circle
                className="text-gray-200 dark:text-gray-700"
                strokeWidth="10"
                stroke="currentColor"
                fill="transparent"
                r="40"
                cx="50"
                cy="50"
              />
              <circle
                className="text-teal-600 dark:text-teal-400"
                strokeWidth="10"
                strokeDasharray={`${score * 2.51} 251`}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
                r="40"
                cx="50"
                cy="50"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-semibold">Role Relevance</h3>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">How well your profile matches the role</p>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {strengths.length > 0 && (
          <div className="bg-teal-50 dark:bg-teal-900/20 p-3 sm:p-4 rounded-lg">
            <h3 className="text-base sm:text-lg font-semibold text-teal-700 dark:text-teal-400 mb-1 sm:mb-2">Strengths</h3>
            <ul className="list-disc pl-4 sm:pl-5 space-y-0.5 sm:space-y-1 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
              {strengths.map((strength, i) => (
                <li key={i}>{strength}</li>
              ))}
            </ul>
          </div>
        )}
        
        {improvements.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/20 p-3 sm:p-4 rounded-lg">
            <h3 className="text-base sm:text-lg font-semibold text-amber-700 dark:text-amber-400 mb-1 sm:mb-2">Areas for Improvement</h3>
            <ul className="list-disc pl-4 sm:pl-5 space-y-0.5 sm:space-y-1 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
              {improvements.map((improvement, i) => (
                <li key={i}>{improvement}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
      
      {justification && (
        <div className="bg-gray-50 dark:bg-gray-800/50 p-3 sm:p-4 rounded-lg">
          <h3 className="text-base sm:text-lg font-semibold mb-1 sm:mb-2">Analysis</h3>
          <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">{justification}</p>
        </div>
      )}
      
      {/* Raw report fallback */}
      {!score && !strengths.length && !improvements.length && (
        <pre className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 sm:p-4 text-xs sm:text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap overflow-x-auto">{report}</pre>
      )}
    </div>
  );
  } catch (error) {
    console.error('Error parsing role relevance report:', error);
    return (
      <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg text-red-800 dark:text-red-200">
        <h3 className="text-lg font-semibold mb-2">Error Displaying Report</h3>
        <p>There was an error parsing the role relevance report. Please try again or contact support.</p>
        <pre className="mt-2 p-2 bg-red-100 dark:bg-red-800/30 rounded text-xs overflow-auto">{report}</pre>
      </div>
    );
  }
}

function ATSReportDisplay({ report, type }) {
  try {
    // Try to parse the report for structured display
    let score = null, strengths = [], improvements = [], justification = '';
    
    // Try to extract info from the report string
    if (typeof report === 'string') {
      // Score
      const scoreMatch = report.match(/ats score:?\s*(\d{1,3})/i);
      score = scoreMatch ? scoreMatch[1] : null;
      
      // Strengths
      const strengthsMatch = report.match(/strengths:?\s*([\s\S]*?)\n(?:areas for improvement|$)/i);
      if (strengthsMatch) {
        strengths = strengthsMatch[1].split(/\n/).map(s => s.trim()).filter(Boolean);
      }
      
      // Areas for improvement
      const improvementsMatch = report.match(/areas for improvement:?\s*([\s\S]*?)\n(?:justification|$)/i);
      if (improvementsMatch) {
        improvements = improvementsMatch[1].split(/\n/).map(s => s.trim()).filter(Boolean);
      }
      
      // Justification
      const justificationMatch = report.match(/justification:?\s*([\s\S]*)/i);
      if (justificationMatch) {
        justification = justificationMatch[1].trim();
      }
    }
  
  return (
    <div className="space-y-3 sm:space-y-4">
      {score && (
        <div className="flex items-center space-x-3 sm:space-x-4">
          <div className="relative w-16 h-16 sm:w-24 sm:h-24">
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xl sm:text-2xl font-bold">{score}/100</span>
            </div>
            <svg className="w-16 h-16 sm:w-24 sm:h-24" viewBox="0 0 100 100">
              <circle
                className="text-gray-200 dark:text-gray-700"
                strokeWidth="10"
                stroke="currentColor"
                fill="transparent"
                r="40"
                cx="50"
                cy="50"
              />
              <circle
                className="text-purple-600 dark:text-purple-400"
                strokeWidth="10"
                strokeDasharray={`${score * 2.51} 251`}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
                r="40"
                cx="50"
                cy="50"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-semibold">
              {type === 'projects' ? 'Projects Section ATS Score' : 'Work Experience ATS Score'}
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">How well your resume passes ATS systems</p>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {strengths.length > 0 && (
          <div className="bg-green-50 dark:bg-green-900/20 p-3 sm:p-4 rounded-lg">
            <h3 className="text-base sm:text-lg font-semibold text-green-700 dark:text-green-400 mb-1 sm:mb-2">Strengths</h3>
            <ul className="list-disc pl-4 sm:pl-5 space-y-0.5 sm:space-y-1 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
              {strengths.map((strength, i) => (
                <li key={i}>{strength}</li>
              ))}
            </ul>
          </div>
        )}
        
        {improvements.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/20 p-3 sm:p-4 rounded-lg">
            <h3 className="text-base sm:text-lg font-semibold text-amber-700 dark:text-amber-400 mb-1 sm:mb-2">Areas for Improvement</h3>
            <ul className="list-disc pl-4 sm:pl-5 space-y-0.5 sm:space-y-1 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
              {improvements.map((improvement, i) => (
                <li key={i}>{improvement}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
      
      {justification && (
        <div className="bg-gray-50 dark:bg-gray-800/50 p-3 sm:p-4 rounded-lg">
          <h3 className="text-base sm:text-lg font-semibold mb-1 sm:mb-2">Analysis</h3>
          <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">{justification}</p>
        </div>
      )}
      
      {/* Raw report fallback */}
      {!score && !strengths.length && !improvements.length && (
        <pre className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 sm:p-4 text-xs sm:text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap overflow-x-auto">{report}</pre>
      )}
    </div>
  );
  } catch (error) {
    console.error('Error parsing ATS report:', error);
    return (
      <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg text-red-800 dark:text-red-200">
        <h3 className="text-lg font-semibold mb-2">Error Displaying Report</h3>
        <p>There was an error parsing the ATS report. Please try again or contact support.</p>
        <pre className="mt-2 p-2 bg-red-100 dark:bg-red-800/30 rounded text-xs overflow-auto">{report}</pre>
      </div>
    );
  }
}

export default function UploadResume() {
  const navigate = useNavigate();

  // State for form fields
  const [resumeText, setResumeText] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [currentRole, setCurrentRole] = useState('');
  const [industry, setIndustry] = useState('');
  const [experience, setExperience] = useState('');
  const [keywords, setKeywords] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [careerGoal, setCareerGoal] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [resumeFile, setResumeFile] = useState(null);
  const [matchReport, setMatchReport] = useState(null);
  const [skillsUsed, setSkillsUsed] = useState([]);
  const [jdMode, setJdMode] = useState('paste'); // 'paste' or 'generate'
  const [genRole, setGenRole] = useState('');
  const [genExperience, setGenExperience] = useState('');
  const [genCompany, setGenCompany] = useState('');
  const [activeReport, setActiveReport] = useState('skill'); // 'skill' or 'role' or 'projects' or 'workexp'
  const [roleReport, setRoleReport] = useState(null);
  const [suggestions, setSuggestions] = useState('');
  const [projectsAnalysis, setProjectsAnalysis] = useState(null);
  const [isProjectsLoading, setIsProjectsLoading] = useState(false);
  const [workExpAnalysis, setWorkExpAnalysis] = useState(null);
  const [isWorkExpLoading, setIsWorkExpLoading] = useState(false);
  
  // Loading overlay component
  const LoadingOverlay = () => (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl max-w-md w-full text-center">
        <div className="w-16 h-16 border-4 border-t-transparent border-blue-600 rounded-full animate-spin mx-auto mb-6"></div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Analyzing Your Resume</h3>
        <p className="text-gray-600 dark:text-gray-300">
          This may take a few moments.<br />
          Feel free to close the application — we'll email your personalized Resume Analysis Report shortly!
        </p>
      </div>
    </div>
  );
  
  const INDUSTRIES = [
    'Software', 'Finance', 'Healthcare', 'Education', 'Marketing', 'Sales', 'Engineering', 'Other'
  ];
  const EXPERIENCE_LEVELS = [
    '0-1 years',
    '1-3 years',
    '3-5 years',
    '5-8 years',
    '8-12 years',
    '12+ years'
  ];

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    setResumeFile(file || null);
    if (!file) return;
    if (file.type === 'text/plain') {
      const reader = new FileReader();
      reader.onload = (event) => setResumeText(event.target.result);
      reader.readAsText(file);
    } else {
      setResumeText('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsProcessing(true);
    setMatchReport(null);
    setSkillsUsed([]);
    setRoleReport(null);
    setActiveReport('skill');
    setSuggestions('');
    setProjectsAnalysis(null);
    setIsProjectsLoading(false);
    setWorkExpAnalysis(null);
    setIsWorkExpLoading(false);
    try {
      let formData = new FormData();
      // Prefer file upload if present, else use pasted text
      if (resumeFile) {
        formData.append('resume', resumeFile);
      } else if (resumeText.trim()) {
        // Convert pasted text to a Blob and append as a file
        const textBlob = new Blob([resumeText], { type: 'text/plain' });
        formData.append('resume', textBlob, 'resume.txt');
      } else {
        setError('Please upload a resume file or paste your resume text.');
        setIsProcessing(false);
        return;
      }
      let finalJobDescription = jobDescription;
      let targetRoleForPrompt = targetRole;
      if (jdMode === 'generate') {
        if (!genRole.trim() || !genExperience.trim()) {
          setError('Role and experience are required to generate a job description.');
          setIsProcessing(false);
          return;
        }
        finalJobDescription = await generateJobDescription({
          experience: genExperience,
          role: genRole,
          company: genCompany
        });
        targetRoleForPrompt = genRole;
      }
      else {
        if (!jobDescription.trim()) {
          setError('Job description is required.');
          setIsProcessing(false);
          return;
        }
        if (!targetRole.trim()) {
          setError('Target Job Title / Role is required.');
          setIsProcessing(false);
          return;
        }
      }
      if (!currentRole.trim()) {
        setError('Current/Most Recent Job Title is required.');
        setIsProcessing(false);
        return;
      }
      formData.append('jobDescription', finalJobDescription);
      // Call backend for skill match
      const result = await matchResumeSkills(formData);
      setSkillsUsed(result.skills || []);
      setMatchReport(result.matchReport || 'No report returned.');
      setSuggestions(result.suggestions || '');
      // Call backend for role relevance
      const roleReportResult = await getRoleRelevanceReport({ currentRole, targetRole: targetRoleForPrompt });
      setRoleReport(roleReportResult);
      // Call backend for projects ATS analysis
      setIsProjectsLoading(true);
      try {
        const projectsResult = await analyzeProjects(formData);
        setProjectsAnalysis(projectsResult);
      } catch (projErr) {
        setProjectsAnalysis({ error: projErr.message });
      } finally {
        setIsProjectsLoading(false);
      }
      // Call backend for work experience ATS analysis
      setIsWorkExpLoading(true);
      try {
        const workExpResult = await analyzeWorkExperience(formData);
        setWorkExpAnalysis(workExpResult);
      } catch (workExpErr) {
        setWorkExpAnalysis({ error: workExpErr.message });
      } finally {
        setIsWorkExpLoading(false);
      }
    } catch (err) {
      console.error('Resume analysis error:', err);
      
      // Provide more specific error messages
      let errorMessage = 'An error occurred while analyzing your resume.';
      
      if (err.message.includes('Failed to upload resume')) {
        errorMessage = 'Resume upload failed. Please check your file and try again. If the issue persists, your resume may have been uploaded successfully - please refresh the page to check.';
      } else if (err.message.includes('network') || err.message.includes('fetch')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (err.message.includes('timeout')) {
        errorMessage = 'Request timed out. Please try again with a smaller file or better connection.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-black text-white p-2 sm:p-4 lg:p-8">
      {/* Navbar at the very top */}
      <Navigation showBack={true} />
      
      {/* Loading Overlay */}
      {isProcessing && <LoadingOverlay />}
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center w-full mt-16 sm:mt-6">
        <div className="w-full max-w-4xl mx-auto px-2 sm:px-6 lg:px-8 py-4 sm:py-8 mt-4 sm:mt-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Resume Upload */}
            <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-gray-200 dark:border-gray-700 p-3 sm:p-6">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white text-lg sm:text-xl">Resume Upload</CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-300 text-xs sm:text-sm">
                  Upload your resume file (.txt recommended) or paste the text directly
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                <div>
                  <Label htmlFor="resume-file" className="text-gray-700 dark:text-gray-200 text-sm sm:text-base">Upload Resume File</Label>
                  <Input
                    id="resume-file"
                    type="file"
                    accept=".txt,.doc,.docx,.pdf"
                    onChange={handleFileUpload}
                    className="mt-1 bg-white/70 dark:bg-gray-700/70 border-gray-200 dark:border-gray-600"
                  />
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Supported formats: .txt (recommended), .doc, .docx, .pdf
                  </p>
                </div>
                <div className="text-center text-gray-500 dark:text-gray-400 font-medium text-sm sm:text-base">OR</div>
                <div>
                  <Label htmlFor="resume-text" className="text-gray-700 dark:text-gray-200 text-sm sm:text-base">Paste Resume Text</Label>
                  <Textarea
                    id="resume-text"
                    value={resumeText}
                    onChange={(e) => setResumeText(e.target.value)}
                    placeholder="Paste your complete resume text here..."
                    className="mt-1 min-h-[150px] sm:min-h-[200px] bg-white/70 dark:bg-gray-700/70 border-gray-200 dark:border-gray-600 text-sm sm:text-base"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Required Information */}
            <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-gray-200 dark:border-gray-700 p-3 sm:p-6">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white text-lg sm:text-xl">Required Information</CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-300 text-xs sm:text-sm">Essential details for analysis</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="current-role" className="text-gray-700 dark:text-gray-200 text-sm sm:text-base">Current/Most Recent Job Title *</Label>
                  <Input
                    id="current-role"
                    value={currentRole}
                    onChange={(e) => setCurrentRole(e.target.value)}
                    placeholder="Your current position"
                    required
                    className="bg-white/70 dark:bg-gray-700/70 border-gray-200 dark:border-gray-600"
                  />
                </div>
                {/* Job Description Input Mode Toggle */}
                <div className="flex flex-col xs:flex-row items-start xs:items-center gap-2 xs:gap-4 mb-2">
                  <label className="flex items-center gap-2 text-sm sm:text-base">
                    <input type="radio" name="jdMode" value="paste" checked={jdMode === 'paste'} onChange={() => setJdMode('paste')} />
                    <span>Paste Job Description</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm sm:text-base">
                    <input type="radio" name="jdMode" value="generate" checked={jdMode === 'generate'} onChange={() => setJdMode('generate')} />
                    <span>Generate from Details</span>
                  </label>
                </div>
                {/* Paste JD */}
                {jdMode === 'paste' && (
                  <div>
                    <Label htmlFor="job-description" className="text-gray-700 dark:text-gray-200 text-sm sm:text-base">Job Description (Full Text)</Label>
                    <Textarea
                      id="job-description"
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      placeholder="Paste the complete job description for better keyword alignment..."
                      className="min-h-[80px] sm:min-h-[100px] bg-white/70 dark:bg-gray-700/70 border-gray-200 dark:border-gray-600 text-sm sm:text-base"
                    />
                  </div>
                )}
                {/* Generate JD */}
                {jdMode === 'generate' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <Label htmlFor="gen-experience" className="text-gray-700 dark:text-gray-200 text-sm sm:text-base">Experience Level *</Label>
                      <Select id="gen-experience" value={genExperience} onChange={setGenExperience} className="bg-white/70 dark:bg-gray-700/70 border-gray-200 dark:border-gray-600">
                        <option value="">Select experience level</option>
                        {EXPERIENCE_LEVELS.map((exp) => (
                          <option key={exp} value={exp}>{exp}</option>
                        ))}
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="gen-role" className="text-gray-700 dark:text-gray-200">Target Role *</Label>
                      <Input
                        id="gen-role"
                        value={genRole}
                        onChange={(e) => setGenRole(e.target.value)}
                        placeholder="e.g., Software Engineer, Marketing Manager"
                        className="bg-white/70 dark:bg-gray-700/70 border-gray-200 dark:border-gray-600"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="gen-company" className="text-gray-700 dark:text-gray-200">Target Company (Optional)</Label>
                      <Input
                        id="gen-company"
                        value={genCompany}
                        onChange={(e) => setGenCompany(e.target.value)}
                        placeholder="e.g., Google, Microsoft"
                        className="bg-white/70 dark:bg-gray-700/70 border-gray-200 dark:border-gray-600"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {error && (
              <Alert variant="destructive" className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                <AlertDescription className="text-red-800 dark:text-red-200">{error}</AlertDescription>
              </Alert>
            )}
            
            {(matchReport || roleReport || projectsAnalysis || workExpAnalysis) && (
              <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-gray-200 dark:border-gray-700 mt-8 animate-fade-in">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex flex-wrap gap-1 xs:gap-2">
                    <button
                      className={`px-2 sm:px-4 py-1 sm:py-2 rounded-lg font-semibold transition-all duration-200 text-xs sm:text-sm ${activeReport === 'skill' ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`}
                      onClick={() => setActiveReport('skill')}
                      disabled={activeReport === 'skill'}
                    >
                      Skill Match
                    </button>
                    <button
                      className={`px-2 sm:px-4 py-1 sm:py-2 rounded-lg font-semibold transition-all duration-200 text-xs sm:text-sm ${activeReport === 'role' ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`}
                      onClick={() => setActiveReport('role')}
                      disabled={activeReport === 'role'}
                    >
                      Role Relevance
                    </button>
                    <button
                      className={`px-2 sm:px-4 py-1 sm:py-2 rounded-lg font-semibold transition-all duration-200 text-xs sm:text-sm ${activeReport === 'projects' ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`}
                      onClick={() => setActiveReport('projects')}
                      disabled={activeReport === 'projects'}
                    >
                      Projects ATS Analysis
                    </button>
                    <button
                      className={`px-2 sm:px-4 py-1 sm:py-2 rounded-lg font-semibold transition-all duration-200 text-xs sm:text-sm ${activeReport === 'workexp' ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`}
                      onClick={() => setActiveReport('workexp')}
                      disabled={activeReport === 'workexp'}
                    >
                      Work Experience ATS Analysis
                    </button>
                  </div>
                </div>
                <CardHeader>
                  <CardTitle className="text-xl sm:text-2xl font-bold text-purple-700 dark:text-purple-300 mb-2">
                    {activeReport === 'skill' ? 'Skill Match' : activeReport === 'role' ? 'Role Relevance' : activeReport === 'projects' ? 'Projects ATS Analysis' : 'Work Experience ATS Analysis'}
                  </CardTitle>
                  <CardDescription className="text-gray-700 dark:text-gray-300 text-xs sm:text-sm">
                    {activeReport === 'skill' ? 'AI-powered skill match analysis' : activeReport === 'role' ? 'AI-powered role relevance analysis' : activeReport === 'projects' ? 'AI-powered ATS optimization for your projects section' : 'AI-powered ATS optimization for your work experience section'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {activeReport === 'skill' && matchReport && (
                    <>
                      <SkillMatchReportDisplay report={matchReport} skills={skillsUsed} />
                      {suggestions && (
                        <div className="mt-6">
                          <div className="font-semibold text-blue-700 dark:text-blue-300 mb-1">Suggestions to Improve Skill Match</div>
                          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-blue-900 dark:text-blue-100 whitespace-pre-line text-base">
                            {suggestions}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  {activeReport === 'role' && roleReport && (
                    <RoleRelevanceReportDisplay report={roleReport} />
                  )}
                  {activeReport === 'projects' && (
                    <div>
                      {isProjectsLoading ? (
                        <div className="flex items-center space-x-2 text-blue-700 dark:text-blue-300">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700 dark:border-blue-300"></div>
                          <span>Analyzing Projects Section...</span>
                        </div>
                      ) : projectsAnalysis && projectsAnalysis.atsAnalysis ? (
                        <div>
                          <div className="font-semibold text-blue-700 dark:text-blue-300 mb-1">Projects ATS Analysis</div>
                          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-blue-900 dark:text-blue-100 whitespace-pre-line text-base">
                            {projectsAnalysis.atsAnalysis}
                          </div>
                        </div>
                      ) : projectsAnalysis && projectsAnalysis.error ? (
                        <div className="text-red-600 dark:text-red-300">{projectsAnalysis.error}</div>
                      ) : (
                        <div className="text-gray-500 dark:text-gray-400">No projects analysis available.</div>
                      )}
                    </div>
                  )}
                  {activeReport === 'workexp' && (
                    <div>
                      {isWorkExpLoading ? (
                        <div className="flex items-center space-x-2 text-blue-700 dark:text-blue-300">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700 dark:border-blue-300"></div>
                          <span>Analyzing Work Experience Section...</span>
                        </div>
                      ) : workExpAnalysis && workExpAnalysis.atsAnalysis ? (
                        <div>
                          <div className="font-semibold text-blue-700 dark:text-blue-300 mb-1">Work Experience ATS Analysis</div>
                          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-blue-900 dark:text-blue-100 whitespace-pre-line text-base">
                            {workExpAnalysis.atsAnalysis}
                          </div>
                        </div>
                      ) : workExpAnalysis && workExpAnalysis.error ? (
                        <div className="text-red-600 dark:text-red-300">{workExpAnalysis.error}</div>
                      ) : (
                        <div className="text-gray-500 dark:text-gray-400">No work experience analysis available.</div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
            
            <div className="flex justify-end space-x-2 sm:space-x-4">
              <Button 
                type="button" 
                onClick={() => {
                  // Reset analysis state without navigating away
                  setIsProcessing(false);
                  setMatchReport(null);
                  setSkillsUsed([]);
                  setRoleReport(null);
                  setActiveReport('skill');
                  setSuggestions('');
                  setProjectsAnalysis(null);
                  setIsProjectsLoading(false);
                  setWorkExpAnalysis(null);
                  setIsWorkExpLoading(false);
                  setError('');
                }} 
                className="bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-xs sm:text-sm px-3 sm:px-4 py-1 sm:py-2"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs sm:text-sm px-3 sm:px-4 py-1 sm:py-2"
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white"></div>
                    <span>Analyzing Resume...</span>
                  </div>
                ) : (
                  'Analyze Resume'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
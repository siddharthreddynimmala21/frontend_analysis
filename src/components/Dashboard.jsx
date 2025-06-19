import { motion } from 'framer-motion';
import { MessageSquare, FileText, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navigation from './common/Navigation';
import React, { useState } from 'react';
import { matchResumeSkills, generateJobDescription, getRoleRelevanceReport, analyzeProjects, analyzeWorkExperience } from '../services/api';

// Minimal UI components (move outside Dashboard)
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

function SkillMatchReportDisplay({ report, skills }) {
  // Try to parse the report for structured display
  let match = null, matchingSkills = [], missingSkills = [], justification = '', percent = null;
  // Try to extract info from the report string
  if (typeof report === 'string') {
    // Match percentage
    const percentMatch = report.match(/(\d{1,3})\s*%|score out of 100:?\s*(\d{1,3})/i);
    percent = percentMatch ? (percentMatch[1] || percentMatch[2]) : null;
    // Matching skills
    const matchSkillsMatch = report.match(/matching skills:?\s*([\s\S]*?)\n(?:missing skills|$)/i);
    if (matchSkillsMatch) {
      matchingSkills = matchSkillsMatch[1].split(/,|\n/).map(s => s.trim()).filter(Boolean);
    }
    // Missing skills
    const missingSkillsMatch = report.match(/missing skills:?\s*([\s\S]*?)\n(?:justification|$)/i);
    if (missingSkillsMatch) {
      missingSkills = missingSkillsMatch[1].split(/,|\n/).map(s => s.trim()).filter(Boolean);
    }
    // Justification
    const justificationMatch = report.match(/justification:?\s*([\s\S]*)/i);
    if (justificationMatch) {
      justification = justificationMatch[1].split('\n')[0].trim();
    }
  }
  return (
    <div className="space-y-4">
      {percent && (
        <div className="flex items-center space-x-4">
          <span className="text-4xl font-extrabold text-purple-600 dark:text-purple-300">{percent}%</span>
          <span className="text-lg font-medium text-gray-700 dark:text-gray-300">Skill Match</span>
        </div>
      )}
      {matchingSkills.length > 0 && (
        <div>
          <div className="font-semibold text-green-700 dark:text-green-300 mb-1">Matching Skills</div>
          <div className="flex flex-wrap gap-2">
            {matchingSkills.map((skill, i) => (
              <span key={i} className="bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 px-3 py-1 rounded-full text-sm border border-green-400/30">{skill}</span>
            ))}
          </div>
        </div>
      )}
      {missingSkills.length > 0 && (
        <div>
          <div className="font-semibold text-red-700 dark:text-red-300 mb-1">Missing Skills</div>
          <div className="flex flex-wrap gap-2">
            {missingSkills.map((skill, i) => (
              <span key={i} className="bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 px-3 py-1 rounded-full text-sm border border-red-400/30">{skill}</span>
            ))}
          </div>
        </div>
      )}
      {justification && (
        <div className="italic text-gray-700 dark:text-gray-300">{justification}</div>
      )}
      {/* Raw report fallback */}
      {!percent && !matchingSkills.length && !missingSkills.length && (
        <pre className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-gray-800 dark:text-gray-200 text-sm whitespace-pre-wrap">{report}</pre>
      )}
    </div>
  );
}

function RoleRelevanceReportDisplay({ report }) {
  // Try to parse the report for structured display
  let percent = null, overlaps = [], gaps = [], justification = '';
  if (typeof report === 'string') {
    // Score
    const percentMatch = report.match(/(\d{1,3})\s*%|score out of 100:?\s*(\d{1,3})/i);
    percent = percentMatch ? (percentMatch[1] || percentMatch[2]) : null;
    // Overlaps
    const overlapMatch = report.match(/overlapping responsibilities or focus areas:?\s*([\s\S]*?)\n(?:gaps|mismatches|$)/i);
    if (overlapMatch) {
      overlaps = overlapMatch[1].split(/,|\n/).map(s => s.trim()).filter(Boolean);
    }
    // Gaps
    const gapsMatch = report.match(/gaps or mismatches:?\s*([\s\S]*?)\n(?:justification|$)/i);
    if (gapsMatch) {
      gaps = gapsMatch[1].split(/,|\n/).map(s => s.trim()).filter(Boolean);
    }
    // Justification
    const justificationMatch = report.match(/justification:?\s*([\s\S]*)/i);
    if (justificationMatch) {
      justification = justificationMatch[1].split('\n')[0].trim();
    }
  }
  return (
    <div className="space-y-4">
      {percent && (
        <div className="flex items-center space-x-4">
          <span className="text-4xl font-extrabold text-purple-600 dark:text-purple-300">{percent}%</span>
          <span className="text-lg font-medium text-gray-700 dark:text-gray-300">Role Relevance</span>
        </div>
      )}
      {overlaps.length > 0 && (
        <div>
          <div className="font-semibold text-green-700 dark:text-green-300 mb-1">Overlapping Responsibilities / Focus Areas</div>
          <div className="flex flex-wrap gap-2">
            {overlaps.map((item, i) => (
              <span key={i} className="bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 px-3 py-1 rounded-full text-sm border border-green-400/30">{item}</span>
            ))}
          </div>
        </div>
      )}
      {gaps.length > 0 && (
        <div>
          <div className="font-semibold text-red-700 dark:text-red-300 mb-1">Gaps / Mismatches</div>
          <div className="flex flex-wrap gap-2">
            {gaps.map((item, i) => (
              <span key={i} className="bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 px-3 py-1 rounded-full text-sm border border-red-400/30">{item}</span>
            ))}
          </div>
        </div>
      )}
      {justification && (
        <div className="italic text-gray-700 dark:text-gray-300">{justification}</div>
      )}
      {/* Raw report fallback */}
      {!percent && !overlaps.length && !gaps.length && (
        <pre className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-gray-800 dark:text-gray-200 text-sm whitespace-pre-wrap">{report}</pre>
      )}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [showAIResumeForm, setShowAIResumeForm] = useState(false);

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
      setError(err.message || 'An error occurred while analyzing your resume.');
    } finally {
      setIsProcessing(false);
    }
  };

  const onBack = () => setShowAIResumeForm(false);

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
      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center w-full mt-6">
        {!showAIResumeForm ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {/* AI Chat Option */}
            <motion.div
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/30 dark:border-gray-700/50 p-8 transition-all duration-300 cursor-pointer flex flex-col items-center text-center"
              onClick={() => navigate('/chat')}
            >
              <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-6 shadow-lg">
                <MessageSquare className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-white bg-clip-text text-transparent mb-2">AI Chat</h2>
              <p className="text-gray-600 dark:text-gray-300 text-base">
                Chat with our AI assistant to get help with your questions and tasks.
              </p>
            </motion.div>

            {/* Resume Analysis Option */}
            <motion.div
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/30 dark:border-gray-700/50 p-8 transition-all duration-300 cursor-pointer flex flex-col items-center text-center"
              onClick={() => navigate('/resume-analysis', { state: { analysisType: 'text' } })}
            >
              <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-6 shadow-lg">
                <FileText className="w-10 h-10 text-white" />
                </div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-white bg-clip-text text-transparent mb-2">Resume Analysis</h2>
              <p className="text-gray-600 dark:text-gray-300 text-base">
                  Upload your resume for AI-powered analysis and personalized feedback.
                </p>
            </motion.div>

            {/* AI Resume Analysis Option */}
            <motion.div
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/30 dark:border-gray-700/50 p-8 transition-all duration-300 cursor-pointer flex flex-col items-center text-center"
              onClick={() => setShowAIResumeForm(true)}
            >
              <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-6 shadow-lg">
                <Briefcase className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-white bg-clip-text text-transparent mb-2">AI Resume Analysis</h2>
              <p className="text-gray-600 dark:text-gray-300 text-base">
                Get a structured, AI-powered breakdown of your resume's work experience, education, and skills.
              </p>
            </motion.div>
          </div>
        ) : (
          <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Resume Upload */}
              <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-gray-200 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="text-gray-900 dark:text-white">Resume Upload</CardTitle>
                  <CardDescription className="text-gray-600 dark:text-gray-300">
                    Upload your resume file (.txt recommended) or paste the text directly
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="resume-file" className="text-gray-700 dark:text-gray-200">Upload Resume File</Label>
                    <Input
                      id="resume-file"
                      type="file"
                      accept=".txt,.doc,.docx,.pdf"
                      onChange={handleFileUpload}
                      className="mt-1 bg-white/70 dark:bg-gray-700/70 border-gray-200 dark:border-gray-600"
                    />
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Supported formats: .txt (recommended), .doc, .docx, .pdf
                    </p>
                  </div>
                  <div className="text-center text-gray-500 dark:text-gray-400 font-medium">OR</div>
                  <div>
                    <Label htmlFor="resume-text" className="text-gray-700 dark:text-gray-200">Paste Resume Text</Label>
                    <Textarea
                      id="resume-text"
                      value={resumeText}
                      onChange={(e) => setResumeText(e.target.value)}
                      placeholder="Paste your complete resume text here..."
                      className="mt-1 min-h-[200px] bg-white/70 dark:bg-gray-700/70 border-gray-200 dark:border-gray-600"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Required Information */}
              <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-gray-200 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="text-gray-900 dark:text-white">Required Information</CardTitle>
                  <CardDescription className="text-gray-600 dark:text-gray-300">Essential details for analysis</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="current-role" className="text-gray-700 dark:text-gray-200">Current/Most Recent Job Title *</Label>
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
                  <div className="flex items-center gap-4 mb-2">
                    <label className="flex items-center gap-2">
                      <input type="radio" name="jdMode" value="paste" checked={jdMode === 'paste'} onChange={() => setJdMode('paste')} />
                      <span>Paste Job Description</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="radio" name="jdMode" value="generate" checked={jdMode === 'generate'} onChange={() => setJdMode('generate')} />
                      <span>Generate from Details</span>
                    </label>
                  </div>
                  {/* Paste JD */}
                  {jdMode === 'paste' && (
                    <div>
                      <Label htmlFor="job-description" className="text-gray-700 dark:text-gray-200">Job Description (Full Text)</Label>
                      <Textarea
                        id="job-description"
                        value={jobDescription}
                        onChange={(e) => setJobDescription(e.target.value)}
                        placeholder="Paste the complete job description for better keyword alignment..."
                        className="min-h-[100px] bg-white/70 dark:bg-gray-700/70 border-gray-200 dark:border-gray-600"
                      />
                    </div>
                  )}
                  {/* Generate JD */}
                  {jdMode === 'generate' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="gen-experience" className="text-gray-700 dark:text-gray-200">Experience Level *</Label>
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
                        <Label htmlFor="gen-company" className="text-gray-700 dark:text-gray-200">Taraget Company (Optional)</Label>
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

              {/* Optional Information */}
              {/*
              <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-gray-200 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="text-gray-900 dark:text-white">Additional Information (Optional)</CardTitle>
                  <CardDescription className="text-gray-600 dark:text-gray-300">Help us provide more targeted suggestions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="career-goal" className="text-gray-700 dark:text-gray-200">3-5 Year Career Goal</Label>
                    <Input
                      id="career-goal"
                      value={careerGoal}
                      onChange={(e) => setCareerGoal(e.target.value)}
                      placeholder="e.g., Senior Software Architect, VP of Marketing"
                      className="bg-white/70 dark:bg-gray-700/70 border-gray-200 dark:border-gray-600"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="linkedin" className="text-gray-700 dark:text-gray-200">LinkedIn Profile URL</Label>
                      <Input
                        id="linkedin"
                        type="url"
                        value={linkedinUrl}
                        onChange={(e) => setLinkedinUrl(e.target.value)}
                        placeholder="https://linkedin.com/in/yourprofile"
                        className="bg-white/70 dark:bg-gray-700/70 border-gray-200 dark:border-gray-600"
                      />
                    </div>
                    <div>
                      <Label htmlFor="github" className="text-gray-700 dark:text-gray-200">GitHub Profile URL</Label>
                      <Input
                        id="github"
                        type="url"
                        value={githubUrl}
                        onChange={(e) => setGithubUrl(e.target.value)}
                        placeholder="https://github.com/yourusername"
                        className="bg-white/70 dark:bg-gray-700/70 border-gray-200 dark:border-gray-600"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
              */}
              {error && (
                <Alert variant="destructive" className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                  <AlertDescription className="text-red-800 dark:text-red-200">{error}</AlertDescription>
                </Alert>
              )}
              {(matchReport || roleReport || projectsAnalysis || workExpAnalysis) && (
                <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-gray-200 dark:border-gray-700 mt-8 animate-fade-in">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex gap-2">
                      <button
                        className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${activeReport === 'skill' ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`}
                        onClick={() => setActiveReport('skill')}
                        disabled={activeReport === 'skill'}
                      >
                        Skill Match
                      </button>
                      <button
                        className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${activeReport === 'role' ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`}
                        onClick={() => setActiveReport('role')}
                        disabled={activeReport === 'role'}
                      >
                        Role Relevance
                      </button>
                      <button
                        className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${activeReport === 'projects' ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`}
                        onClick={() => setActiveReport('projects')}
                        disabled={activeReport === 'projects'}
                      >
                        Projects ATS Analysis
                      </button>
                      <button
                        className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${activeReport === 'workexp' ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`}
                        onClick={() => setActiveReport('workexp')}
                        disabled={activeReport === 'workexp'}
                      >
                        Work Experience ATS Analysis
                      </button>
                    </div>
                  </div>
                  <CardHeader>
                    <CardTitle className="text-2xl font-bold text-purple-700 dark:text-purple-300 mb-2">
                      {activeReport === 'skill' ? 'Skill Match' : activeReport === 'role' ? 'Role Relevance' : activeReport === 'projects' ? 'Projects ATS Analysis' : 'Work Experience ATS Analysis'}
                    </CardTitle>
                    <CardDescription className="text-gray-700 dark:text-gray-300">
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
              <div className="flex justify-end space-x-4">
                <Button type="button" onClick={onBack} className="bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Analyzing Resume...</span>
                    </div>
                  ) : (
                    'Analyze Resume'
                  )}
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
} 
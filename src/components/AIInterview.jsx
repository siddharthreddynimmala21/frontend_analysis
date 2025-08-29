import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { FileText, Upload, Wand2, Brain } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../services/api';
import ConfirmationDialog from './common/ConfirmationDialog';

export default function AIInterview() {
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
  // Single-question pagination state
  const [flatQuestions, setFlatQuestions] = useState([]); // [{ type: 'mcq'|'desc', q, idx }]
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  // Navigation protection during exam
  const [protectNavigation, setProtectNavigation] = useState(false);
  // Two-step flow: setup view -> exam view
  const [inExamMode, setInExamMode] = useState(false);

  // Per-question countdown timer
  const [timeLeft, setTimeLeft] = useState(null); // seconds
  const timerRef = useRef(null);
  const [disabledQuestions, setDisabledQuestions] = useState(new Set()); // set of flat index numbers that are expired/locked
  const autoAdvanceRef = useRef(false);
  const [questionTimers, setQuestionTimers] = useState({}); // key: flat index -> seconds remaining
  // Auto-focus ref for descriptive answer textarea
  const descTextareaRef = useRef(null);
  // Sidebar logout confirmation (only for setup/details view)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Session ID Management:
  // - Round 1: Generate new session ID (backend creates new interview)
  // - Rounds 2-4: Reuse existing session ID (backend adds rounds to existing interview)
  // - New Interview: Reset session ID to null (forces new session creation)

  // Debug session ID changes

  // Format seconds to MM:SS
  const formatTime = (secs) => {
    if (secs == null || Number.isNaN(secs)) return '--:--';
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, '0');
    const s = Math.floor(secs % 60)
      .toString()
      .padStart(2, '0');
    return `${m}:${s}`;
  };

  // Build a full styled HTML for the report (inline CSS for fidelity)
  const buildReportHTML = (validationData, meta = {}) => {
    const { sessionId: sid = sessionId, round: rnd = currentRound } = meta || {};
    const v = validationData || {};
    const safe = (x) => (x == null ? '' : String(x));
    const mcqRows = (v.mcq?.details || []).map((d, i) => {
      if (d && typeof d === 'object') {
        const letterToIdx = (letter) => {
          if (!letter || typeof letter !== 'string') return -1;
          const L = letter.trim().toUpperCase();
          return L.charCodeAt(0) - 65; // A->0, B->1
        };
        const opts = Array.isArray(d.options) ? d.options : [];
        const ua = safe(d.user_answer);
        const ca = safe(d.correct_answer);
        const uaIdx = letterToIdx(ua);
        const caIdx = letterToIdx(ca);
        const uaText = uaIdx >= 0 && uaIdx < opts.length ? opts[uaIdx] : '';
        const caText = caIdx >= 0 && caIdx < opts.length ? opts[caIdx] : '';
        const isCorrect = Boolean(d.is_correct);
        const qText = safe(d.question);
        const optionList = opts.map((t, k) => `<div class="opt"><span class="key">${String.fromCharCode(65 + k)}.</span> ${safe(t)}</div>`).join('');
        return `
          <tr>
            <td>Q${i + 1}</td>
            <td>
              <div class="q"><strong>Question:</strong> ${qText}</div>
              <div class="options">${optionList}</div>
              <div class="answers">
                <span class="pill ${isCorrect ? 'pass' : 'fail'}" style="margin-right:8px;">${isCorrect ? 'Correct' : 'Incorrect'}</span>
                <div><strong>Your answer:</strong> ${ua ? ua + ' — ' : ''}${safe(uaText)}</div>
                <div><strong>Correct answer:</strong> ${ca ? ca + ' — ' : ''}${safe(caText)}</div>
              </div>
            </td>
          </tr>`;
      }
      return `
        <tr>
          <td>Q${i + 1}</td>
          <td>${safe(d)}</td>
        </tr>`;
    }).join('');

    const descRows = (v.descriptive?.details || []).map((d, i) => {
      if (d && typeof d === 'object') {
        const qText = safe(d.question || d.prompt || '');
        const userAns = safe(d.user_answer || d.answer || '');
        const expected = safe(d.expected_answer || d.model_answer || '');
        const feedback = safe(d.feedback || d.explanation || '');
        const score = (d.score != null ? `Score: ${safe(d.score)}${d.max_score != null ? ' / ' + safe(d.max_score) : ''}` : '');
        const verdict = d.is_correct != null ? (d.is_correct ? 'Correct' : 'Needs Improvement') : '';
        return `
          <tr>
            <td>Q${i + 1}</td>
            <td>
              <div class="q"><strong>Question:</strong> ${qText}</div>
              ${score ? `<div class="muted" style="margin:6px 0;">${score}${verdict ? ' • ' + verdict : ''}</div>` : ''}
              <div style="margin-top:6px;"><strong>Your answer:</strong><div class="code">${userAns || '<span class=\"muted\">N/A</span>'}</div></div>
              ${expected ? `<div style="margin-top:8px;"><strong>Expected/Model answer:</strong><div class="code">${expected}</div></div>` : ''}
              ${feedback ? `<div style="margin-top:8px;"><strong>Feedback:</strong><div>${feedback}</div></div>` : ''}
            </td>
          </tr>`;
      }
      return `
        <tr>
          <td>Q${i + 1}</td>
          <td>${safe(d)}</td>
        </tr>`;
    }).join('');

    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>AI Interview Report</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
      :root { --primary:#2563eb; --bg:#f8fafc; --muted:#64748b; --border:#e2e8f0; }
      html, body { margin:0; padding:0; font-family: Inter, Arial, sans-serif; color:#0f172a; background:#ffffff; }
      .header { background: var(--bg); border-bottom:1px solid var(--border); padding:20px 28px; }
      .header h1 { margin:0; font-size:22px; color:var(--primary); }
      .meta { font-size:12px; color: var(--muted); margin-top:4px; }
      .container { padding:28px; }
      .grid { display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap:16px; }
      .card { border:1px solid var(--border); border-radius:10px; padding:16px; }
      .label { color: var(--muted); font-size:12px; }
      .value { font-weight:700; font-size:18px; margin-top:4px; }
      .section { margin-top:24px; }
      .section h2 { font-size:16px; margin:0 0 8px 0; }
      table { width:100%; border-collapse: collapse; }
      th, td { text-align:left; border-bottom:1px solid var(--border); padding:8px 6px; font-size:13px; vertical-align: top; }
      .muted { color: var(--muted); }
      .pill { display:inline-block; padding:4px 10px; border-radius:999px; font-size:12px; font-weight:600; }
      .pill.pass { background:#dcfce7; color:#166534; }
      .pill.fail { background:#fee2e2; color:#991b1b; }
      .q { margin-bottom:6px; }
      .options { display:grid; grid-template-columns: 1fr 1fr; gap:4px 12px; margin:6px 0 8px; }
      .opt .key { display:inline-block; width:18px; font-weight:600; color:#334155; }
      .answers { margin-top:4px; }
      .code { background:#f8fafc; border:1px solid var(--border); border-radius:6px; padding:8px; white-space:pre-wrap; }
    </style>
  </head>
  <body>
    <div class="header">
      <h1>AI Interview Report</h1>
      <div class="meta">Session: ${safe(sid)} • Round: ${safe(rnd)} • Verdict: <span class="pill ${v.verdict === 'Pass' ? 'pass' : 'fail'}">${safe(v.verdict)}</span></div>
    </div>
    <div class="container">
      <div class="grid">
        <div class="card"><div class="label">Total Score</div><div class="value">${safe(v.total_score)} / ${safe(v.max_possible_score)}</div></div>
        <div class="card"><div class="label">Percentage</div><div class="value">${safe(v.percentage)}%</div></div>
      </div>

      <div class="section">
        <h2>MCQ Section</h2>
        <div class="muted">Score: ${safe(v.mcq?.score)} / ${safe(v.mcq?.max_score)}</div>
        <div style="margin-top:10px;"/>
        <table>
          <thead><tr><th style="width:64px;">Item</th><th>Detail</th></tr></thead>
          <tbody>
            ${mcqRows || '<tr><td colspan="2" class="muted">No details</td></tr>'}
          </tbody>
        </table>
      </div>

      <div class="section">
        <h2>Descriptive Section</h2>
        <div class="muted">Score: ${safe(v.descriptive?.score)} / ${safe(v.descriptive?.max_score)}</div>
        <div style="margin-top:10px;"/>
        <table>
          <thead><tr><th style="width:64px;">Item</th><th>Detail</th></tr></thead>
          <tbody>
            ${descRows || '<tr><td colspan="2" class="muted">No details</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  </body>
</html>`;
  };

  // Send the report HTML to backend for PDF generation + email
  const emailPdfReport = async (html, opts = {}) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/report/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          html,
          subject: opts.subject || 'Your AI Interview Report (PDF)',
          fileName: opts.fileName || 'interview_report.pdf',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to email PDF report');
      toast.success('Report emailed to your registered address');
    } catch (err) {
      console.error('Email PDF report error:', err);
      toast.error(err.message || 'Failed to email report');
    }
  };

  // Reset disabled state and timer when a new exam starts (result.questions changes and we enter exam mode)
  useEffect(() => {
    if (inExamMode && flatQuestions.length > 0) {
      setDisabledQuestions(new Set());
      // Initialize timer for the current question
      autoAdvanceRef.current = false;
      const q = flatQuestions[currentQuestionIndex];
      const defaultDuration = q?.type === 'mcq' ? 30 : 300;
      const init = disabledQuestions.has(currentQuestionIndex) ? 0 : defaultDuration;
      // Only initialize the current question if it has no stored time; do not overwrite existing timers
      setQuestionTimers((prev) => (
        prev && Object.prototype.hasOwnProperty.call(prev, currentQuestionIndex)
          ? prev
          : { ...(prev || {}), [currentQuestionIndex]: init }
      ));
      setTimeLeft((prev) => (prev == null ? init : prev));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inExamMode, result?.questions]);

  // Start/restart timer when question index changes
  useEffect(() => {
    if (!inExamMode || flatQuestions.length === 0) return;
    if (answersSubmitted || isValidating || Boolean(validation)) {
      // Do not start or continue timers after submission/validation
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setTimeLeft(0);
      return;
    }

    // Clear any prior timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    autoAdvanceRef.current = false;
    const q = flatQuestions[currentQuestionIndex];
    if (!q) return;
    const duration = q.type === 'mcq' ? 30 : 300;
    const startFrom = duration; // Always start fresh per requirement
    setTimeLeft(startFrom);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev == null) return prev;
        const next = prev - 1;
        if (next <= 0) {
          // lock this question and auto-advance/submit
          clearInterval(timerRef.current);
          timerRef.current = null;
          if (!disabledQuestions.has(currentQuestionIndex)) {
            setDisabledQuestions((old) => {
              const n = new Set(old);
              n.add(currentQuestionIndex);
              return n;
            });
          }
          if (!autoAdvanceRef.current) {
            autoAdvanceRef.current = true;
            const isLast = currentQuestionIndex >= flatQuestions.length - 1;
            if (isLast) {
              // auto-submit if not already submitted/validating
              if (!isValidating && !answersSubmitted) {
                // brief timeout to allow state updates to flush
                setTimeout(() => {
                  try { submitAndValidate(); } catch (e) { /* no-op */ }
                }, 50);
              }
            } else {
              // go to next question
              setTimeout(() => {
                // save current (0) already saved; navigate
                navigateToIndex(Math.min(flatQuestions.length - 1, currentQuestionIndex + 1));
              }, 10);
            }
          }
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestionIndex, inExamMode, flatQuestions.length]);

  // Auto-focus the textarea when the current question is a descriptive one
  useEffect(() => {
    if (!inExamMode) return;
    const q = flatQuestions[currentQuestionIndex];
    if (!q || q.type !== 'desc') return;
    // Wait for render flush
    const id = setTimeout(() => {
      if (descTextareaRef.current) {
        try {
          descTextareaRef.current.focus();
          const val = descTextareaRef.current.value || '';
          // Place cursor at the end for convenience
          descTextareaRef.current.setSelectionRange(val.length, val.length);
        } catch (_) { /* noop */ }
      }
    }, 0);
    return () => clearTimeout(id);
  }, [currentQuestionIndex, inExamMode, flatQuestions]);

  // Helper to navigate while persisting current question's timer
  const navigateToIndex = (nextIndex) => {
    // Enforce forward-only navigation
    if (nextIndex <= currentQuestionIndex) return;
    setCurrentQuestionIndex(nextIndex);
  };
  useEffect(() => {
    console.log('Session ID updated:', sessionId);
  }, [sessionId]);

  // Debug current round changes
  useEffect(() => {
    console.log('Current round updated:', currentRound);
  }, [currentRound]);

  // After submission/validation, stop timer and prevent further edits
  useEffect(() => {
    if (answersSubmitted || isValidating || Boolean(validation)) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      // Freeze timer display and lock current question
      setTimeLeft(0);
      setDisabledQuestions((old) => {
        const n = new Set(old);
        n.add(currentQuestionIndex);
        return n;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answersSubmitted, isValidating, validation]);

  // Build a flat questions array for single-question navigation when results change
  useEffect(() => {
    if (!result?.questions) {
      setFlatQuestions([]);
      setCurrentQuestionIndex(0);
      return;
    }
    let flat = [];
    if (Array.isArray(result.questions)) {
      // Fallback: treat array as descriptive questions
      flat = result.questions.map((q, i) => ({ type: 'desc', q, idx: i }));
    } else {
      const mcqList = (result.questions.mcq_questions || []).map((item, i) => ({ type: 'mcq', q: item, idx: i }));
      const descList = (result.questions.desc_questions || []).map((q, i) => ({ type: 'desc', q, idx: i }));
      flat = [...mcqList, ...descList];
    }
    setFlatQuestions(flat);
    setCurrentQuestionIndex(0);
    setProtectNavigation(true);
  }, [result]);

  // Enable/disable navigation protection based on exam state
  useEffect(() => {
    const shouldProtect = !!result?.questions && !answersSubmitted;
    setProtectNavigation(shouldProtect);
  }, [result, answersSubmitted]);

  // Warn user on reload/close
  useEffect(() => {
    const beforeUnloadHandler = (e) => {
      if (protectNavigation) {
        e.preventDefault();
        e.returnValue = 'Are you sure you want to leave? Your progress will be lost.';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', beforeUnloadHandler);
    return () => window.removeEventListener('beforeunload', beforeUnloadHandler);
  }, [protectNavigation]);

  // Intercept browser back navigation within SPA
  useEffect(() => {
    if (!protectNavigation) return;
    const onPopState = () => {
      const confirmLeave = window.confirm('Are you sure you want to leave? Your progress will be lost.');
      if (!confirmLeave) {
        // push back to prevent leaving
        window.history.pushState(null, '', window.location.href);
      }
    };
    // push a state to enable popstate trapping
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [protectNavigation]);

  // Helper: Submit and Validate answers (used by Submit Exam button)
  const submitAndValidate = async () => {
    try {
      // Resolve identifiers robustly
      const sessionToUse = result?.sessionId || sessionId;
      const roundToUse = (typeof result?.round !== 'undefined' && result?.round !== null) ? result.round : currentRound;
      const roundIdToUse = result?.roundId || result?.round_id || null;

      // Log the data being sent
      console.log('Submitting answers:', {
        sessionIdFromResult: result?.sessionId,
        sessionIdFromState: sessionId,
        sessionIdUsed: sessionToUse,
        roundFromResult: result?.round,
        roundFromState: currentRound,
        roundUsed: roundToUse,
        roundIdFromResult: result?.roundId || result?.round_id,
        roundIdUsed: roundIdToUse,
        answers: answers
      });

      // Validate session ID consistency
      if (sessionId && result?.sessionId && result.sessionId !== sessionId) {
        console.warn('Session ID mismatch detected during submission:', {
          stored: sessionId,
          fromResult: result.sessionId
        });
      }

      // Ensure required IDs exist
      if (!sessionToUse) {
        throw new Error('Missing session ID for submission');
      }
      if (typeof roundToUse === 'undefined' || roundToUse === null) {
        throw new Error('Missing round number for submission');
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
          sessionId: sessionToUse,
          round: roundToUse,
          ...(roundIdToUse ? { roundId: roundIdToUse } : {}),
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
          sessionId: sessionToUse,
          round: roundToUse,
          sendEmail: false,
          ...(roundIdToUse ? { roundId: roundIdToUse } : {}),
        }),
      });

      const validateResponseData = await validateRes.json();
      console.log('Validation response:', validateResponseData);

      if (!validateRes.ok) {
        throw new Error(validateResponseData.error || 'Failed to validate answers');
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

      // Generate styled HTML and trigger server-side PDF email
      const html = buildReportHTML(validationData, { sessionId: sessionToUse, round: roundToUse });
      emailPdfReport(html, { subject: 'Your AI Interview Report (PDF)', fileName: `interview_${sessionToUse || 'report'}.pdf` });
    } catch (err) {
      console.error('Submit/Validation error:', err);
      toast.error(err.message || 'Submit/Validation failed');
    } finally {
      setIsValidating(false);
    }
  };

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
    setInExamMode(false);
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
      // Ensure round is present on the result for downstream usage
      const updatedData = { ...data, round: data?.round ?? 1 };
      setResult(updatedData);
      // Store session ID for subsequent rounds
      if (updatedData.sessionId) {
        setSessionId(updatedData.sessionId);
      }
      // Enter exam mode after questions are generated
      setInExamMode(true);
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

      // Store current round result in history
      setRoundHistory((prev) => [...prev, { round: currentRound, validation }]);

      // Move to next round
      const nextRound = currentRound + 1;
      setCurrentRound(nextRound);

      // Reset states for new round (keep exam mode active)
      setAnswers({ mcq: {}, desc: {} });
      setAnswersSubmitted(false);
      setShowFullReport(false);
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

      // Ensure round is present on the result for downstream usage
      const updatedNext = { ...data, round: data?.round ?? nextRound };
      setResult(updatedNext);
      // Ensure we keep the same session ID (should be the same as what we sent)
      if (updatedNext.sessionId && updatedNext.sessionId !== sessionId) {
        console.warn('Session ID mismatch detected:', { sent: sessionId, received: updatedNext.sessionId });
        setSessionId(updatedNext.sessionId);
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
    <div className="flex min-h-screen bg-white text-gray-900">
      {/* Sidebar: only show on details input page (not in exam mode) */}
      {!inExamMode && (
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
      )}

      {/* Content wrapper; shift when sidebar is visible */}
      <div className={`flex flex-1 w-full min-h-screen px-4 py-6 overflow-x-hidden overflow-y-auto ${!inExamMode ? 'ml-0 sm:ml-60' : ''}`}>

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
              <svg className="animate-spin h-12 w-12 text-gray-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-4 text-gray-900">Starting Interview Practice</h3>
            <p className="text-gray-600 mb-6">Generating personalized questions based on your resume and job description.</p>
            <p className="text-gray-700 font-medium">This may take a few moments...</p>
          </div>
        </motion.div>
      )}

      <motion.div 
        className="flex-1 flex flex-col justify-start relative w-full max-w-4xl mx-auto my-0"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >

        <motion.div
          className="w-full bg-white border border-gray-200 rounded-2xl shadow-lg p-4 md:p-6 flex flex-col h-auto"
          variants={cardVariants}
        >
          <div className="mb-6 flex items-center">
            <div className="w-12 h-12 bg-gray-900 rounded-xl flex items-center justify-center mr-4">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">AI Interview Practice</h2>
              <p className="text-sm text-gray-500">{getRoundName(currentRound)}</p>
              {sessionId && (
                <p className="text-xs text-gray-500 mt-1">Session: {sessionId.slice(-8)}</p>
              )}
              {roundHistory.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {roundHistory.map((round, idx) => (
                    <span
                      key={idx}
                      className={`px-2 py-1 text-xs rounded-full ${round.validation.verdict === 'Pass'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
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
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Setup View (shown before starting interview) */}
          {!inExamMode && (
            <>
              {/* Round-specific instructions */}
              <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <h3 className="font-medium mb-2">Round Information:</h3>
                <p className="text-sm text-gray-700">
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
                      className="form-radio h-4 w-4 text-gray-900 accent-gray-900"
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
                      className="form-radio h-4 w-4 text-gray-900 accent-gray-900"
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
                        This will be used for generating interview questions.
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
                      Starting Practice...
                    </span>
                  ) : 'Start Interview Practice'}
                </button>
              </div>
            </form>
            </>
          )}

          {/* Exam Mode */}
          {inExamMode && result?.questions && (
            <motion.div
              className="mt-8 p-6 bg-gray-50 border border-gray-200 rounded-xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{getRoundName(result.round)} Questions</h3>
                <div className="flex items-center gap-4">
                  <div className="text-sm text-gray-600">
                    Question {flatQuestions.length ? (currentQuestionIndex + 1) : 0} of {flatQuestions.length}
                  </div>
                  <div
                    className={`px-3 py-1 rounded-md text-sm font-mono ${(timeLeft !== null && timeLeft <= 10 && timeLeft > 0) ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-800'}`}
                    title="Time remaining for this question"
                  >
                    {formatTime(timeLeft)}
                  </div>
                </div>
              </div>
              {flatQuestions.length > 0 && (
                <div className="text-left">
                  {flatQuestions[currentQuestionIndex].type === 'mcq' ? (
                    <div>
                      <p className="font-semibold mb-3">{flatQuestions[currentQuestionIndex].q.question}</p>
                      <div className="space-y-2">
                        {flatQuestions[currentQuestionIndex].q.options.map((opt, i) => (
                          <label
                            key={i}
                            className={`flex items-center p-3 rounded-lg cursor-pointer border transition-all duration-200 shadow-sm hover:shadow ${
                              answers.mcq[flatQuestions[currentQuestionIndex].idx] === opt
                                ? 'bg-gray-100 border-gray-900 ring-1 ring-gray-900'
                                : 'bg-white border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`mcq-${flatQuestions[currentQuestionIndex].idx}`}
                              value={opt}
                              checked={answers.mcq[flatQuestions[currentQuestionIndex].idx] === opt}
                              onChange={() =>
                                setAnswers((prev) => ({
                                  ...prev,
                                  mcq: { ...prev.mcq, [flatQuestions[currentQuestionIndex].idx]: opt },
                                }))
                              }
                              className="mr-3 accent-gray-900"
                              disabled={timeLeft === 0 || answersSubmitted || isValidating || Boolean(validation)}
                            />
                            <span className="select-none">{opt}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="font-semibold mb-3">{flatQuestions[currentQuestionIndex].q}</p>
                      <textarea
                        ref={descTextareaRef}
                        className="w-full bg-white border border-gray-300 rounded-lg p-3 text-gray-900"
                        rows={5}
                        value={answers.desc[flatQuestions[currentQuestionIndex].idx] || ''}
                        onChange={(e) =>
                          setAnswers((prev) => ({
                            ...prev,
                            desc: { ...prev.desc, [flatQuestions[currentQuestionIndex].idx]: e.target.value },
                          }))
                        }
                        disabled={timeLeft === 0 || answersSubmitted || isValidating || Boolean(validation)}
                      />
                    </div>
                  )}
                </div>
              )}
              {/* Navigation Controls - forward only */}
              <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
                {currentQuestionIndex < flatQuestions.length - 1 ? (
                  <button
                    className="py-3 px-4 rounded-lg font-medium transition-all duration-200 bg-black text-white hover:bg-gray-900 disabled:opacity-60"
                    onClick={() => navigateToIndex(Math.min(flatQuestions.length - 1, currentQuestionIndex + 1))}
                    disabled={(() => {
                      const cq = flatQuestions[currentQuestionIndex];
                      if (!cq) return true;
                      const idx = cq.idx;
                      const hasAnswer = cq.type === 'mcq'
                        ? Boolean(answers.mcq[idx])
                        : Boolean((answers.desc[idx] || '').trim());
                      return !hasAnswer || timeLeft === 0 || answersSubmitted || isValidating || Boolean(validation);
                    })()}
                  >
                    Next
                  </button>
                ) : (
                  <button
                    className="py-3 px-4 rounded-lg font-medium transition-all duration-200 bg-black text-white hover:bg-gray-900 disabled:opacity-60 flex items-center justify-center"
                    disabled={(() => {
                      if (isLoading || !result?.sessionId || answersSubmitted || isValidating) return true;
                      const cq = flatQuestions[currentQuestionIndex];
                      if (!cq) return true;
                      const idx = cq.idx;
                      const hasAnswer = cq.type === 'mcq'
                        ? Boolean(answers.mcq[idx])
                        : Boolean((answers.desc[idx] || '').trim());
                      return !hasAnswer || timeLeft === 0 || answersSubmitted || isValidating || Boolean(validation);
                    })()}
                    onClick={submitAndValidate}
                  >
                    {isValidating ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Validating...
                      </>
                    ) : answersSubmitted ? 'Completed' : 'Submit Exam'}
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {validation && (
            <motion.div
              className="mt-8 p-6 bg-white border border-gray-200 rounded-lg text-gray-900"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Brain className="w-6 h-6 mr-2 text-gray-900" />
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
                <div className="mt-2 bg-gray-200 rounded-full h-3">
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
                <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-700">{validation.mcq?.score || 0}/{validation.mcq?.max_score || 0}</div>
                  <div className="text-sm text-gray-600">MCQ Questions</div>
                </div>
                <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-700">{validation.descriptive?.score || 0}/{validation.descriptive?.max_score || 0}</div>
                  <div className="text-sm text-gray-600">Descriptive Questions</div>
                </div>
              </div>

              {/* Progression Info */}
              {currentRound < 4 && (
                <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <h4 className="font-medium mb-2 text-gray-900">Next Round Requirements:</h4>
                  <p className="text-sm text-gray-700">
                    {currentRound === 1 && "To proceed to Technical Round 2, you need to Pass (≥60% score)"}
                    {currentRound === 2 && "To proceed to Managerial Round, you need to Pass (≥60% score)"}
                    {currentRound === 3 && "You can proceed to HR Round regardless of score"}
                  </p>
                  {canProceedToNextRound() ? (
                    <div className="mt-2 flex items-center text-green-700">
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Eligible for next round
                    </div>
                  ) : (
                    <div className="mt-2 flex items-center text-red-600">
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
                  className="py-3 px-6 bg-black text-white hover:bg-gray-900 rounded-lg font-medium transition-all duration-200 flex items-center mx-auto"
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
                    className="py-3 px-6 bg-black text-white hover:bg-gray-900 rounded-lg font-medium transition-all duration-200 flex items-center mx-auto disabled:opacity-60"
                  >
                    {isLoading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
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
                  <div className="py-4 px-6 bg-gray-900 text-white rounded-lg text-center">
                    <div className="flex items-center justify-center mb-2">
                      <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
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
                      setInExamMode(false);
                      toast.success('Ready to start a new interview!');
                    }}
                    disabled={isLoading}
                    className="py-3 px-6 bg-black text-white hover:bg-gray-900 rounded-lg font-medium transition-all duration-200 flex items-center mx-auto disabled:opacity-60 mt-4"
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
                          <div className="mb-3 p-3 bg-gray-50 border border-gray-200 text-gray-800 rounded whitespace-pre-wrap">
                            {item.user_answer || <em className="text-gray-500">No answer provided</em>}
                          </div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium">Score: {item.score}/{item.max_score}</span>
                          </div>
                          <div className="p-3 bg-gray-50 border border-gray-200 text-gray-800 rounded">
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

      {/* Logout Confirmation Dialog (setup/details view) */}
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
    </div>
  );
}
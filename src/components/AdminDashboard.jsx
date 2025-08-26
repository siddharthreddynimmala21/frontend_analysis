import { useEffect, useRef, useState } from 'react';
import ConfirmationDialog from './common/ConfirmationDialog';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { API_BASE_URL } from '../services/api';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState({ users: [], page: 1, total: 0, limit: 10, search: '' });
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [resumeCount, setResumeCount] = useState(null);
  const [interviewData, setInterviewData] = useState({ totalInterviews: 0, sessions: [] });
  const [error, setError] = useState('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  // Carousel state
  const [sessionIndex, setSessionIndex] = useState(0); // which interview (session)
  const [roundIndexBySession, setRoundIndexBySession] = useState({}); // { [sessionIdx]: currentRoundIdx }
  // Per-question tab state: 'answer' | 'feedback'
  const [answerTabByQuestion, setAnswerTabByQuestion] = useState({});
  // Live search suggestions state
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const suggestTimer = useRef(null);
  // Quick-jump inputs for interview/round indices
  const [sessionJump, setSessionJump] = useState('1');
  const [roundJump, setRoundJump] = useState('1');

  const fetchUsers = async (page = 1, search = '') => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: data.limit.toString(), search });
      const res = await fetch(`${API_BASE_URL}/api/admin/users?${params.toString()}`, {
        headers: { Authorization: `Bearer ${user?.token || localStorage.getItem('token')}` },
      });
      const json = await res.json();
      if (res.ok) {
        setData(prev => ({ ...prev, users: json.users, total: json.total, page: json.page, search }));
        setError('');
      } else {
        console.error('Failed to load users', res.status, json);
        setError(`Failed to load users: ${res.status} ${json?.error || json?.message || ''}`.trim());
      }
    } catch (e) {
      console.error('Users fetch error:', e);
      setError(`Error loading users: ${e?.message || e}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserSuggestions = async (query) => {
    if (!query) {
      setSearchSuggestions([]);
      setSuggestOpen(false);
      return;
    }
    setSuggestLoading(true);
    try {
      const params = new URLSearchParams({ page: '1', limit: '5', search: query });
      const res = await fetch(`${API_BASE_URL}/api/admin/users?${params.toString()}`, {
        headers: { Authorization: `Bearer ${user?.token || localStorage.getItem('token')}` },
      });
      const json = await res.json();
      if (res.ok) {
        setSearchSuggestions(Array.isArray(json.users) ? json.users : []);
        setSuggestOpen(true);
        setError('');
      } else {
        setSearchSuggestions([]);
        setSuggestOpen(false);
        setError(`Search failed: ${res.status} ${json?.error || json?.message || ''}`.trim());
      }
    } catch (e) {
      setSearchSuggestions([]);
      setSuggestOpen(false);
      setError(`Search error: ${e?.message || e}`);
    } finally {
      setSuggestLoading(false);
    }
  };

  const fetchUserDetails = async (u) => {
    if (!u?._id) return;
    setSelectedUser(u);
    setDetailLoading(true);
    setResumeCount(null);
    setInterviewData({ totalInterviews: 0, sessions: [] });
    // Reset carousels when switching user
    setSessionIndex(0);
    setRoundIndexBySession({});
    try {
      const [rcRes, ivRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/admin/users/${u._id}/resume-count`, { headers: { Authorization: `Bearer ${user?.token || localStorage.getItem('token')}` } }),
        fetch(`${API_BASE_URL}/api/admin/users/${u._id}/interviews`, { headers: { Authorization: `Bearer ${user?.token || localStorage.getItem('token')}` } }),
      ]);
      const rcJson = await rcRes.json();
      const ivJson = await ivRes.json();
      if (rcRes.ok) setResumeCount(rcJson.resumeUploadCount ?? 0);
      if (ivRes.ok) setInterviewData({ totalInterviews: ivJson.totalInterviews ?? 0, sessions: Array.isArray(ivJson.sessions) ? ivJson.sessions : [] });
      if (!rcRes.ok || !ivRes.ok) {
        console.error('Detail fetch failed', { rcStatus: rcRes.status, ivStatus: ivRes.status, rcJson, ivJson });
        setError(`Failed to load details: rc ${rcRes.status}, iv ${ivRes.status}`);
      } else {
        setError('');
      }
    } catch (e) {
      console.error('Failed loading user details', e);
      setError(`Error loading details: ${e?.message || e}`);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(1, '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Helpers for carousels
  const currentSession = interviewData.sessions?.[sessionIndex] || null;
  const currentRounds = currentSession?.rounds || [];
  const currentRoundIndex = roundIndexBySession[sessionIndex] || 0;
  const currentRound = currentRounds[currentRoundIndex] || null;

  const nextSession = () => {
    if (!interviewData.sessions?.length) return;
    setSessionIndex((idx) => {
      const next = Math.min(interviewData.sessions.length - 1, idx + 1);
      return next;
    });
  };
  const prevSession = () => {
    if (!interviewData.sessions?.length) return;
    setSessionIndex((idx) => Math.max(0, idx - 1));
  };
  const nextRound = () => {
    if (!currentRounds.length) return;
    setRoundIndexBySession((map) => {
      const cur = map[sessionIndex] || 0;
      const next = Math.min(currentRounds.length - 1, cur + 1);
      return { ...map, [sessionIndex]: next };
    });
  };
  const prevRound = () => {
    if (!currentRounds.length) return;
    setRoundIndexBySession((map) => {
      const cur = map[sessionIndex] || 0;
      const prev = Math.max(0, cur - 1);
      return { ...map, [sessionIndex]: prev };
    });
  };

  // When sessionIndex changes, ensure round index exists
  useEffect(() => {
    setRoundIndexBySession((map) => ({ ...map, [sessionIndex]: map[sessionIndex] ?? 0 }));
    // Sync session jump display whenever session index changes
    setSessionJump(String((sessionIndex || 0) + 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionIndex]);

  // Sync round jump when current round index changes
  useEffect(() => {
    setRoundJump(String((currentRoundIndex || 0) + 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRoundIndex, sessionIndex, currentRounds.length]);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-60 border-r border-gray-200 h-screen p-4 sticky top-0 overflow-hidden">
          <div className="flex items-center gap-2 px-2 mb-6">
            <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
              <Shield className="w-4 h-4 text-gray-700" />
            </div>

        {error ? (
          <div className="mb-4 p-3 border border-red-300 bg-red-50 text-red-800 rounded">
            {error}
          </div>
        ) : null}
            <div className="text-xl font-semibold">Resume Refiner</div>
          </div>
          <nav className="space-y-1">
            <button
              className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 text-gray-700"
              onClick={() => navigate('/dashboard')}
            >
              Dashboard
            </button>
            <button
              className="w-full text-left px-3 py-2 rounded-md bg-gray-100 text-gray-900 font-medium"
              onClick={() => navigate('/admin')}
            >
              Admin
            </button>
            <button
              className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 text-gray-700"
              onClick={() => setShowLogoutConfirm(true)}
            >
              Logout
            </button>
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-6 overflow-y-auto max-h-screen">
          {/* Top bar */}
          {error && (
            <div className="mb-4 p-3 border border-red-300 bg-red-50 text-red-800 rounded">
              {error}
            </div>
          )}
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="text-sm text-gray-500">Admin Panel</div>
              <div className="text-xl font-semibold text-gray-900">User Management</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <input
                  className="border border-gray-200 rounded-md px-3 py-2 w-64 text-sm"
                  placeholder="Search by email"
                  value={data.search}
                  onChange={(e) => {
                    const v = e.target.value;
                    setData(prev => ({ ...prev, search: v }));
                    if (suggestTimer.current) clearTimeout(suggestTimer.current);
                    suggestTimer.current = setTimeout(() => fetchUserSuggestions(v), 250);
                  }}
                  onKeyDown={(e) => { if (e.key === 'Enter') fetchUsers(1, data.search); }}
                  onFocus={() => { if (data.search) fetchUserSuggestions(data.search); }}
                  onBlur={() => setTimeout(() => setSuggestOpen(false), 150)}
                />
                {suggestOpen && (
                  <div className="absolute z-20 mt-1 w-64 bg-white border border-gray-200 rounded-md shadow">
                    {suggestLoading ? (
                      <div className="px-3 py-2 text-sm text-gray-600">Searching…</div>
                    ) : searchSuggestions.length ? (
                      <ul className="max-h-60 overflow-auto">
                        {searchSuggestions.map((u) => (
                          <li key={u._id}>
                            <button
                              type="button"
                              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setSuggestOpen(false);
                                setData(prev => ({ ...prev, search: u.email }));
                                fetchUsers(1, u.email);
                              }}
                            >{u.email}</button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="px-3 py-2 text-sm text-gray-600">No matches</div>
                    )}
                  </div>
                )}
              </div>
              <button className="px-4 py-2 bg-black text-white rounded-md text-sm" onClick={() => fetchUsers(1, data.search)}>
                Search
              </button>
            </div>
          </div>

          <div className="space-y-5">
            {/* Users list - full width */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
              <div className="grid grid-cols-3 font-medium text-gray-900 mb-2">
                <div>Email</div>
                <div>Resumes</div>
                <div>Created</div>
              </div>
              <div className="divide-y divide-gray-200 border-t border-b border-gray-200">
                {loading ? (
                  <div className="py-6 text-gray-600">Loading...</div>
                ) : (
                  data.users.map(u => (
                    <button
                      key={u._id}
                      onClick={() => fetchUserDetails(u)}
                      className={`grid grid-cols-3 w-full text-left py-3 hover:bg-gray-100 ${selectedUser?._id === u._id ? 'bg-gray-100' : ''}`}
                    >
                      <div className="truncate text-gray-900">{u.email}</div>
                      <div className="text-gray-700">{u.resumeUploadCount ?? 0}</div>
                      <div className="text-gray-700">{u.createdAt ? new Date(u.createdAt).toLocaleString() : '-'}</div>
                    </button>
                  ))
                )}
              </div>
              <div className="flex justify-between items-center pt-4">
                <button
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50 disabled:opacity-50"
                  onClick={() => fetchUsers(Math.max(1, data.page - 1), data.search)}
                  disabled={data.page <= 1}
                >
                  Previous
                </button>
                <div className="text-sm text-gray-700">
                  Page {data.page} of {Math.max(1, Math.ceil(data.total / data.limit))}
                </div>
                <button
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50 disabled:opacity-50"
                  onClick={() => fetchUsers(data.page + 1, data.search)}
                  disabled={data.page >= Math.ceil(data.total / data.limit)}
                >
                  Next
                </button>
              </div>
            </div>

            {/* Test details - full width under users list */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 min-h-[200px]">
              {!selectedUser ? (
                <div className="h-full w-full flex items-center justify-center text-gray-600">
                  Select a user to view details
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-lg font-semibold text-gray-900">{selectedUser.email}</div>
                      <div className="text-sm text-gray-500">User ID: {selectedUser._id}</div>
                    </div>
                    {detailLoading && <div className="text-sm text-gray-500">Loading...</div>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="p-3 border border-gray-200 rounded-lg bg-white">
                      <div className="text-sm text-gray-500">Resume Uploads</div>
                      <div className="text-2xl font-semibold text-gray-900">{resumeCount ?? '—'}</div>
                    </div>
                    <div className="p-3 border border-gray-200 rounded-lg bg-white">
                      <div className="text-sm text-gray-500">Total Interviews</div>
                      <div className="text-2xl font-semibold text-gray-900">{interviewData.totalInterviews ?? 0}</div>
                    </div>
                    <div className="p-3 border border-gray-200 rounded-lg bg-white">
                      <div className="text-sm text-gray-500">Cleared First Two Rounds</div>
                      <div className="text-2xl font-semibold text-gray-900">
                        {(() => {
                          try {
                            const total = interviewData.totalInterviews ?? interviewData.sessions.length ?? 0;
                            const clearedTwo = interviewData.sessions.filter((s) => {
                              const r1 = s.rounds?.[0];
                              const r2 = s.rounds?.[1];
                              return !!(r1?.scores?.passed && r2?.scores?.passed);
                            }).length;
                            return `${clearedTwo}/${total}`;
                          } catch { return '0/0'; }
                        })()}
                      </div>
                    </div>
                    <div className="p-3 border border-gray-200 rounded-lg bg-white">
                      <div className="text-sm text-gray-500">Average Score / Interview</div>
                      <div className="text-2xl font-semibold text-gray-900">
                        {(() => {
                          try {
                            const MAX_PER_INTERVIEW = 56;
                            const sessions = Array.isArray(interviewData.sessions) ? interviewData.sessions : [];
                            const perSessionPct = sessions.map((s) => {
                              let totalPoints = 0;
                              (s.rounds || []).forEach((r) => {
                                const mcqS = r.scores?.mcq?.score ?? 0;
                                const descS = r.scores?.descriptive?.score ?? 0;
                                const roundTotal = r.scores?.total_score ?? (mcqS + descS);
                                totalPoints += roundTotal;
                              });
                              return MAX_PER_INTERVIEW > 0 ? (totalPoints / MAX_PER_INTERVIEW) * 100 : 0;
                            });
                            const avgPct = perSessionPct.length ? (perSessionPct.reduce((a, b) => a + b, 0) / perSessionPct.length) : 0;
                            return `${Math.round(avgPct)}%`;
                          } catch { return '0%'; }
                        })()}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">Interview Sessions</h2>
                    {interviewData.sessions.length === 0 ? (
                      <div className="text-gray-600">No interviews found.</div>
                    ) : (
                      <div className="space-y-4">
                        {/* Top-level carousel: Interviews */}
                        <div className="border border-gray-200 rounded-lg bg-white">
                          <div className="flex items-center justify-between p-3 bg-gray-50 border-b border-gray-200 rounded-t-lg">
                            <div className="font-medium text-gray-900 flex items-center gap-1">
                              <span>Interview</span>
                              <input
                                type="text"
                                inputMode="numeric"
                                min={1}
                                max={Math.max(1, interviewData.sessions.length)}
                                value={sessionJump}
                                onChange={(e) => {
                                  const v = e.target.value.replace(/[^0-9]/g, '');
                                  setSessionJump(v);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    const n = Math.max(1, Math.min(parseInt(sessionJump || '1', 10), interviewData.sessions.length || 1));
                                    setSessionIndex(n - 1);
                                  }
                                }}
                                onBlur={() => {
                                  const n = Math.max(1, Math.min(parseInt(sessionJump || '1', 10), interviewData.sessions.length || 1));
                                  setSessionIndex(n - 1);
                                }}
                                className="w-12 px-2 py-0.5 border border-gray-300 rounded text-center text-sm"
                              />
                              <span>of {interviewData.sessions.length}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                className="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50 disabled:opacity-50"
                                onClick={prevSession}
                                disabled={sessionIndex === 0}
                              >Prev</button>
                              <button
                                className="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50 disabled:opacity-50"
                                onClick={nextSession}
                                disabled={sessionIndex >= interviewData.sessions.length - 1}
                              >Next</button>
                            </div>
                          </div>

                          {/* Current interview body */}
                          {currentSession && (
                            <div className="p-3 space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="text-sm text-gray-700">Session: {currentSession.sessionId || 'N/A'}</div>
                                <div className="text-sm text-gray-600">Rounds Passed: {currentSession.roundsPassed}/{currentSession.rounds?.length || 0}</div>
                              </div>

                              {/* Nested carousel: Rounds */}
                              <div className="border border-gray-200 rounded-md">
                                <div className="flex items-center justify-between p-3 bg-gray-50 border-b border-gray-200 rounded-t-md">
                                  <div className="font-medium text-gray-900 flex items-center gap-1">
                                    <span>Round</span>
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      min={1}
                                      max={Math.max(1, currentRounds.length)}
                                      value={roundJump}
                                      onChange={(e) => {
                                        const v = e.target.value.replace(/[^0-9]/g, '');
                                        setRoundJump(v);
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          const n = Math.max(1, Math.min(parseInt(roundJump || '1', 10), currentRounds.length || 1));
                                          setRoundIndexBySession((map) => ({ ...map, [sessionIndex]: n - 1 }));
                                        }
                                      }}
                                      onBlur={() => {
                                        const n = Math.max(1, Math.min(parseInt(roundJump || '1', 10), currentRounds.length || 1));
                                        setRoundIndexBySession((map) => ({ ...map, [sessionIndex]: n - 1 }));
                                      }}
                                      className="w-12 px-2 py-0.5 border border-gray-300 rounded text-center text-sm"
                                    />
                                    <span>of {currentRounds.length}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      className="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50 disabled:opacity-50"
                                      onClick={prevRound}
                                      disabled={currentRoundIndex === 0}
                                    >Prev</button>
                                    <button
                                      className="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50 disabled:opacity-50"
                                      onClick={nextRound}
                                      disabled={currentRoundIndex >= Math.max(0, currentRounds.length - 1)}
                                    >Next</button>
                                  </div>
                                </div>

                                {currentRound ? (
                                  <div className="p-3">
                                    {(() => {
                                      const mcqS = currentRound.scores?.mcq?.score ?? 0;
                                      const mcqMax = currentRound.scores?.mcq?.max_score ?? 0;
                                      const descS = currentRound.scores?.descriptive?.score ?? 0;
                                      const descMax = currentRound.scores?.descriptive?.max_score ?? 0;
                                      const total = currentRound.scores?.total_score ?? (mcqS + descS);
                                      const maxTotal = (currentRound.scores?.max_possible_score ?? (mcqMax + descMax)) || 1;
                                      const pct = Math.round((total / maxTotal) * 100);
                                      const verdict = (currentRound.scores?.verdict || '-').toString();
                                      const verdictLower = verdict.toLowerCase();
                                      const verdictColor = verdictLower.includes('pass') || verdictLower.includes('strong')
                                        ? 'bg-green-100 text-green-800 border-green-200'
                                        : verdictLower.includes('improve') || verdictLower.includes('average')
                                        ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                                        : verdictLower.includes('fail') || verdictLower.includes('weak')
                                        ? 'bg-red-100 text-red-800 border-red-200'
                                        : 'bg-gray-100 text-gray-800 border-gray-200';
                                      return (
                                        <div className="mb-4 space-y-3">
                                          <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-xs px-2 py-1 rounded border bg-gray-50 text-gray-800">MCQ: {mcqS} / {mcqMax}</span>
                                            <span className="text-xs px-2 py-1 rounded border bg-gray-50 text-gray-800">Descriptive: {descS} / {descMax}</span>
                                            <span className="text-xs px-2 py-1 rounded border bg-gray-50 text-gray-800">Total: {total} / {maxTotal}</span>
                                            <span className={`text-xs px-2 py-1 rounded border ${verdictColor}`}>Verdict: {verdict}</span>
                                          </div>
                                          <div>
                                            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                                              <span>Overall</span>
                                              <span>{pct}%</span>
                                            </div>
                                            <div className="h-2 bg-gray-200 rounded">
                                              <div className="h-2 bg-gray-800 rounded" style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })()}
                                    <div>
                                      <div className="font-medium text-gray-900 mb-2">Questions</div>
                                      {currentRound.questions?.length ? (
                                        <div className="space-y-2">
                                          {currentRound.questions.map((q, qi) => (
                                            <div key={qi} className="border border-gray-200 rounded p-3 text-sm">
                                              <div className="flex items-start justify-between gap-3 mb-1">
                                                <div className="text-gray-700">Q{qi + 1}. {q.question || '—'}</div>
                                                {(() => {
                                                  const perScore = q.type === 'mcq' ? (q.is_correct ? 1 : 0) : (q.score ?? 0);
                                                  const perMax = q.type === 'mcq' ? 1 : (q.max_score ?? 1);
                                                  return (
                                                    <span className="shrink-0 text-xs px-2 py-1 rounded bg-gray-100 text-gray-800 border border-gray-200">Score: {perScore} / {perMax}</span>
                                                  );
                                                })()}
                                              </div>
                                              {q.type === 'mcq' ? (
                                                (() => {
                                                  const letters = ['A','B','C','D','E','F','G','H'];
                                                  const normalizeLabel = (ans) => {
                                                    if (!ans) return '';
                                                    const raw = String(ans).toUpperCase().trim();
                                                    const L = raw[0];
                                                    return letters.includes(L) ? L : '';
                                                  };
                                                  const getOptionText = (label) => {
                                                    if (!label) return '';
                                                    if (Array.isArray(q.options)) {
                                                      const idx = letters.indexOf(label);
                                                      return idx >= 0 && idx < q.options.length ? q.options[idx] : '';
                                                    }
                                                    if (q.options && typeof q.options === 'object') {
                                                      return q.options[label] || q.options[`${label})`] || q.options[`${label}.`] || q.options[`${label}:`] || '';
                                                    }
                                                    return '';
                                                  };
                                                  const stripLeadingLabel = (text, label) => {
                                                    if (!text || !label) return text || '';
                                                    const candidates = [
                                                      `${label}) `, `${label}). `, `${label})`,
                                                      `${label}. `, `${label}.`,
                                                      `${label}: `, `${label}:`,
                                                      `${label} - `, `${label}-`,
                                                      `${label} `
                                                    ];
                                                    let t = String(text);
                                                    for (const c of candidates) {
                                                      if (t.startsWith(c)) {
                                                        return t.slice(c.length).trimStart();
                                                      }
                                                    }
                                                    return t;
                                                  };
                                                  const uaLabel = normalizeLabel(q.user_answer);
                                                  const caLabel = normalizeLabel(q.correct_answer);
                                                  const uaTextRaw = getOptionText(uaLabel);
                                                  const caTextRaw = getOptionText(caLabel);
                                                  const uaText = stripLeadingLabel(uaTextRaw, uaLabel);
                                                  const caText = stripLeadingLabel(caTextRaw, caLabel);
                                                  return (
                                                    <div className="space-y-2">
                                                      <div className="flex items-start gap-2">
                                                        <span className="text-[10px] leading-4 uppercase tracking-wide px-2 py-0.5 rounded border bg-blue-50 text-blue-700">User</span>
                                                        <div className="flex-1 text-gray-800">{uaLabel ? `${uaLabel}. ` : ''}{uaText || (q.user_answer ?? '—')}</div>
                                                      </div>
                                                      <div className="flex items-start gap-2">
                                                        <span className="text-[10px] leading-4 uppercase tracking-wide px-2 py-0.5 rounded border bg-green-50 text-green-700">Correct</span>
                                                        <div className="flex-1 text-gray-700">{caLabel ? `${caLabel}. ` : ''}{caText || (q.correct_answer ?? '—')}</div>
                                                      </div>
                                                    </div>
                                                  );
                                                })()
                                              ) : (
                                                <div className="space-y-2">
                                                  {(() => {
                                                    const tabKey = `${sessionIndex}-${currentRoundIndex}-${qi}`;
                                                    const active = answerTabByQuestion[tabKey] || 'answer';
                                                    const setActive = (v) => setAnswerTabByQuestion(prev => ({ ...prev, [tabKey]: v }));
                                                    return (
                                                      <>
                                                        <div className="inline-flex items-center text-xs border border-gray-200 rounded-md overflow-hidden">
                                                          <button
                                                            className={`px-2 py-1 ${active === 'answer' ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                                                            onClick={() => setActive('answer')}
                                                          >Answer</button>
                                                          <button
                                                            className={`px-2 py-1 border-l border-gray-200 ${active === 'feedback' ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                                                            onClick={() => setActive('feedback')}
                                                          >Feedback</button>
                                                        </div>
                                                        {active === 'answer' ? (
                                                          <div className="mt-2 text-gray-800">{String(q.user_answer ?? '—')}</div>
                                                        ) : (
                                                          <div className="mt-2 text-gray-600">{q.feedback || '—'}</div>
                                                        )}
                                                      </>
                                                    );
                                                  })()}
                                                </div>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <div className="text-gray-600 text-sm">No questions recorded.</div>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="p-3 text-gray-600">No rounds available.</div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
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

import { useEffect, useRef, useState } from 'react';
import ConfirmationDialog from './common/ConfirmationDialog';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { API_BASE_URL } from '../services/api';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ComposedChart,
} from 'recharts';
import { RefreshCw, Menu, X } from 'lucide-react';

// Helper: merge interview count series with pass rate by key
function mergeSeries(interviews, passRate) {
  const map = new Map();
  (Array.isArray(interviews) ? interviews : []).forEach((d) => {
    if (!d || d.key == null) return;
    map.set(d.key, { key: d.key, interviews: d.value || 0 });
  });
  (Array.isArray(passRate) ? passRate : []).forEach((d) => {
    if (!d || d.key == null) return;
    const existing = map.get(d.key) || { key: d.key };
    existing.rate = typeof d.rate === 'number' ? d.rate : 0;
    existing.total = d.total || 0;
    existing.passed = d.passed || 0;
    map.set(d.key, existing);
  });
  // Sort by key ascending (keys are date strings like YYYY-MM-DD or ISO week)
  return Array.from(map.values()).sort((a, b) => String(a.key).localeCompare(String(b.key)));
}

// Helper: bucket interviews per user into histogram bins
function bucketInterviews(perUser) {
  const bins = [
    { bucket: '0', count: 0 },
    { bucket: '1', count: 0 },
    { bucket: '2-3', count: 0 },
    { bucket: '4-5', count: 0 },
    { bucket: '6+', count: 0 },
  ];
  (Array.isArray(perUser) ? perUser : []).forEach((d) => {
    const c = Number(d?.count) || 0;
    if (c <= 0) bins[0].count += 1;
    else if (c === 1) bins[1].count += 1;
    else if (c <= 3) bins[2].count += 1;
    else if (c <= 5) bins[3].count += 1;
    else bins[4].count += 1;
  });
  return bins;
}

// Helper: bucket MCQ and Descriptive percentage distributions into ranges
function bucketMcqDesc(values) {
  const ranges = [
    { label: '0-20%', from: 0, to: 0.2 },
    { label: '20-40%', from: 0.2, to: 0.4 },
    { label: '40-60%', from: 0.4, to: 0.6 },
    { label: '60-80%', from: 0.6, to: 0.8 },
    { label: '80-100%', from: 0.8, to: 1.000001 },
  ];
  const buckets = ranges.map((r) => ({ bucket: r.label, mcq: 0, desc: 0 }));
  (Array.isArray(values) ? values : []).forEach((d) => {
    const mcq = Number(d?.mcqPct) || 0;
    const desc = Number(d?.descPct) || 0;
    const iMcq = ranges.findIndex((r) => mcq >= r.from && mcq < r.to);
    const iDesc = ranges.findIndex((r) => desc >= r.from && desc < r.to);
    if (iMcq >= 0) buckets[iMcq].mcq += 1;
    if (iDesc >= 0) buckets[iDesc].desc += 1;
  });
  return buckets;
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState({ users: [], page: 1, total: 0, limit: 10, search: '' });
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  // Global KPI metrics
  const [metrics, setMetrics] = useState(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [resumeCount, setResumeCount] = useState(null);
  const [interviewData, setInterviewData] = useState({ totalInterviews: 0, sessions: [] });
  const [interviewCounts, setInterviewCounts] = useState({}); // { [userId]: number }
  const [error, setError] = useState('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  // In-page tabs: 'overview' | 'users'
  const [activeTab, setActiveTab] = useState('overview');
  const [searchParams, setSearchParams] = useSearchParams();
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
  const [navOpen, setNavOpen] = useState(false);

  // Charts state
  const [tsSignups, setTsSignups] = useState([]); // [{ key, value }]
  const [tsInterviews, setTsInterviews] = useState([]); // [{ key, value }]
  const [tsPassRate, setTsPassRate] = useState([]); // [{ key, total, passed, rate }]
  const [distInterviewsPerUser, setDistInterviewsPerUser] = useState([]); // [{ userId, count }]
  const [distMcqDesc, setDistMcqDesc] = useState([]); // [{ mcqPct, descPct }]
  const [distRoundPass, setDistRoundPass] = useState([]); // [{ round, total, passed, failed }]
  const [chartsLoading, setChartsLoading] = useState(false);
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
        // Kick off fetching interview counts for listed users (best-effort)
        try {
          const token = user?.token || localStorage.getItem('token');
          const usersList = Array.isArray(json.users) ? json.users : [];
          const toFetch = usersList.filter(u => u && u._id && typeof interviewCounts[u._id] === 'undefined');
          if (toFetch.length) {
            const results = await Promise.allSettled(
              toFetch.map(u => fetch(`${API_BASE_URL}/api/admin/users/${u._id}/interviews`, {
                headers: { Authorization: `Bearer ${token}` }
              }).then(r => r.json().then(j => ({ ok: r.ok, data: j }))))
            );
            const updates = {};
            results.forEach((rs, i) => {
              const uid = toFetch[i]._id;
              if (rs.status === 'fulfilled' && rs.value?.ok) {
                updates[uid] = rs.value.data?.totalInterviews ?? 0;
              } else {
                // mark as 0 to avoid repeated retries during this view
                updates[uid] = 0;
              }
            });
            if (Object.keys(updates).length) {
              setInterviewCounts(prev => ({ ...prev, ...updates }));
            }
          }
        } catch (e) {
          // Non-fatal; keep UI responsive
          console.warn('Interview counts fetch error:', e);
        }
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

  const fetchCharts = async () => {
    setChartsLoading(true);
    try {
      const token = user?.token || localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const now = new Date();
      const from = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
      const to = now.toISOString();
      // Parallel fetches
      const [signupsRes, interviewsRes, distInterviewsRes, distMcqDescRes, distRoundPassRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/admin/metrics/timeseries?metric=signups&granularity=day&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, { headers }),
        fetch(`${API_BASE_URL}/api/admin/metrics/timeseries?metric=interviews&granularity=day&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, { headers }),
        fetch(`${API_BASE_URL}/api/admin/metrics/distribution?type=interviews_per_user&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, { headers }),
        fetch(`${API_BASE_URL}/api/admin/metrics/distribution?type=mcq_desc&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, { headers }),
        fetch(`${API_BASE_URL}/api/admin/metrics/distribution?type=round_pass&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, { headers }),
      ]);
      const [signupsJson, interviewsJson, distInterviewsJson, distMcqDescJson, distRoundPassJson] = await Promise.all([
        signupsRes.json(),
        interviewsRes.json(),
        distInterviewsRes.json(),
        distMcqDescRes.json(),
        distRoundPassRes.json(),
      ]);
      try {
        console.groupCollapsed('[Admin Charts] Primary fetch sizes');
        console.log('signups.series:', Array.isArray(signupsJson?.series) ? signupsJson.series.length : 0);
        console.log('interviews.series:', Array.isArray(interviewsJson?.series) ? interviewsJson.series.length : 0);
        console.log('interviews.passRate:', Array.isArray(interviewsJson?.passRate) ? interviewsJson.passRate.length : 0);
        console.log('dist.interviews_per_user:', Array.isArray(distInterviewsJson?.perUser) ? distInterviewsJson.perUser.length : 0);
        console.log('dist.mcq_desc:', Array.isArray(distMcqDescJson?.values) ? distMcqDescJson.values.length : 0);
        console.log('dist.round_pass:', Array.isArray(distRoundPassJson?.byRound) ? distRoundPassJson.byRound.length : 0);
        console.groupEnd();
      } catch {}
      if (signupsRes.ok) setTsSignups(Array.isArray(signupsJson.series) ? signupsJson.series : []);
      if (interviewsRes.ok) {
        setTsInterviews(Array.isArray(interviewsJson.series) ? interviewsJson.series : []);
        setTsPassRate(Array.isArray(interviewsJson.passRate) ? interviewsJson.passRate : []);
      }
      if (distInterviewsRes.ok) setDistInterviewsPerUser(Array.isArray(distInterviewsJson.perUser) ? distInterviewsJson.perUser : []);
      if (distMcqDescRes.ok) setDistMcqDesc(Array.isArray(distMcqDescJson.values) ? distMcqDescJson.values : []);
      if (distRoundPassRes.ok) setDistRoundPass(Array.isArray(distRoundPassJson.byRound) ? distRoundPassJson.byRound : []);

      // If everything is empty, retry without from/to to show any data available
      const allEmpty = (!signupsJson?.series?.length)
        && (!interviewsJson?.series?.length)
        && (!interviewsJson?.passRate?.length)
        && (!distInterviewsJson?.perUser?.length)
        && (!distMcqDescJson?.values?.length)
        && (!distRoundPassJson?.byRound?.length);
      if (allEmpty) {
        const [s2, i2, d1, d2, d3] = await Promise.all([
          fetch(`${API_BASE_URL}/api/admin/metrics/timeseries?metric=signups&granularity=day`, { headers }),
          fetch(`${API_BASE_URL}/api/admin/metrics/timeseries?metric=interviews&granularity=day`, { headers }),
          fetch(`${API_BASE_URL}/api/admin/metrics/distribution?type=interviews_per_user`, { headers }),
          fetch(`${API_BASE_URL}/api/admin/metrics/distribution?type=mcq_desc`, { headers }),
          fetch(`${API_BASE_URL}/api/admin/metrics/distribution?type=round_pass`, { headers }),
        ]);
        const [sj2, ij2, dj1, dj2, dj3] = await Promise.all([s2.json(), i2.json(), d1.json(), d2.json(), d3.json()]);
        try {
          console.groupCollapsed('[Admin Charts] Fallback fetch sizes');
          console.log('signups.series:', Array.isArray(sj2?.series) ? sj2.series.length : 0);
          console.log('interviews.series:', Array.isArray(ij2?.series) ? ij2.series.length : 0);
          console.log('interviews.passRate:', Array.isArray(ij2?.passRate) ? ij2.passRate.length : 0);
          console.log('dist.interviews_per_user:', Array.isArray(dj1?.perUser) ? dj1.perUser.length : 0);
          console.log('dist.mcq_desc:', Array.isArray(dj2?.values) ? dj2.values.length : 0);
          console.log('dist.round_pass:', Array.isArray(dj3?.byRound) ? dj3.byRound.length : 0);
          console.groupEnd();
        } catch {}
        if (s2.ok) setTsSignups(Array.isArray(sj2.series) ? sj2.series : []);
        if (i2.ok) {
          setTsInterviews(Array.isArray(ij2.series) ? ij2.series : []);
          setTsPassRate(Array.isArray(ij2.passRate) ? ij2.passRate : []);
        }
        if (d1.ok) setDistInterviewsPerUser(Array.isArray(dj1.perUser) ? dj1.perUser : []);
        if (d2.ok) setDistMcqDesc(Array.isArray(dj2.values) ? dj2.values : []);
        if (d3.ok) setDistRoundPass(Array.isArray(dj3.byRound) ? dj3.byRound : []);
      }
    } catch (e) {
      console.error('Charts fetch error:', e);
    } finally {
      setChartsLoading(false);
    }
  };

  const fetchMetrics = async () => {
    setMetricsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/metrics/overview`, {
        headers: { Authorization: `Bearer ${user?.token || localStorage.getItem('token')}` },
      });
      const json = await res.json();
      if (res.ok) {
        setMetrics(json);
      } else {
        console.error('Failed to load metrics', res.status, json);
        setError(`Failed to load metrics: ${res.status} ${json?.error || json?.message || ''}`.trim());
      }
    } catch (e) {
      console.error('Metrics fetch error:', e);
      setError(`Error loading metrics: ${e?.message || e}`);
    } finally {
      setMetricsLoading(false);
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
    // Initialize active tab from URL param if present
    const tab = (searchParams.get('tab') || '').toLowerCase();
    if (tab === 'users' || tab === 'overview') setActiveTab(tab);
    fetchUsers(1, '');
    fetchMetrics();
    fetchCharts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep URL ?tab= in sync when activeTab changes
  useEffect(() => {
    const current = new URLSearchParams(searchParams);
    current.set('tab', activeTab);
    setSearchParams(current, { replace: true });
    // Close mobile nav when switching tabs
    setNavOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Close mobile drawer when viewport becomes desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setNavOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Manage body scroll lock and ESC close while drawer is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    if (navOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';

    const onKeyDown = (e) => {
      if (e.key === 'Escape') setNavOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = originalOverflow || '';
    };
  }, [navOpen]);

  // When switching back to Overview, ensure charts are loaded
  useEffect(() => {
    if (activeTab === 'overview') {
      const noData =
        !(tsSignups?.length) &&
        !(tsInterviews?.length) &&
        !(tsPassRate?.length) &&
        !(distInterviewsPerUser?.length) &&
        !(distMcqDesc?.length) &&
        !(distRoundPass?.length);
      if (noData && !chartsLoading) {
        fetchCharts();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

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
    <div className="min-h-screen bg-white text-gray-900 overflow-x-hidden">
      <div className="flex">
        {/* Sidebar (desktop) */}
        <aside className="hidden md:block w-60 border-r border-gray-200 h-screen p-4 sticky top-0 overflow-hidden">
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
          {error ? (
            <div className="mb-4 p-3 border border-red-300 bg-red-50 text-red-800 rounded">
              {error}
            </div>
          ) : null}
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

        {/* Mobile sidebar drawer */}
        {navOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
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
                <button
                  className="w-full text-left px-3 py-2 rounded-md bg-gray-100 text-gray-900 font-medium"
                  onClick={() => { setNavOpen(false); navigate('/admin'); }}
                >
                  Admin
                </button>
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

        {/* Main content */}
        <main className="flex-1 p-6">
          {/* Top bar (sticky on mobile) */}
          <div className="md:static sticky top-0 z-30 bg-white">
            {error && (
              <div className="mb-2 p-3 border border-red-300 bg-red-50 text-red-800 rounded">
                {error}
              </div>
            )}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3 sm:mb-6">
              <div className="flex items-center gap-3">
              {/* Mobile hamburger */}
              <button
                type="button"
                className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-md border border-gray-300 text-gray-800"
                aria-label={navOpen ? 'Close menu' : 'Open menu'}
                onClick={() => setNavOpen(v => !v)}
              >
                {navOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
              {/* Mobile logo + app name */}
              <button
                type="button"
                className="md:hidden inline-flex items-center justify-center w-10 h-10"
                aria-label="Go to Dashboard"
                onClick={() => navigate('/dashboard')}
              >
                <img src="/new_logo.png" alt="ResumeRefiner Logo" className="w-9 h-9 object-contain rounded" />
              </button>
              <span className="md:hidden text-base font-semibold text-gray-900">Resume Refiner</span>
              {/* Desktop: original two-line title */}
              <div className="hidden md:block">
                <div className="text-sm text-gray-500">Admin Panel</div>
                <div className="text-xl font-semibold text-gray-900">User Management</div>
              </div>
              </div>
              {/* Top bar search: desktop only */}
              <div className="hidden md:flex items-center gap-2 w-auto">
                <div className="relative w-full sm:w-auto">
                  <input
                    className="border border-gray-200 rounded-md px-3 py-2 w-full sm:w-64 text-sm"
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
                    <div className="absolute z-20 mt-1 w-full sm:w-64 bg-white border border-gray-200 rounded-md shadow">
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
                <button className="px-4 py-2 sm:py-2 bg-black text-white rounded-md text-sm w-full sm:w-auto" onClick={() => fetchUsers(1, data.search)}>
                  Search
                </button>
              </div>
            </div>
            {/* Mobile-only Admin Panel heading below the top bar */}
            <div className="md:hidden mb-2">
              <div className="text-lg font-semibold text-gray-900">Admin Panel</div>
            </div>
          </div>
          {/* In-page tabs */}
          <div className="mb-4 border-b border-gray-200">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={`px-3 py-2 text-sm rounded-t-md ${activeTab === 'overview' ? 'bg-gray-100 text-gray-900 border border-b-0 border-gray-200' : 'text-gray-700 hover:bg-gray-50'}`}
                onClick={() => setActiveTab('overview')}
              >Overview</button>
              <button
                type="button"
                className={`px-3 py-2 text-sm rounded-t-md ${activeTab === 'users' ? 'bg-gray-100 text-gray-900 border border-b-0 border-gray-200' : 'text-gray-700 hover:bg-gray-50'}`}
                onClick={() => setActiveTab('users')}
              >Users</button>
            </div>
          </div>

          {/* Mobile-only search row for Users tab */}
          {activeTab === 'users' && (
            <div className="md:hidden mb-3 flex items-stretch gap-2">
              <div className="relative w-full">
                <input
                  className="border border-gray-200 rounded-md px-3 py-2 w-full text-sm"
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
                  <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-md shadow">
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
              <button className="px-4 py-2 bg-black text-white rounded-md text-sm w-28" onClick={() => fetchUsers(1, data.search)}>
                Search
              </button>
            </div>
          )}

          {/* Metrics toolbar (Overview tab only): last updated + refresh */}
          {activeTab === 'overview' && (
            <div className="mb-4 flex items-center gap-3">
              <div className="text-xs text-gray-500">
                {metrics?.lastUpdated ? (
                  <>Metrics last updated: {new Date(metrics.lastUpdated).toLocaleString()}</>
                ) : (
                  <>Metrics loading…</>
                )}
              </div>
              <button
                type="button"
                onClick={() => { fetchMetrics(); fetchCharts(); }}
                className="inline-flex items-center justify-center w-8 h-8 border border-gray-300 rounded bg-white hover:bg-gray-50 text-gray-800"
                aria-label="Refresh metrics"
                title="Refresh metrics"
              >
                <RefreshCw className={`w-4 h-4 ${metricsLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          )}

          {/* KPI cards (Overview tab) */}
          {activeTab === 'overview' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Total Users */}
            <div className="p-4 border border-gray-200 rounded-xl bg-gray-50">
              <div className="text-sm text-gray-500">Total Users</div>
              <div className="text-2xl font-semibold text-gray-900">{metricsLoading ? '—' : (metrics?.totalUsers ?? '—')}</div>
            </div>
            {/* New Users */}
            <div className="p-4 border border-gray-200 rounded-xl bg-gray-50">
              <div className="text-sm text-gray-500">New Users (7d / 30d)</div>
              <div className="text-2xl font-semibold text-gray-900">{metricsLoading ? '—' : `${metrics?.newUsers7d ?? 0} / ${metrics?.newUsers30d ?? 0}`}</div>
            </div>
            {/* Verified Users */}
            <div className="p-4 border border-gray-200 rounded-xl bg-gray-50">
              <div className="text-sm text-gray-500">Verified Users</div>
              <div className="text-2xl font-semibold text-gray-900">{metricsLoading ? '—' : (metrics?.verifiedUsers ?? 0)}</div>
            </div>
            {/* Resume Uploads Total */}
            <div className="p-4 border border-gray-200 rounded-xl bg-gray-50">
              <div className="text-sm text-gray-500">Resume Uploads</div>
              <div className="text-2xl font-semibold text-gray-900">{metricsLoading ? '—' : (metrics?.resumeUploadsTotal ?? 0)}</div>
            </div>
          </div>
          )}

          {activeTab === 'overview' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-2">
            {/* Total Interviews */}
            <div className="p-4 border border-gray-200 rounded-xl bg-gray-50">
              <div className="text-sm text-gray-500">Total Interviews (All Users)</div>
              <div className="text-2xl font-semibold text-gray-900">{metricsLoading ? '—' : (metrics?.totalInterviews ?? 0)}</div>
            </div>
            {/* Avg Rounds Passed / Interview */}
            <div className="p-4 border border-gray-200 rounded-xl bg-gray-50">
              <div className="text-sm text-gray-500">Avg Rounds Passed / Interview</div>
              <div className="text-2xl font-semibold text-gray-900">{metricsLoading ? '—' : (metrics ? (metrics.avgRoundsPassedPerInterview?.toFixed?.(2) ?? '0.00') : '—')}</div>
            </div>
            {/* Overall Round Pass Rate */}
            <div className="p-4 border border-gray-200 rounded-xl bg-gray-50">
              <div className="text-sm text-gray-500">Overall Round Pass Rate</div>
              <div className="text-2xl font-semibold text-gray-900">{metricsLoading ? '—' : (metrics ? `${Math.round((metrics.overallRoundPassRate || 0) * 100)}%` : '—')}</div>
            </div>
            {/* DAU / MAU (ratio) */}
            <div className="p-4 border border-gray-200 rounded-xl bg-gray-50">
              <div className="text-sm text-gray-500">DAU / MAU (Ratio)</div>
              <div className="text-2xl font-semibold text-gray-900">
                {metricsLoading ? '—' : (metrics ? `${metrics.dau ?? 0} / ${metrics.mau ?? 0} (${(metrics.dauMauRatio ?? 0).toFixed(2)})` : '—')}
              </div>
            </div>
          </div>
          )}

          {/* Secondary KPI row with page-level numbers (Overview tab) */}
          {activeTab === 'overview' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Interviews (This Page) */}
            <div className="p-4 border border-gray-200 rounded-xl bg-gray-50">
              <div className="text-sm text-gray-500">Interviews (This Page)</div>
              <div className="text-2xl font-semibold text-gray-900">
                {(() => {
                  try {
                    const ids = Array.isArray(data.users) ? data.users.map(u => u?._id).filter(Boolean) : [];
                    const sum = ids.reduce((acc, id) => acc + (Number.isFinite(interviewCounts[id]) ? interviewCounts[id] : 0), 0);
                    return sum;
                  } catch { return 0; }
                })()}
              </div>
            </div>
          </div>
          )}

          {activeTab === 'overview' && (
          <div className="space-y-6">
            <h2 className="text-base font-semibold text-gray-900">Analytics</h2>
            {/* Signups over time */}
            <div className="border border-gray-200 rounded-xl bg-white md:p-4 p-0 -mx-4 md:mx-0">
              <div className="text-sm text-gray-700 mb-2 px-4 md:px-0 pt-3 md:pt-0">User Signups Over Time (Daily)</div>
              <div className="h-64">
                {chartsLoading ? (
                  <div className="h-full w-full flex items-center justify-center text-xs text-gray-500">Loading chart…</div>
                ) : tsSignups.length === 0 ? (
                  <div className="h-full w-full flex items-center justify-center text-xs text-gray-500">No data</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={tsSignups} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="key" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="value" name="Signups" stroke="#111827" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Interviews over time + pass rate */}
            <div className="border border-gray-200 rounded-xl bg-white md:p-4 p-0 -mx-4 md:mx-0">
              <div className="text-sm text-gray-700 mb-2 px-4 md:px-0 pt-3 md:pt-0">Interviews Over Time (Daily) & Pass Rate</div>
              <div className="h-64">
                {chartsLoading ? (
                  <div className="h-full w-full flex items-center justify-center text-xs text-gray-500">Loading chart…</div>
                ) : tsInterviews.length === 0 && tsPassRate.length === 0 ? (
                  <div className="h-full w-full flex items-center justify-center text-xs text-gray-500">No data</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={mergeSeries(tsInterviews, tsPassRate)} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="key" tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${Math.round(v * 100)}%`} tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(val, name) => name === 'Pass Rate' ? `${Math.round(val * 100)}%` : val} />
                      <Legend />
                      <Bar yAxisId="left" dataKey="interviews" name="Interviews" fill="#9CA3AF" />
                      <Line yAxisId="right" type="monotone" dataKey="rate" name="Pass Rate" stroke="#111827" strokeWidth={2} dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Interviews per user histogram */}
            <div className="border border-gray-200 rounded-xl bg-white md:p-4 p-0 -mx-4 md:mx-0">
              <div className="text-sm text-gray-700 mb-2 px-4 md:px-0 pt-3 md:pt-0">Distribution: Interviews per User</div>
              <div className="h-64">
                {chartsLoading ? (
                  <div className="h-full w-full flex items-center justify-center text-xs text-gray-500">Loading chart…</div>
                ) : distInterviewsPerUser.length === 0 ? (
                  <div className="h-full w-full flex items-center justify-center text-xs text-gray-500">No data</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={bucketInterviews(distInterviewsPerUser)} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="bucket" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" name="# Users" fill="#111827" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* MCQ vs Descriptive performance distribution */}
            <div className="border border-gray-200 rounded-xl bg-white md:p-4 p-0 -mx-4 md:mx-0">
              <div className="text-sm text-gray-700 mb-2 px-4 md:px-0 pt-3 md:pt-0">MCQ vs Descriptive Performance Distribution</div>
              <div className="h-64">
                {chartsLoading ? (
                  <div className="h-full w-full flex items-center justify-center text-xs text-gray-500">Loading chart…</div>
                ) : distMcqDesc.length === 0 ? (
                  <div className="h-full w-full flex items-center justify-center text-xs text-gray-500">No data</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={bucketMcqDesc(distMcqDesc)} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="bucket" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="mcq" name="MCQ" fill="#111827" />
                      <Bar dataKey="desc" name="Descriptive" fill="#9CA3AF" />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Pass/fail by round */}
            <div className="border border-gray-200 rounded-xl bg-white md:p-4 p-0 -mx-4 md:mx-0">
              <div className="text-sm text-gray-700 mb-2 px-4 md:px-0 pt-3 md:pt-0">Pass/Fail by Round</div>
              <div className="h-64">
                {chartsLoading ? (
                  <div className="h-full w-full flex items-center justify-center text-xs text-gray-500">Loading chart…</div>
                ) : distRoundPass.length === 0 ? (
                  <div className="h-full w-full flex items-center justify-center text-xs text-gray-500">No data</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={distRoundPass} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="round" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="passed" name="Passed" fill="#10B981" />
                      <Bar dataKey="failed" name="Failed" fill="#EF4444" />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
          )}

          {activeTab === 'users' && (
          <div className="space-y-5">
            {/* Users list - mobile stacked cards */}
            <div className="md:hidden space-y-2">
              {loading ? (
                <div className="py-8 text-center text-gray-600">Loading…</div>
              ) : data.users.length === 0 ? (
                <div className="py-8 text-center text-gray-600 border border-dashed border-gray-300 rounded-lg">No users found</div>
              ) : (
                data.users.map((u) => {
                  const interviews = typeof interviewCounts[u._id] !== 'undefined' ? interviewCounts[u._id] : '—';
                  const date = u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-';
                  return (
                    <button
                      key={u._id}
                      onClick={() => fetchUserDetails(u)}
                      className={`w-full text-left bg-white rounded-lg p-3 border border-gray-200 ${selectedUser?._id === u._id ? 'ring-2 ring-blue-500' : 'hover:bg-gray-50'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="truncate pr-2 font-medium text-gray-900">{u.email}</div>
                        <span className="shrink-0 text-gray-400">›</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">Resumes: {u.resumeUploadCount ?? 0}</span>
                        <span className="text-xs px-2 py-0.5 bg-green-50 text-green-700 rounded-full">Interviews: {interviews}</span>
                        <span className="text-xs px-2 py-0.5 bg-gray-50 text-gray-600 rounded-full">{date}</span>
                      </div>
                    </button>
                  );
                })
              )}

              {/* Pagination */}
              <div className="pt-2">
                <div className="flex items-center justify-between gap-2">
                  <button
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm bg-white hover:bg-gray-50 disabled:opacity-50"
                    onClick={() => fetchUsers(Math.max(1, data.page - 1), data.search)}
                    disabled={data.page <= 1}
                  >
                    Previous
                  </button>
                  <div className="px-2 text-sm text-gray-700">{data.page} / {Math.max(1, Math.ceil(data.total / data.limit))}</div>
                  <button
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm bg-white hover:bg-gray-50 disabled:opacity-50"
                    onClick={() => fetchUsers(data.page + 1, data.search)}
                    disabled={data.page >= Math.ceil(data.total / data.limit)}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>

            {/* Users list - desktop/tablet grid */}
            <div className="hidden md:block bg-gray-50 border border-gray-200 rounded-xl overflow-x-auto">
              <div className="w-full grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50 border-b border-gray-200">
                <div className="col-span-5 font-medium text-gray-900">Email</div>
                <div className="col-span-2 font-medium text-gray-900 text-center">Resumes</div>
                <div className="col-span-2 font-medium text-gray-900 text-center">Interviews</div>
                <div className="col-span-3 font-medium text-gray-900 text-right">Created</div>
              </div>
              <div className="w-full space-y-2 p-1">
                {loading ? (
                  <div className="py-6 text-center text-gray-600">Loading...</div>
                ) : data.users.length === 0 ? (
                  <div className="py-6 text-center text-gray-600">No users found</div>
                ) : (
                  data.users.map((u) => (
                    <button
                      key={u._id}
                      onClick={() => fetchUserDetails(u)}
                      className={`w-full grid grid-cols-12 gap-4 items-center py-2 px-3 rounded hover:bg-gray-100 ${selectedUser?._id === u._id ? 'bg-blue-50' : ''}`}
                    >
                      <div className="col-span-5 truncate text-sm">{u.email}</div>
                      <div className="col-span-2 text-center text-gray-700 text-sm">{u.resumeUploadCount ?? 0}</div>
                      <div className="col-span-2 text-center text-gray-700 text-sm">
                        {typeof interviewCounts[u._id] !== 'undefined' ? interviewCounts[u._id] : '—'}
                      </div>
                      <div className="col-span-3 text-right text-gray-700 text-xs truncate">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-'}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Pagination */}
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

            {/* Test details - full width under users list */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 min-h-[200px] overflow-x-hidden">
              {!selectedUser ? (
                <div className="h-full w-full flex items-center justify-center text-gray-600">
                  Select a user to view details
                </div>
              ) : (
                <div className="w-full max-w-full">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-4">
                    <div className="min-w-0 max-w-full overflow-hidden">
                      <div className="text-base sm:text-lg font-semibold text-gray-900 break-all">{selectedUser.email}</div>
                      <div className="text-xs sm:text-sm text-gray-500 break-all">ID: {selectedUser._id}</div>
                    </div>
                    {detailLoading && (
                      <div className="text-xs sm:text-sm text-gray-500 whitespace-nowrap">
                        Loading...
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
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
          )}
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
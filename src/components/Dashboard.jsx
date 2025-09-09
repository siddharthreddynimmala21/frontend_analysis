import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, FileText, Wand2, Upload, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ConfirmationDialog from './common/ConfirmationDialog';

export default function Dashboard() {
  const navigate = useNavigate();
  const { logout, isAdmin } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [showProfileInfo, setShowProfileInfo] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  // Close mobile drawer on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setNavOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Manage body scroll and ESC close while drawer is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    if (navOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    const onKeyDown = (e) => { if (e.key === 'Escape') setNavOpen(false); };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = originalOverflow || '';
    };
  }, [navOpen]);

  const handleLogout = () => setShowLogoutConfirm(true);
  const confirmLogout = () => { logout(); setShowLogoutConfirm(false); };
  const cancelLogout = () => setShowLogoutConfirm(false);

  // Derive a readable name from stored email, fallback to JWT token
  useEffect(() => {
    try {
      // 1) Prefer stored email from login response
      let email = localStorage.getItem('email');

      // 2) Fallback: attempt to parse JWT for email (if present)
      if (!email) {
        const token = localStorage.getItem('token');
        if (token) {
          const payloadPart = token.split('.')[1];
          if (payloadPart) {
            // Handle URL-safe base64 variants and padding
            const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
            const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
            const decoded = JSON.parse(atob(padded));
            email = decoded?.email || decoded?.user?.email || '';
          }
        }
      }

      if (!email) return;
      const local = email.split('@')[0];
      const parts = local
        .replace(/\d+/g, ' ') // remove digits
        .split(/[._-]+|\s+/)
        .filter(Boolean);
      const name = parts
        .map(s => s.charAt(0).toUpperCase() + s.slice(1))
        .join(' ')
        .trim();
      setDisplayName(name || 'User');
    } catch (e) {
      // Fallback
      setDisplayName('User');
    }
  }, []);

  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-x-hidden">
      <div className="flex">
        {/* Sidebar (desktop) */}
        <aside className="hidden md:block w-60 border-r border-gray-200 min-h-screen p-4">
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
              className="w-full text-left px-3 py-2 rounded-md bg-gray-100 text-gray-900 font-medium"
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
                onClick={() => setShowProfileInfo(true)}
              >
                My Profile
              </button>
            )}
            <button
              className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 text-gray-700"
              onClick={handleLogout}
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
                {isAdmin && (
                  <button
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 text-gray-700"
                    onClick={() => { setNavOpen(false); navigate('/admin'); }}
                  >
                    Admin
                  </button>
                )}
                {!isAdmin && (
                  <button
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 text-gray-700"
                    onClick={() => { setNavOpen(false); setShowProfileInfo(true); }}
                  >
                    My Profile
                  </button>
                )}
                <button
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 text-gray-700"
                  onClick={() => { setNavOpen(false); handleLogout(); }}
                >
                  Logout
                </button>
              </nav>
            </aside>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 p-6 overflow-x-hidden">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-6">
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
              {/* Mobile logo (visible when sidebar is hidden) */}
              <button
                type="button"
                className="md:hidden inline-flex items-center justify-center w-10 h-10"
                aria-label="Go to Dashboard"
                onClick={() => navigate('/dashboard')}
              >
                <img src="/new_logo.png" alt="ResumeRefiner Logo" className="w-9 h-9 object-contain rounded shrink-0" />
              </button>
              {(() => {
                const len = (displayName || '').length;
                let nameSize = 'text-xl';
                if (len > 28) nameSize = 'text-sm';
                else if (len > 20) nameSize = 'text-base';
                else if (len > 12) nameSize = 'text-lg';
                return (
                  <div className="min-w-0">
                    <div className="text-sm text-gray-500">Welcome back,</div>
                    <div className={`${nameSize} font-semibold text-gray-900 truncate max-w-[70vw] sm:max-w-none`}>
                      {displayName ? `${displayName}!` : 'User!'}
                    </div>
                  </div>
                );
              })()}
            </div>
            {/* <button
              className="inline-flex items-center gap-2 px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md border border-gray-300"
              onClick={() => navigate('/resume-analyzer')}
            >
              <Upload className="w-4 h-4" />
              Upload Resume
            </button> */}
          </div>

          {/* Action blocks: 2x2 grid of large cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full max-w-5xl">
            {/* Start Interview */}
            <div className="bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl p-5 h-56 flex flex-col justify-between break-words">
              <div>
                <MessageSquare className="w-5 h-5 text-gray-700 mb-3" />
                <div className="text-gray-900 font-medium mb-1">AI Interview</div>
                <div className="text-gray-700 text-sm">Start a practice interview session tailored to your role and skills. Assess fundamentals and prepare effectively.</div>
              </div>
              <button
                className="px-4 py-2 bg-black text-white rounded-md text-sm self-start"
                onClick={() => navigate('/ai-interview')}
              >
                Start Now
              </button>
            </div>

            {/* Open Chat */}
            <div className="bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl p-5 h-56 flex flex-col justify-between break-words">
              <div>
                <FileText className="w-5 h-5 text-gray-700 mb-3" />
                <div className="text-gray-900 font-medium mb-1">Resume Q&A</div>
                <div className="text-gray-700 text-sm">Ask targeted questions about your resume and experience. Clarify achievements and improve articulation.</div>
              </div>
              <button
                className="px-4 py-2 bg-black text-white rounded-md text-sm self-start"
                onClick={() => navigate('/chat')}
              >
                Open Chat
              </button>
            </div>

            {/* Get Feedback */}
            <div className="bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl p-5 h-56 flex flex-col justify-between">
              <div>
                <Wand2 className="w-5 h-5 text-gray-700 mb-3" />
                <div className="text-gray-900 font-medium mb-1">Resume Feedback</div>
                <div className="text-gray-700 text-sm">Receive actionable suggestions to improve clarity, impact, and ATS fit. Optimize content and formatting.</div>
              </div>
              <button
                className="px-4 py-2 bg-black text-white rounded-md text-sm self-start"
                onClick={() => navigate('/resume-analyzer')}
              >
                Get Feedback
              </button>
            </div>

            {/* Resume based interview */}
            <div className="bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl p-5 h-56 flex flex-col justify-between">
              <div>
                <FileText className="w-5 h-5 text-gray-700 mb-3" />
                <div className="text-gray-900 font-medium mb-1">Resume-based Interview</div>
                <div className="text-gray-700 text-sm">Generate an interview plan directly from your resume highlights and target role. Practice where it matters most.</div>
              </div>
              <button className="px-4 py-2 bg-black text-white rounded-md text-sm self-start">
                Start Now
              </button>
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
          onConfirm={confirmLogout}
          onCancel={cancelLogout}
          confirmText="Yes, logout"
          cancelText="Cancel"
        />
      )}

      {showProfileInfo && (
        <ConfirmationDialog
          message={
            <div className="text-center">
              <div className="text-base text-gray-700">Profile feature is coming soon.</div>
            </div>
          }
          onConfirm={() => setShowProfileInfo(false)}
          onCancel={() => setShowProfileInfo(false)}
          confirmText="OK"
          cancelText="Close"
        />
      )}
    </div>
  );
}
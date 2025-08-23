import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, MessageSquare, FileText, Wand2, Upload } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ConfirmationDialog from './common/ConfirmationDialog';

export default function Dashboard() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [showProfileInfo, setShowProfileInfo] = useState(false);

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
    <div className="min-h-screen bg-white text-gray-900">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-60 border-r border-gray-200 min-h-screen p-4">
          <div className="flex items-center gap-2 px-2 mb-6">
            <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
              <Shield className="w-4 h-4 text-gray-700" />
            </div>
            <div className="text-xl font-semibold">Resume Refiner</div>
          </div>
          <nav className="space-y-1">
            <button
              className="w-full text-left px-3 py-2 rounded-md bg-gray-100 text-gray-900 font-medium"
              onClick={() => navigate('/dashboard')}
            >
              Dashboard
            </button>
            <button
              className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 text-gray-700"
              onClick={() => setShowProfileInfo(true)}
            >
              My Profile
            </button>
            <button
              className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 text-gray-700"
              onClick={handleLogout}
            >
              Logout
            </button>
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-6">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="text-sm text-gray-500">Welcome back,</div>
              <div className="text-xl font-semibold text-gray-900">{displayName ? `${displayName}!` : 'User!'}</div>
            </div>
            {/* <button
              className="inline-flex items-center gap-2 px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md border border-gray-300"
              onClick={() => navigate('/resume-analyzer')}
            >
              <Upload className="w-4 h-4" />
              Upload Resume
            </button> */}
          </div>

          {/* Action blocks */}
          <div className="space-y-5 max-w-3xl">
            {/* Start Interview */}
            <div className="bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl p-5">
              <MessageSquare className="w-5 h-5 text-gray-700 mb-3" />
              <div className="text-gray-700 mb-3">Start a practice interview session.</div>
              <button
                className="px-4 py-2 bg-black text-white rounded-md text-sm"
                onClick={() => navigate('/ai-interview')}
              >
                Start Now
              </button>
            </div>

            {/* Open Chat */}
            <div className="bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl p-5">
              <FileText className="w-5 h-5 text-gray-700 mb-3" />
              <div className="text-gray-700 mb-3">Ask questions about your resume.</div>
              <button
                className="px-4 py-2 bg-black text-white rounded-md text-sm"
                onClick={() => navigate('/chat')}
              >
                Open Chat
              </button>
            </div>

            {/* Get Feedback */}
            <div className="bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl p-5">
              <Wand2 className="w-5 h-5 text-gray-700 mb-3" />
              <div className="text-gray-700 mb-3">Get feedback to improve your resume.</div>
              <button
                className="px-4 py-2 bg-black text-white rounded-md text-sm"
                onClick={() => navigate('/resume-analyzer')}
              >
                Get Feedback
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
import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { register, verifyOTP, setupPassword } from '../../services/api';
import { useNavigate, Link } from 'react-router-dom';

export default function Register() {
  const [resending, setResending] = useState(false);
  // Unified-flow states
  const [emailInput, setEmailInput] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef([]);
  const [otpVerified, setOtpVerified] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  // Handlers for unified flow
  const handleVerifyEmail = async () => {
    try {
      setSendingOtp(true);
      if (!emailInput) {
        toast.error('Please enter a valid email');
        return;
      }
      await register(emailInput);
      setEmailVerified(true); // email accepted for signup
      toast.success('OTP sent to your email');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send OTP');
      setEmailVerified(false);
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    try {
      setVerifyingOtp(true);
      const joined = otpDigits.join('');
      setOtpInput(joined);
      if (!joined || joined.length !== 6) {
        toast.error('Enter the 6-digit OTP');
        return;
      }
      await verifyOTP(emailInput, joined);
      setOtpVerified(true);
      toast.success('OTP verified');
    } catch (err) {
      toast.error(err.response?.data?.message || 'OTP verification failed');
      setOtpVerified(false);
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleCreateAccount = async () => {
    try {
      setCreating(true);
      if (!password || password.length < 6) {
        toast.error('Password must be at least 6 characters');
        return;
      }
      if (password !== confirmPassword) {
        toast.error('Passwords do not match');
        return;
      }
      await setupPassword(emailInput, otpInput, password);
      toast.success('Account created successfully');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create account');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white text-gray-900 px-4 py-12">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-xl border border-gray-200">
        {/* Header with logo and tabs */}
        <div className="p-6">
          <div className="flex justify-center items-center gap-2 mb-4 select-none">
            <img src="/new_logo.png" alt="ResumeRefiner Logo" className="w-10 h-10 object-contain" />
            <span className="text-xl font-semibold tracking-tight">ResumeRefiner</span>
          </div>
          <div className="flex bg-gray-200 rounded-lg p-1">
            <Link to="/login" className="flex-1 py-2 rounded-md text-center text-gray-500 hover:text-gray-700">Login</Link>
            <button type="button" className="flex-1 py-2 rounded-md bg-white border border-gray-200 text-gray-900 font-medium">Sign Up</button>
          </div>
        </div>

        {/* Unified Form */}
        <div className="px-6 pb-6 space-y-4">
          {/* Email + Verify */}
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm text-gray-700">Email</label>
            <div className="flex gap-2">
              <input
                id="email"
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="flex-1 bg-white border border-gray-300 focus:ring-2 focus:ring-gray-300 rounded-md px-4 py-2 text-sm"
                placeholder="name@email.com"
              />
              <button
                type="button"
                onClick={handleVerifyEmail}
                disabled={sendingOtp}
                className="px-3 py-2 bg-black text-white rounded-md text-sm disabled:opacity-60"
              >
                {sendingOtp ? 'Verifying…' : (emailVerified ? 'Verified' : 'Verify')}
              </button>
            </div>
          </div>

          {/* OTP + Verify */}
          <div className="space-y-2 opacity-100">
            <label htmlFor="otp" className="text-sm text-gray-700">OTP</label>
            <div className="flex items-center gap-2">
              <div className="flex gap-2" onPaste={(e) => {
                if (!emailVerified) return;
                const text = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0,6);
                if (!text) return;
                e.preventDefault();
                const next = otpDigits.slice();
                for (let i=0; i<6; i++) next[i] = text[i] || '';
                setOtpDigits(next);
                const focusIndex = Math.min(text.length, 5);
                otpRefs.current[focusIndex]?.focus();
              }}>
                {otpDigits.map((d, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (otpRefs.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={d}
                    disabled={!emailVerified}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      const next = [...otpDigits];
                      next[idx] = val.slice(-1);
                      setOtpDigits(next);
                      if (val && idx < 5) otpRefs.current[idx+1]?.focus();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Backspace') {
                        if (otpDigits[idx]) {
                          const next = [...otpDigits];
                          next[idx] = '';
                          setOtpDigits(next);
                        } else if (idx > 0) {
                          otpRefs.current[idx-1]?.focus();
                        }
                      } else if (e.key === 'ArrowLeft' && idx > 0) {
                        otpRefs.current[idx-1]?.focus();
                      } else if (e.key === 'ArrowRight' && idx < 5) {
                        otpRefs.current[idx+1]?.focus();
                      }
                    }}
                    className="w-10 h-10 text-center text-base rounded-md border border-gray-300 focus:ring-2 focus:ring-gray-300"
                    placeholder=""
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={handleVerifyOtp}
                disabled={!emailVerified || verifyingOtp}
                className="px-3 py-2 bg-black text-white rounded-md text-sm disabled:opacity-60"
              >
                {verifyingOtp ? 'Checking…' : (otpVerified ? 'Verified' : 'Verify')}
              </button>
            </div>
            <div className="text-right">
              <button
                type="button"
                className="text-xs text-gray-600 hover:text-gray-800"
                disabled={!emailVerified || resending}
                onClick={async () => { setResending(true); try { await register(emailInput); toast.success('OTP resent'); } catch (e) { toast.error('Failed to resend OTP'); } finally { setResending(false); }}}
              >
                Resend OTP
              </button>
            </div>
          </div>

          {/* Passwords */}
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm text-gray-700">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-white border border-gray-300 focus:ring-2 focus:ring-gray-300 rounded-md px-4 py-2 text-sm w-full"
              placeholder="••••••••"
              disabled={!otpVerified}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm text-gray-700">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="bg-white border border-gray-300 focus:ring-2 focus:ring-gray-300 rounded-md px-4 py-2 text-sm w-full"
              placeholder="••••••••"
              disabled={!otpVerified}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between text-sm">
            <div className="text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-gray-900 hover:underline">Login</Link>
            </div>
            <button
              type="button"
              onClick={handleCreateAccount}
              disabled={!otpVerified || creating}
              className="px-4 py-2 bg-black text-white rounded-md text-sm disabled:opacity-60"
            >
              {creating ? 'Creating…' : 'Create Account'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { register, verifyOTP, setupPassword } from '../../services/api';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';

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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [creating, setCreating] = useState(false);
  // New flow tokens
  const [tempToken, setTempToken] = useState('');
  const [verifiedToken, setVerifiedToken] = useState('');
  const navigate = useNavigate();
  const currentStep = otpVerified ? 3 : (emailVerified ? 2 : 1);

  // Handlers for unified flow
  const handleVerifyEmail = async () => {
    try {
      setSendingOtp(true);
      if (!emailInput) {
        toast.error('Please enter a valid email');
        return;
      }
      const res = await register(emailInput);
      setTempToken(res?.tempToken || '');
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
      const res = await verifyOTP(tempToken, joined);
      setVerifiedToken(res?.verifiedToken || '');
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
      await setupPassword(verifiedToken, password);
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

        {/* Multi-step Form */}
        <div className="px-6 pb-6 space-y-4">
          {/* Step 1: Email + Verify */}
          {currentStep === 1 && (
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm text-gray-700">Email</label>
            <div className="flex gap-2 flex-col sm:flex-row">
              <input
                id="email"
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="flex-1 bg-white border border-gray-300 focus:ring-2 focus:ring-gray-300 transition-all duration-200 appearance-none rounded-md block w-full px-4 py-2 text-gray-900 placeholder-gray-400 focus:outline-none sm:text-sm"
                placeholder="name@email.com"
              />
              <button
                type="button"
                onClick={handleVerifyEmail}
                disabled={sendingOtp}
                className="px-3 py-2 bg-black text-white rounded-md text-sm disabled:opacity-60 sm:w-auto w-full"
              >
                {sendingOtp ? 'Verifying…' : (emailVerified ? 'Verified' : 'Verify')}
              </button>
            </div>
          </div>
          )}

          {/* Step 2: OTP + Verify */}
          {currentStep === 2 && (
          <div className="space-y-2">
            <label htmlFor="otp" className="text-sm text-gray-700">OTP</label>
            <div className="flex items-center gap-2 flex-col sm:flex-row">
              <div className="flex gap-2 flex-nowrap" onPaste={(e) => {
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
                    className="w-10 h-10 text-center text-base rounded-md border border-gray-300 focus:ring-2 focus:ring-gray-300 transition-all duration-200 appearance-none focus:outline-none"
                    placeholder=""
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={handleVerifyOtp}
                disabled={!emailVerified || verifyingOtp}
                className="px-3 py-2 bg-black text-white rounded-md text-sm disabled:opacity-60 sm:w-auto w-full"
              >
                {verifyingOtp ? 'Checking…' : (otpVerified ? 'Verified' : 'Verify')}
              </button>
            </div>
            <div className="text-right">
              <button
                type="button"
                className="text-xs text-gray-600 hover:text-gray-800"
                disabled={!emailVerified || resending}
                onClick={async () => {
                  setResending(true);
                  try {
                    const r = await register(emailInput);
                    setTempToken(r?.tempToken || '');
                    toast.success('OTP resent');
                  } catch (e) {
                    toast.error('Failed to resend OTP');
                  } finally {
                    setResending(false);
                  }
                }}
              >
                Resend OTP
              </button>
            </div>
          </div>
          )}

          {/* Step 3: Passwords */}
          {currentStep === 3 && (
          <>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm text-gray-700">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-white border border-gray-300 focus:ring-2 focus:ring-gray-300 transition-all duration-200 appearance-none rounded-md block w-full pr-10 px-4 py-2 text-gray-900 focus:outline-none sm:text-sm"
                  disabled={!otpVerified}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm text-gray-700">Confirm Password</label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-white border border-gray-300 focus:ring-2 focus:ring-gray-300 transition-all duration-200 appearance-none rounded-md block w-full pr-10 px-4 py-2 text-gray-900 focus:outline-none sm:text-sm"
                  disabled={!otpVerified}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 focus:outline-none"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between text-sm gap-3 flex-col sm:flex-row">
            {currentStep === 1 ? (
              <div className="text-gray-600">
                Already have an account?{' '}
                <Link to="/login" className="font-medium text-gray-900 hover:underline">Login</Link>
              </div>
            ) : <span />}
            {currentStep === 3 && (
              <button
                type="button"
                onClick={handleCreateAccount}
                disabled={!otpVerified || creating}
                className="px-4 py-2 bg-black text-white rounded-md text-sm disabled:opacity-60 sm:w-auto w-full"
              >
                {creating ? 'Creating…' : 'Create Account'}
              </button>
            )}
          </div>
        </div>

        {/* Step Indicators */}
        <div className="px-6 pb-6">
          <div className="flex justify-center items-center gap-2">
            {[1,2,3].map((step) => (
              <span
                key={step}
                className={`inline-block rounded-full transition-all ${
                  currentStep === step ? 'w-3 h-3 bg-gray-900' : (currentStep > step ? 'w-3 h-3 bg-gray-400' : 'w-2.5 h-2.5 bg-gray-300')
                }`}
                aria-label={`Step ${step} ${currentStep === step ? '(current)' : currentStep > step ? '(completed)' : ''}`}
              />
            ))}
          </div>
          <div className="mt-2 text-center text-[11px] text-gray-500">
            {currentStep === 1 && 'Step 1: Email verification'}
            {currentStep === 2 && 'Step 2: OTP verification'}
            {currentStep === 3 && 'Step 3: Set password'}
          </div>
        </div>
      </div>
    </div>
  );
}

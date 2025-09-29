import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { forgotPassword, verifyResetOTP, resetPassword } from '../../services/api';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Eye, EyeOff } from 'lucide-react';

export default function ForgotPassword() {
  const [emailInput, setEmailInput] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [resending, setResending] = useState(false);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef([]);
  const [otpVerified, setOtpVerified] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetting, setResetting] = useState(false);
  const navigate = useNavigate();
  const currentStep = otpVerified ? 3 : (emailSent ? 2 : 1);

  const handleSendOtp = async () => {
    try {
      setSendingOtp(true);
      if (!emailInput) {
        toast.error('Please enter a valid email');
        return;
      }
      await forgotPassword(emailInput);
      setEmailSent(true);
      toast.success('OTP sent to your email');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send OTP');
      setEmailSent(false);
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    try {
      setVerifyingOtp(true);
      const joined = otpDigits.join('');
      if (!joined || joined.length !== 6) {
        toast.error('Enter the 6-digit OTP');
        return;
      }
      await verifyResetOTP(emailInput, joined);
      setOtpVerified(true);
      toast.success('OTP verified');
    } catch (err) {
      toast.error(err.response?.data?.message || 'OTP verification failed');
      setOtpVerified(false);
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleResendOTP = async () => {
    try {
      setResending(true);
      await forgotPassword(emailInput);
      toast.success('New OTP sent to your email');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to resend OTP');
    } finally {
      setResending(false);
    }
  };

  const handleResetPassword = async () => {
    try {
      setResetting(true);
      if (!password || password.length < 6) {
        toast.error('Password must be at least 6 characters');
        return;
      }
      if (password !== confirmPassword) {
        toast.error('Passwords do not match');
        return;
      }
      const otp = otpDigits.join('');
      await resetPassword(emailInput, otp, password);
      toast.success('Password reset successfully');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white text-gray-900 px-4 py-12">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-xl border border-gray-200">
        <div className="p-6">
          <div className="flex justify-center items-center gap-2 mb-2 select-none">
            <img src="/new_logo.png" alt="ResumeRefiner Logo" className="w-10 h-10 object-contain" />
            <span className="text-xl font-semibold tracking-tight">ResumeRefiner</span>
          </div>
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-1">Forgot Password</h2>
            <p className="text-xs text-gray-600">Reset your account password</p>
          </div>
        </div>

        <div className="px-6 pb-6 space-y-4">
          {/* Step 1: Email + Send OTP */}
          {currentStep === 1 && (
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm text-gray-700">Email</label>
            <div className="flex gap-2">
              <input
                id="email"
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="flex-1 bg-white border border-gray-300 focus:ring-2 focus:ring-gray-300 transition-all duration-200 appearance-none rounded-md block w-full px-4 py-2 text-gray-900 placeholder-gray-400 focus:outline-none sm:text-sm"
                placeholder="name@email.com"
                disabled={emailSent}
              />
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={sendingOtp || emailSent}
                className="px-3 py-2 bg-black text-white rounded-md text-sm disabled:opacity-60"
              >
                {sendingOtp ? 'Sending…' : (emailSent ? 'Sent' : 'Send OTP')}
              </button>
            </div>
          </div>
          )}

          {/* Step 2: OTP + Verify */}
          {currentStep === 2 && (
          <div className="space-y-2">
            <label className="text-sm text-gray-700">OTP</label>
            <div className="flex items-center gap-2">
              <div className="flex gap-2 flex-nowrap" onPaste={(e) => {
                if (!emailSent) return;
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
                    disabled={!emailSent}
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
                disabled={!emailSent || verifyingOtp}
                className="px-3 py-2 bg-black text-white rounded-md text-sm disabled:opacity-60"
              >
                {verifyingOtp ? 'Checking…' : (otpVerified ? 'Verified' : 'Verify')}
              </button>
            </div>
            <div className="text-right">
              <button
                type="button"
                className="text-xs text-gray-600 hover:text-gray-800"
                disabled={!emailSent || resending}
                onClick={handleResendOTP}
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
              <label htmlFor="password" className="text-sm text-gray-700">New Password</label>
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
              <label htmlFor="confirmPassword" className="text-sm text-gray-700">Confirm New Password</label>
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
        <div className="flex items-center justify-between text-sm">
          {currentStep === 1 ? (
            <div className="text-gray-600">
              Remembered your password?{' '}
              <Link to="/login" className="font-medium text-gray-900 hover:underline">Login</Link>
            </div>
          ) : <span />}
          {currentStep === 3 && (
            <button
              type="button"
              onClick={handleResetPassword}
              disabled={!otpVerified || resetting}
              className="px-4 py-2 bg-black text-white rounded-md text-sm disabled:opacity-60"
            >
              {resetting ? 'Resetting…' : 'Reset Password'}
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
          {currentStep === 1 && 'Step 1: Email'}
          {currentStep === 2 && 'Step 2: OTP'}
          {currentStep === 3 && 'Step 3: New password'}
        </div>
      </div>
    </div>
  </div>
);
}
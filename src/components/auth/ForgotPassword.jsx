import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { forgotPassword, verifyResetOTP, resetPassword } from '../../services/api';
import { useNavigate, Link } from 'react-router-dom';
import { Shield } from 'lucide-react';

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
  const [resetting, setResetting] = useState(false);
  const navigate = useNavigate();

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
          <div className="flex justify-center mb-4">
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
              <Shield className="w-4 h-4 text-gray-700" />
            </div>
          </div>
          <div className="text-center font-medium text-gray-800">Forgot Password</div>
          <div className="mt-1 text-center text-xs text-gray-500">Reset your account password</div>
        </div>

        <div className="px-6 pb-6 space-y-4">
          {/* Email + Send OTP */}
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

          {/* OTP + Verify */}
          <div className="space-y-2">
            <label className="text-sm text-gray-700">OTP</label>
            <div className="flex items-center gap-2">
              <div className="flex gap-2" onPaste={(e) => {
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
                    className="w-10 h-10 text-center text-base rounded-md border border-gray-300 focus:ring-2 focus:ring-gray-300"
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

          {/* Passwords */}
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm text-gray-700">New Password</label>
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
            <label htmlFor="confirmPassword" className="text-sm text-gray-700">Confirm New Password</label>
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
              Remembered your password?{' '}
              <Link to="/login" className="font-medium text-gray-900 hover:underline">Login</Link>
            </div>
            <button
              type="button"
              onClick={handleResetPassword}
              disabled={!otpVerified || resetting}
              className="px-4 py-2 bg-black text-white rounded-md text-sm disabled:opacity-60"
            >
              {resetting ? 'Resetting…' : 'Reset Password'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
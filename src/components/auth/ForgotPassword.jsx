import { useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import toast from 'react-hot-toast';
import { forgotPassword, verifyResetOTP, resetPassword } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, AlertTriangle, KeyRound, Lock } from 'lucide-react';

export default function ForgotPassword() {
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [step, setStep] = useState(1); // 1: email, 2: OTP, 3: password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const navigate = useNavigate();

  const emailFormik = useFormik({
    initialValues: { email: '' },
    validationSchema: Yup.object({
      email: Yup.string().email('Invalid email address').required('Email is required'),
    }),
    onSubmit: async (values) => {
      try {
        setLoading(true);
        await forgotPassword(values.email);
        setEmail(values.email);
        setStep(2);
        toast.success('OTP sent to your email!');
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to send OTP');
      } finally {
        setLoading(false);
      }
    },
  });

  const otpFormik = useFormik({
    initialValues: {
      otp: '',
    },
    validationSchema: Yup.object({
      otp: Yup.string()
        .required('OTP is required')
        .matches(/^\d{6}$/, 'OTP must be 6 digits'),
    }),
    onSubmit: async (values) => {
      try {
        setLoading(true);
        await verifyResetOTP(email, values.otp);
        setOtp(values.otp);
        setStep(3);
        toast.success('OTP verified successfully!');
      } catch (error) {
        toast.error(error.response?.data?.message || 'OTP verification failed');
      } finally {
        setLoading(false);
      }
    },
  });

  const passwordFormik = useFormik({
    initialValues: {
      password: '',
      confirmPassword: '',
    },
    validationSchema: Yup.object({
      password: Yup.string()
        .min(6, 'Password must be at least 6 characters')
        .required('Password is required'),
      confirmPassword: Yup.string()
        .oneOf([Yup.ref('password'), null], 'Passwords must match')
        .required('Confirm your password'),
    }),
    onSubmit: async (values) => {
      try {
        setLoading(true);
        await resetPassword(email, otp, values.password);
        toast.success('Password reset successfully!');
        navigate('/login');
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to reset password');
      } finally {
        setLoading(false);
      }
    },
  });

  const handleResendOTP = async () => {
    try {
      setResending(true);
      await forgotPassword(email);
      toast.success('New OTP sent to your email');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to resend OTP');
    } finally {
      setResending(false);
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 40, scale: 0.98 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.5, ease: 'easeOut' },
    },
  };

  const renderStepIndicator = () => (
    <div className="flex justify-center pt-8 mb-8">
      <div className="flex items-center space-x-2">
        {[1, 2, 3].map((stepNumber) => (
          <div key={stepNumber} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step >= stepNumber 
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white' 
                : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
            }`}>
              {stepNumber}
            </div>
            {stepNumber < 3 && (
              <div className={`w-8 h-1 mx-2 ${
                step > stepNumber 
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600' 
                  : 'bg-gray-300 dark:bg-gray-600'
              }`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderEmailStep = () => (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="text-center space-y-4 px-8 pb-8 sm:px-10 sm:pb-10">
        <div className="mx-auto w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
          <Mail className="w-8 h-8 text-white" />
        </div>
        <div className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          Forgot Password
        </div>
        <div className="text-gray-600 dark:text-gray-300">
          Step 1: Enter your email address
        </div>
      </div>
      <div className="px-8 pb-8">
        <form className="space-y-4" onSubmit={emailFormik.handleSubmit} autoComplete="on">
          <div className="space-y-2">
            <label htmlFor="email" className="text-gray-700 dark:text-gray-200">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="bg-white/70 dark:bg-gray-700/70 border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-purple-500 transition-all duration-200 appearance-none rounded-lg block w-full px-4 py-2 border text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none sm:text-base"
              placeholder="Enter your email"
              {...emailFormik.getFieldProps('email')}
            />
            {emailFormik.touched.email && emailFormik.errors.email && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2 flex items-center space-x-2 mt-1">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="text-red-800 dark:text-red-200 text-sm">{emailFormik.errors.email}</span>
              </div>
            )}
          </div>
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 transition-all duration-200 text-white border-0 py-3 px-4 rounded-lg font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-base flex items-center justify-center"
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Sending OTP...</span>
              </div>
            ) : (
              'Send OTP'
            )}
          </button>
          <div className="text-center">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              Back to login
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );

  const renderOTPStep = () => (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="text-center space-y-4 px-8 pb-8 sm:px-10 sm:pb-10">
        <div className="mx-auto w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
          <KeyRound className="w-8 h-8 text-white" />
        </div>
        <div className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          Verify OTP
        </div>
        <div className="text-gray-600 dark:text-gray-300">
          Step 2: Enter the 6-digit code sent to {email}
        </div>
      </div>
      <div className="px-8 pb-8">
        <form className="space-y-4" onSubmit={otpFormik.handleSubmit} autoComplete="on">
          <div className="space-y-2">
            <label htmlFor="otp" className="text-gray-700 dark:text-gray-200">OTP Code</label>
            <input
              id="otp"
              name="otp"
              type="text"
              maxLength="6"
              required
              className="bg-white/70 dark:bg-gray-700/70 border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-purple-500 transition-all duration-200 appearance-none rounded-lg block w-full px-4 py-2 border text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none sm:text-base text-center text-lg tracking-widest"
              placeholder="000000"
              {...otpFormik.getFieldProps('otp')}
            />
            {otpFormik.touched.otp && otpFormik.errors.otp && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2 flex items-center space-x-2 mt-1">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="text-red-800 dark:text-red-200 text-sm">{otpFormik.errors.otp}</span>
              </div>
            )}
          </div>
          <div className="flex justify-between items-center">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              ← Back to email
            </button>
            <button
              type="button"
              onClick={handleResendOTP}
              disabled={resending}
              className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors disabled:opacity-50"
            >
              {resending ? 'Sending...' : 'Resend OTP'}
            </button>
          </div>
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 transition-all duration-200 text-white border-0 py-3 px-4 rounded-lg font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-base flex items-center justify-center"
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Verifying...</span>
              </div>
            ) : (
              'Verify OTP'
            )}
          </button>
        </form>
      </div>
    </motion.div>
  );

  const renderPasswordStep = () => (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="text-center space-y-4 px-8 pb-8 sm:px-10 sm:pb-10">
        <div className="mx-auto w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
          <Lock className="w-8 h-8 text-white" />
        </div>
        <div className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          Reset Password
        </div>
        <div className="text-gray-600 dark:text-gray-300">
          Step 3: Create your new password
        </div>
      </div>
      <div className="px-8 pb-8">
        <form className="space-y-4" onSubmit={passwordFormik.handleSubmit} autoComplete="on">
          <div className="space-y-2">
            <label htmlFor="password" className="text-gray-700 dark:text-gray-200">New Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              className="bg-white/70 dark:bg-gray-700/70 border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-purple-500 transition-all duration-200 appearance-none rounded-lg block w-full px-4 py-2 border text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none sm:text-base"
              placeholder="Enter your new password"
              {...passwordFormik.getFieldProps('password')}
            />
            {passwordFormik.touched.password && passwordFormik.errors.password && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2 flex items-center space-x-2 mt-1">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="text-red-800 dark:text-red-200 text-sm">{passwordFormik.errors.password}</span>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-gray-700 dark:text-gray-200">Confirm New Password</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              className="bg-white/70 dark:bg-gray-700/70 border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-purple-500 transition-all duration-200 appearance-none rounded-lg block w-full px-4 py-2 border text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none sm:text-base"
              placeholder="Confirm your new password"
              {...passwordFormik.getFieldProps('confirmPassword')}
            />
            {passwordFormik.touched.confirmPassword && passwordFormik.errors.confirmPassword && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2 flex items-center space-x-2 mt-1">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="text-red-800 dark:text-red-200 text-sm">{passwordFormik.errors.confirmPassword}</span>
              </div>
            )}
          </div>
          <div className="flex justify-start">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              ← Back to OTP
            </button>
          </div>
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 transition-all duration-200 text-white border-0 py-3 px-4 rounded-lg font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-base flex items-center justify-center"
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Resetting Password...</span>
              </div>
            ) : (
              'Reset Password'
            )}
          </button>
        </form>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-black text-white px-4 py-12">
      <div className="w-full max-w-md shadow-2xl border border-white/30 dark:border-gray-700/50 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-2xl">
        {renderStepIndicator()}
        {step === 1 && renderEmailStep()}
        {step === 2 && renderOTPStep()}
        {step === 3 && renderPasswordStep()}
      </div>
    </div>
  );
} 
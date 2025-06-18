import { useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import toast from 'react-hot-toast';
import { verifyResetOTP, forgotPassword } from '../../services/api';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { KeyRound } from 'lucide-react';

export default function ResetOTP() {
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email;

  const formik = useFormik({
    initialValues: { otp: '' },
    validationSchema: Yup.object({
      otp: Yup.string().required('OTP is required').matches(/^\d{6}$/, 'OTP must be 6 digits'),
    }),
    onSubmit: async (values) => {
      try {
        setLoading(true);
        await verifyResetOTP(email, values.otp);
        toast.success('OTP verified!');
        navigate('/reset-password', { state: { email, otp: values.otp } });
      } catch (error) {
        toast.error(error.response?.data?.message || 'OTP verification failed');
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

  if (!email) {
    navigate('/forgot-password');
    return null;
  }

  const cardVariants = {
    hidden: { opacity: 0, y: 40, scale: 0.98 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.5, ease: 'easeOut' },
    },
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-black text-white px-4 py-12">
      <motion.div
        className="w-full max-w-md p-8 sm:p-10 bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 space-y-8"
        variants={cardVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="flex flex-col items-center space-y-2">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 mb-2 shadow-lg">
            <KeyRound className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-center text-white">Verify OTP</h2>
          <p className="text-center text-sm text-gray-300">
            Enter the 6-digit OTP sent to your email.
          </p>
        </div>
        <form className="space-y-6" onSubmit={formik.handleSubmit} autoComplete="on">
          <div className="space-y-4">
            <div>
              <label htmlFor="otp" className="sr-only">OTP</label>
              <input
                id="otp"
                name="otp"
                type="text"
                autoComplete="one-time-code"
                required
                maxLength={6}
                className={`appearance-none rounded-lg block w-full px-4 py-3 border text-white bg-gray-800/80 border-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 sm:text-base transition duration-300 ${formik.touched.otp && formik.errors.otp ? 'border-red-500 bg-red-500/10' : ''}`}
                placeholder="Enter OTP"
                {...formik.getFieldProps('otp')}
              />
              {formik.touched.otp && formik.errors.otp && (
                <div className="text-red-500 text-sm mt-1">{formik.errors.otp}</div>
              )}
            </div>
          </div>
          <div className="flex justify-between items-center">
            <button
              type="button"
              className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors focus:outline-none"
              onClick={handleResendOTP}
              disabled={resending}
            >
              {resending ? 'Resending...' : 'Resend OTP'}
            </button>
            <button
              type="submit"
              className="py-3 px-6 rounded-lg font-semibold text-white bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 shadow-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 text-base"
              disabled={loading}
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
} 
import { useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import toast from 'react-hot-toast';
import { forgotPassword } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail } from 'lucide-react';

export default function ForgotPassword() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const formik = useFormik({
    initialValues: { email: '' },
    validationSchema: Yup.object({
      email: Yup.string().email('Invalid email address').required('Email is required'),
    }),
    onSubmit: async (values) => {
      try {
        setLoading(true);
        await forgotPassword(values.email);
        toast.success('OTP sent to your email!');
        navigate('/reset-otp', { state: { email: values.email } });
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to send OTP');
      } finally {
        setLoading(false);
      }
    },
  });

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
            <Mail className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-center text-white">Forgot Password</h2>
          <p className="text-center text-sm text-gray-300">
            Enter your email to receive a password reset OTP.
          </p>
        </div>
        <form className="space-y-6" onSubmit={formik.handleSubmit} autoComplete="on">
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="sr-only">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className={`appearance-none rounded-lg block w-full px-4 py-3 border text-white bg-gray-800/80 border-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 sm:text-base transition duration-300 ${formik.touched.email && formik.errors.email ? 'border-red-500 bg-red-500/10' : ''}`}
                placeholder="Email address"
                {...formik.getFieldProps('email')}
              />
              {formik.touched.email && formik.errors.email && (
                <div className="text-red-500 text-sm mt-1">{formik.errors.email}</div>
              )}
            </div>
          </div>
          <button
            type="submit"
            className="w-full py-3 px-4 rounded-lg font-semibold text-white bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 shadow-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 text-base"
            disabled={loading}
          >
            {loading ? 'Sending OTP...' : 'Send OTP'}
          </button>
        </form>
      </motion.div>
    </div>
  );
} 
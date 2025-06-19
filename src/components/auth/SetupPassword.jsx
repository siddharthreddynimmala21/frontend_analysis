import { useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import toast from 'react-hot-toast';
import { setupPassword } from '../../services/api';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, AlertTriangle } from 'lucide-react';

export default function SetupPassword() {
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email;
  const otp = location.state?.otp;

  const formik = useFormik({
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
        await setupPassword(email, otp, values.password);
        toast.success('Password set successfully!');
        navigate('/login');
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to set password');
      } finally {
        setLoading(false);
      }
    },
  });

  if (!email || !otp) {
    navigate('/register');
    return null;
  }

  const cardVariants = {
    hidden: { opacity: 0, y: 40, scale: 0.98 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: 'easeOut',
      },
    },
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-black text-white px-4 py-12">
      <div className="w-full max-w-md shadow-2xl border border-white/30 dark:border-gray-700/50 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-2xl">
        <div className="text-center space-y-4 p-8 sm:p-10">
          <div className="mx-auto w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
            <div className="w-8 h-8 bg-white rounded-sm transform rotate-12"></div>
          </div>
          <div className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Set Your Password
          </div>
          <div className="text-gray-600 dark:text-gray-300">
            Create a strong password for your account.
          </div>
        </div>
        <div className="px-8 pb-8">
          <form className="space-y-4" onSubmit={formik.handleSubmit} autoComplete="on">
            <div className="space-y-2">
              <label htmlFor="password" className="text-gray-700 dark:text-gray-200">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="bg-white/70 dark:bg-gray-700/70 border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-purple-500 transition-all duration-200 appearance-none rounded-lg block w-full px-4 py-2 border text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none sm:text-base"
                placeholder="Enter password"
                {...formik.getFieldProps('password')}
              />
              {formik.touched.password && formik.errors.password && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2 flex items-center space-x-2 mt-1">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span className="text-red-800 dark:text-red-200 text-sm">{formik.errors.password}</span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-gray-700 dark:text-gray-200">Confirm Password</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                className="bg-white/70 dark:bg-gray-700/70 border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-purple-500 transition-all duration-200 appearance-none rounded-lg block w-full px-4 py-2 border text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none sm:text-base"
                placeholder="Confirm password"
                {...formik.getFieldProps('confirmPassword')}
              />
              {formik.touched.confirmPassword && formik.errors.confirmPassword && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2 flex items-center space-x-2 mt-1">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span className="text-red-800 dark:text-red-200 text-sm">{formik.errors.confirmPassword}</span>
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
                  <span>Setting password...</span>
                </div>
              ) : (
                'Set Password'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

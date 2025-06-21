import { useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import toast from 'react-hot-toast';
import { login } from '../../services/api';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';
import { LogIn, AlertTriangle } from 'lucide-react';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();

  const formik = useFormik({
    initialValues: {
      email: '',
      password: '',
    },
    validationSchema: Yup.object({
      email: Yup.string()
        .email('Invalid email address')
        .required('Email is required'),
      password: Yup.string().required('Password is required'),
    }),
    onSubmit: async (values) => {
      try {
        setLoading(true);
        const response = await login(values.email, values.password);
        authLogin(response.token);
        toast.success('Login successful!');
        navigate('/dashboard');
      } catch (error) {
        toast.error(error.response?.data?.message || 'Login failed');
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
            ResumeRefiner Pro+
          </div>
          <div className="text-gray-600 dark:text-gray-300">
            AI-Powered Resume Analysis & Enhancement
          </div>
        </div>
        <div className="px-8 pb-8">
          <form className="space-y-4" onSubmit={formik.handleSubmit} autoComplete="on">
            <div className="space-y-2">
              <label htmlFor="email" className="text-gray-700 dark:text-gray-200">Mail ID</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="bg-white/70 dark:bg-gray-700/70 border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-purple-500 transition-all duration-200 appearance-none rounded-lg block w-full px-4 py-2 border text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none sm:text-base"
                placeholder="Enter your ID"
                {...formik.getFieldProps('email')}
              />
              {formik.touched.email && formik.errors.email && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2 flex items-center space-x-2 mt-1">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span className="text-red-800 dark:text-red-200 text-sm">{formik.errors.email}</span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-gray-700 dark:text-gray-200">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="bg-white/70 dark:bg-gray-700/70 border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-purple-500 transition-all duration-200 appearance-none rounded-lg block w-full px-4 py-2 border text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none sm:text-base"
                placeholder="Enter your password"
                {...formik.getFieldProps('password')}
              />
              {formik.touched.password && formik.errors.password && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2 flex items-center space-x-2 mt-1">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span className="text-red-800 dark:text-red-200 text-sm">{formik.errors.password}</span>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between mt-2 mb-2">
              <span className="h-px flex-1 bg-white/10" />
              <span className="px-3 text-xs text-gray-400">or</span>
              <span className="h-px flex-1 bg-white/10" />
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors focus:outline-none"
                tabIndex={-1}
                onClick={() => navigate('/forgot-password')}
              >
                Forgot password?
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
                  <span>Signing In...</span>
                </div>
              ) : (
                'Sign In'
              )}
            </button>
            <div className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
              Or{' '}
              <Link
                to="/register"
                className="font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                create a new account
              </Link>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}

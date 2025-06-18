import { useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import toast from 'react-hot-toast';
import { login } from '../../services/api';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';
import { LogIn } from 'lucide-react';

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
      <motion.div
        className="w-full max-w-md p-8 sm:p-10 bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 space-y-8"
        variants={cardVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="flex flex-col items-center space-y-2">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 mb-2 shadow-lg">
            <LogIn className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-center text-white">Sign in to your account</h2>
          <p className="text-center text-sm text-gray-300">
            Or{' '}
            <Link
              to="/register"
              className="font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              create a new account
            </Link>
          </p>
        </div>
        <form className="space-y-6" onSubmit={formik.handleSubmit} autoComplete="on">
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className={`appearance-none rounded-lg block w-full px-4 py-3 border text-white bg-gray-800/80 border-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 sm:text-base transition duration-300 ${
                  formik.touched.email && formik.errors.email
                    ? 'border-red-500 bg-red-500/10'
                    : ''
                }`}
                placeholder="Email address"
                {...formik.getFieldProps('email')}
              />
              {formik.touched.email && formik.errors.email && (
                <div className="text-red-500 text-sm mt-1">{formik.errors.email}</div>
              )}
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className={`appearance-none rounded-lg block w-full px-4 py-3 border text-white bg-gray-800/80 border-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 sm:text-base transition duration-300 ${
                  formik.touched.password && formik.errors.password
                    ? 'border-red-500 bg-red-500/10'
                    : ''
                }`}
                placeholder="Password"
                {...formik.getFieldProps('password')}
              />
              {formik.touched.password && formik.errors.password && (
                <div className="text-red-500 text-sm mt-1">{formik.errors.password}</div>
              )}
            </div>
          </div>

          {/* Divider and forgot password placeholder */}
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
            className="w-full py-3 px-4 rounded-lg font-semibold text-white bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 shadow-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 text-base"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

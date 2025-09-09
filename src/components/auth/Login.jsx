import { useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import toast from 'react-hot-toast';
import { login } from '../../services/api';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogIn, AlertTriangle, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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
        // Persist token and email for later use
        if (response?.user?.email) {
          localStorage.setItem('email', response.user.email);
        }
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
    <div className="min-h-screen flex items-center justify-center bg-white text-gray-900 px-4 py-12">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-xl border border-gray-200">
        {/* Header with logo and tabs */}
        <div className="p-6">
          <div className="flex justify-center items-center gap-2 mb-4 select-none">
            <img src="/new_logo.png" alt="ResumeRefiner Logo" className="w-10 h-10 object-contain" />
            <span className="text-xl font-semibold tracking-tight">ResumeRefiner</span>
          </div>
          <div className="flex bg-gray-200 rounded-lg p-1">
            <button type="button" className="flex-1 py-2 rounded-md bg-white border border-gray-200 text-gray-900 font-medium">Login</button>
            <Link to="/register" className="flex-1 py-2 rounded-md text-center text-gray-500 hover:text-gray-700">Sign Up</Link>
          </div>
        </div>

        {/* Form */}
        <div className="px-6 pb-6">
          <form className="space-y-4" onSubmit={formik.handleSubmit} autoComplete="on">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm text-gray-700">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="bg-white border border-gray-300 focus:ring-2 focus:ring-gray-300 transition-all duration-200 appearance-none rounded-md block w-full px-4 py-2 text-gray-900 placeholder-gray-400 focus:outline-none sm:text-sm"
                placeholder="name@email.com"
                {...formik.getFieldProps('email')}
              />
              {formik.touched.email && formik.errors.email && (
                <div className="bg-red-50 border border-red-200 rounded-md px-3 py-2 flex items-center space-x-2 mt-1">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span className="text-red-700 text-xs">{formik.errors.email}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm text-gray-700">Password</label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className="bg-white border border-gray-300 focus:ring-2 focus:ring-gray-300 transition-all duration-200 appearance-none rounded-md block w-full pr-10 px-4 py-2 text-gray-900 placeholder-gray-400 focus:outline-none sm:text-sm"
                  placeholder="••••••••"
                  {...formik.getFieldProps('password')}
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

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
              <button
                type="button"
                className="text-gray-600 hover:text-gray-800 w-full sm:w-auto text-center"
                tabIndex={-1}
                onClick={() => navigate('/forgot-password')}
              >
                Forgot Password?
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-black text-white rounded-md text-sm disabled:opacity-60 w-full sm:w-auto"
                disabled={loading}
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </div>

            <div className="text-center text-sm text-gray-600 mt-4">
              Or{' '}
              <Link
                to="/register"
                className="font-medium text-gray-900 hover:underline"
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

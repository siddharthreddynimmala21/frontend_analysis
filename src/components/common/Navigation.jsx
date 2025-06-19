import { ArrowLeft, LogOut, Sun, Moon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export default function Navigation({ showBack = false }) {
  const navigate = useNavigate();
  const { logout } = useAuth?.() || {};
  const { theme, toggleTheme } = useTheme();

  return (
    <nav className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 w-[95vw] max-w-5xl flex items-center justify-between px-6 py-3 rounded-2xl bg-white/20 dark:bg-white/10 backdrop-blur-2xl border border-white/30 shadow-2xl transition-all duration-300">
      {/* Left: Logo and App Name */}
      <div className="flex items-center space-x-3 cursor-pointer select-none" onClick={() => navigate('/dashboard')}>
        <div className="w-12 h-12 flex items-center justify-center">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
            <div className="w-5 h-5 bg-white rounded-md transform rotate-12"></div>
          </div>
        </div>
        <span className="text-2xl font-bold white tracking-tight">Resume AI</span>
      </div>
      {/* Center: Back (optional) */}
      <div className="flex items-center space-x-2">
      {showBack && (
        <button
          onClick={() => navigate(-1)}
          className="flex items-center space-x-2 px-3 py-2 rounded-lg text-white/70 hover:bg-white/20 hover:text-white transition-colors duration-300"
          aria-label="Go back"
        >
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>
      )}
      </div>
      {/* Right: Theme Switcher and Logout */}
      <div className="flex items-center space-x-2">
        <button
          onClick={toggleTheme}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200 text-base font-semibold"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        {logout && (
      <button
            onClick={logout}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-200 dark:hover:border-red-800 hover:text-red-600 dark:hover:text-red-400 transition-all duration-200 text-base font-semibold"
            aria-label="Log out"
      >
            <LogOut className="w-4 h-4 mr-2" />
            <span>Logout</span>
      </button>
        )}
    </div>
    </nav>
  );
} 
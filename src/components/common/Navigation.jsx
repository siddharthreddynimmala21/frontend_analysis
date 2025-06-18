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
        <img src="/vite.svg" alt="Logo" className="w-8 h-8" />
        <span className="text-2xl font-bold text-cyan-400 tracking-tight">Resume AI</span>
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
          className="flex items-center justify-center w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 text-cyan-400 transition-colors shadow-md"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        {logout && (
          <button
            onClick={logout}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg text-white bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 shadow-lg transition-all duration-300 font-semibold"
            aria-label="Log out"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        )}
      </div>
    </nav>
  );
} 
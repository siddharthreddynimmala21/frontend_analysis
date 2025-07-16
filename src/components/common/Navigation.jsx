import { ArrowLeft, LogOut, Menu } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useState } from 'react';
import ConfirmationDialog from './ConfirmationDialog';

export default function Navigation({ showBack = false, setSidebarOpen }) {
  const navigate = useNavigate();
  const { logout } = useAuth?.() || {};
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    logout();
    setShowLogoutConfirm(false);
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  const location = useLocation();
  const isChatPage = location.pathname === '/chat';

  const navClasses = `fixed top-2 sm:top-6 z-40 flex items-center justify-between px-3 sm:px-6 py-2 sm:py-3 rounded-2xl bg-white/20 dark:bg-white/10 backdrop-blur-2xl border border-white/30 shadow-2xl transition-all duration-300 w-[95vw] max-w-5xl left-1/2 transform -translate-x-1/2 ${isChatPage ? 'lg:left-[25vw] lg:right-0 lg:mx-auto lg:max-w-5xl lg:transform-none' : 'lg:mx-auto'}`;

  return (
    <>
      <nav className={navClasses}>
        {/* Left: Logo and App Name */}
        <div className="flex items-center space-x-2 sm:space-x-3 cursor-pointer select-none">
          {isChatPage && setSidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1 hover:bg-white/10 rounded"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div
            onClick={() => navigate('/dashboard')}
            className="flex items-center space-x-2 sm:space-x-3 cursor-pointer select-none"
          >
            <div className="w-8 h-8 sm:w-12 sm:h-12 flex items-center justify-center">
              <div className="w-7 h-7 sm:w-10 sm:h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <div className="w-3 h-3 sm:w-5 sm:h-5 bg-white rounded-md transform rotate-12"></div>
              </div>
            </div>
            <span className="text-lg sm:text-2xl font-semibold tracking-tight">ResumeRefiner Pro+</span>
          </div>
        </div>

        {/* Center: Back button placeholder (not shown) */}
        <div className="flex items-center space-x-2">
          {/* Optionally add back button logic here if showBack is true */}
        </div>

        {/* Right: Logout */}
        <div className="flex items-center space-x-2">
          {logout && (
            <button
              onClick={handleLogout}
              className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-1 sm:py-2 rounded-lg bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-200 dark:hover:border-red-800 hover:text-red-600 dark:hover:text-red-400 transition-all duration-200 text-sm sm:text-base font-semibold"
              aria-label="Log out"
            >
              <LogOut className="w-4 h-4 mr-2" />
              <span className="hidden xs:inline">Logout</span>
            </button>
          )}
        </div>
      </nav>

      {showLogoutConfirm && (
        <ConfirmationDialog
          message={
            <div className="text-center">
              <div className="text-xl font-semibold text-white mb-2">See you soon!</div>
              <div className="text-lg text-gray-300">Are you sure want to logout?</div>
            </div>
          }
          onConfirm={confirmLogout}
          onCancel={cancelLogout}
          confirmText="Yes, logout"
          cancelText="Cancel"
        />
      )}
    </>
  );
}

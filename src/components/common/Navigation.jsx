import { ArrowLeft, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Navigation({ showBack = true }) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center space-x-4">
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
      <button
        onClick={() => navigate('/dashboard')}
        className="flex items-center space-x-2 px-3 py-2 rounded-lg text-white/70 hover:bg-white/20 hover:text-white transition-colors duration-300"
        aria-label="Go to dashboard"
      >
        <Home size={20} />
        <span>Home</span>
      </button>
    </div>
  );
} 
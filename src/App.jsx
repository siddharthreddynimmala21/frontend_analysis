import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Chat from './components/Chat';
import Dashboard from './components/Dashboard';
import ResumeAnalysis from './components/ResumeAnalysis';
import UploadResume from './components/UploadResume';
import ArrayMean from './components/ArrayMean';
import ResumeAnalyzer from './components/ResumeAnalyzer';
import ForgotPassword from './components/auth/ForgotPassword';
import AIInterview from './components/AIInterview';
import Landing from './components/Landing';

function App() {
  return (
    <ThemeProvider>
    <Router>
      <AuthProvider>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <Chat />
              </ProtectedRoute>
            }
          />
          <Route
            path="/resume-analysis"
            element={
              <ProtectedRoute>
                <ResumeAnalysis />
              </ProtectedRoute>
            }
          />
          <Route
            path="/upload-resume"
            element={
              <ProtectedRoute>
                <UploadResume />
              </ProtectedRoute>
            }
          />
          <Route
            path="/array-mean"
            element={
              <ProtectedRoute>
                <ArrayMean />
              </ProtectedRoute>
            }
          />
          <Route
            path="/resume-analyzer"
            element={
              <ProtectedRoute>
                <ResumeAnalyzer />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ai-interview"
            element={
              <ProtectedRoute>
                <AIInterview />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Landing />} />
        </Routes>
      </AuthProvider>
    </Router>
    </ThemeProvider>
  );
}

export default App;

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import Cookies from 'js-cookie';
import axios from 'axios';

const AuthContext = createContext(null);

// Use relative URL in production, absolute URL in development
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Function to refresh the access token
  const refreshToken = useCallback(async () => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/auth/refresh-token`,
        {},
        { withCredentials: true } // Important for sending cookies
      );
      
      if (response.data && response.data.accessToken) {
        localStorage.setItem('token', response.data.accessToken);
        return response.data.accessToken;
      }
      return null;
    } catch (error) {
      console.error('Error refreshing token:', error);
      // If refresh fails, log the user out
      localStorage.removeItem('token');
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    // Check if user is logged in by verifying the token in localStorage
    const token = localStorage.getItem('token');
    if (token) {
      setUser({ token });
      
      // Set up interceptor to handle token expiration
      const interceptor = axios.interceptors.response.use(
        (response) => response,
        async (error) => {
          const originalRequest = error.config;
          
          // If error is 401 and we haven't tried to refresh the token yet
          if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            
            // Try to refresh the token
            const newToken = await refreshToken();
            if (newToken) {
              // Update the authorization header
              originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
              return axios(originalRequest);
            }
          }
          
          return Promise.reject(error);
        }
      );
      
      // Important: Set loading to false after setting up the user
      setLoading(false);
      
      // Clean up interceptor on unmount
      return () => {
        axios.interceptors.response.eject(interceptor);
      };
    } else {
      setLoading(false);
    }
  }, [refreshToken]);

  const login = (token, rememberMe = false) => {
    localStorage.setItem('token', token);
    setUser({ token });
  };

  const logout = async () => {
    try {
      // Call the logout endpoint to invalidate the refresh token
      await axios.post(
        `${API_BASE_URL}/api/auth/logout`,
        {},
        { withCredentials: true } // Important for sending cookies
      );
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      // Always clear local storage and state
      localStorage.removeItem('token');
      setUser(null);
    }
  };

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

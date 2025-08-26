import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Function to check if token is valid (not expired)
  const isTokenValid = (token) => {
    if (!token) return false;
    
    try {
      // JWT tokens are in format: header.payload.signature
      // We need to decode the payload (middle part)
      const payload = token.split('.')[1];
      if (!payload) return false;
      
      // Decode the base64 payload
      const decodedPayload = JSON.parse(atob(payload));
      
      // Check if token is expired
      const currentTime = Math.floor(Date.now() / 1000); // Current time in seconds
      return decodedPayload.exp > currentTime;
    } catch (error) {
      console.error('Error validating token:', error);
      return false;
    }
  };

  useEffect(() => {
    // Check if user is logged in by verifying the token in localStorage
    const token = localStorage.getItem('token');
    
    if (token && isTokenValid(token)) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const isAdmin = !!payload.isAdmin;
        setUser({ token, isAdmin });
      } catch (e) {
        setUser({ token });
      }
    } else if (token) {
      // Token exists but is invalid - remove it
      localStorage.removeItem('token');
    }
    
    setLoading(false);
  }, []);

  const login = (token) => {
    localStorage.setItem('token', token);
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const isAdmin = !!payload.isAdmin;
      setUser({ token, isAdmin });
    } catch (e) {
      setUser({ token });
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('email');
    setUser(null);
  };

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
    isAdmin: !!user?.isAdmin,
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

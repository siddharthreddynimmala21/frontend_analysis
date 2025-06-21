import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  // Always use dark theme
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    // Always apply dark theme
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
    localStorage.setItem('theme', 'dark');
  }, []);

  // Removed toggle functionality since we're always using dark theme
  const toggleTheme = () => {
    // No-op function to maintain API compatibility
    return;
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

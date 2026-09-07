import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getMe } from '../api';
import { TOKEN_KEY } from '../utils/constants';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      getMe()
        .then(res => {
          if (!cancelled) setUser(res.data.user);
        })
        .catch(() => {
          if (!cancelled) {
            localStorage.removeItem(TOKEN_KEY);
            setUser(null);
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    } else {
      setLoading(false);
    }
    return () => { cancelled = true; };
  }, []);

  const loginUser = useCallback((token, userData) => {
    localStorage.setItem(TOKEN_KEY, token);
    setUser(userData);
    setError(null);
  }, []);

  const logoutUser = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, error, loginUser, logoutUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

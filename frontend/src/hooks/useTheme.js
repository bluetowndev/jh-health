import { useState, useCallback } from 'react';
import { THEME_KEY } from '../utils/constants';

function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', t === 'dark' ? 'dark' : 'light');
}

function getInitialTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark' || saved === 'light') {
      applyTheme(saved);
      return saved;
    }
  } catch {
    // localStorage unavailable (private browsing, quota exceeded)
  }
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  const t = prefersDark ? 'dark' : 'light';
  applyTheme(t);
  return t;
}

export default function useTheme() {
  const [theme, setTheme] = useState(getInitialTheme);

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  return { theme, toggleTheme };
}

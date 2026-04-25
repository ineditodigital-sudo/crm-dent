import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

export const ThemeToggle = () => {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  return (
    <button 
      onClick={() => setIsDark(!isDark)}
      className="nav-theme-toggle"
      aria-label="Toggle Theme"
      title="Cambiar Modo Claro/Oscuro"
    >
      {isDark ? <Sun size={20} className="text-warning" /> : <Moon size={20} className="text-accent" />}
      <style>{`
        .nav-theme-toggle {
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: var(--bg-surface);
          border: 1px solid var(--glass-border);
          box-shadow: var(--shadow-ios);
          transition: var(--transition);
        }
        .nav-theme-toggle:hover {
          transform: scale(1.05);
          background: var(--bg-card);
        }
      `}</style>
    </button>
  );
};

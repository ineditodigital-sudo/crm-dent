import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const ThemeToggle = () => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button 
      onClick={toggleTheme}
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

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
          width: 42px;
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          transition: var(--transition);
          color: var(--text-primary);
        }
        .nav-theme-toggle:hover {
          transform: translateY(-2px);
          background: var(--bg-surface);
          border-color: var(--primary);
        }
        @media (max-width: 768px) {
          .nav-theme-toggle {
            width: 40px;
            height: 40px;
            background: var(--bg-surface);
            border-color: var(--glass-border);
          }
        }
      `}</style>
    </button>
  );
};

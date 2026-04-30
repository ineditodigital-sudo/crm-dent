import React, { useState } from 'react';
import { ShieldCheck, User, Lock, Activity, AlertCircle } from 'lucide-react';
import { Logo } from '../components/Logo';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(username, password);
      // La redirección la maneja App.tsx al detectar que el user cambió
    } catch (err: any) {
      setError(err.message || 'Error de conexión. Verifica que el servidor esté activo.');
      setLoading(false);
    }
  };

  return (
    <div className="login-page-ios">
      <div className="login-card glass-card animate-ios">
        <div className="login-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
           <Logo size="large" className="mb-4" />
           <p style={{ marginTop: '1.5rem' }}>Introduce tus credenciales para acceder al CRM</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="input-group-ios">
            <User size={18} />
            <input 
              type="text" 
              placeholder="Usuario" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </div>
          <div className="input-group-ios">
            <Lock size={18} />
            <input 
              type="password" 
              placeholder="Contraseña" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <div className="login-error animate-shake">
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          <button type="submit" className="login-btn-ios" disabled={loading}>
            {loading 
              ? <Activity className="animate-spin" size={20} /> 
              : <><ShieldCheck size={20} /> Entrar al Sistema</>
            }
          </button>
        </form>
      </div>

      <style>{`
        .login-page-ios {
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-app);
          background-image: radial-gradient(circle at 20% 20%, rgba(0, 122, 255, 0.05) 0%, transparent 40%),
                            radial-gradient(circle at 80% 80%, rgba(88, 86, 214, 0.05) 0%, transparent 40%);
        }
        .login-card {
          width: 100%;
          max-width: 400px;
          padding: 3rem;
          border-radius: 30px;
          text-align: center;
        }
        .login-header { margin-bottom: 2.5rem; }
        .login-header p { color: var(--text-muted); font-size: 0.9rem; }

        .input-group-ios {
          background: var(--bg-app);
          border-radius: 16px;
          display: flex; align-items: center;
          gap: 1rem;
          padding: 0 1.25rem;
          margin-bottom: 1rem;
          border: 1px solid transparent;
          transition: var(--transition);
        }
        .input-group-ios:focus-within { border-color: var(--primary); box-shadow: 0 0 0 4px var(--primary-light); }
        .input-group-ios input {
          flex: 1;
          background: none;
          border: none;
          height: 50px;
          font-size: 1rem;
          color: var(--text-primary);
          outline: none;
        }
        .input-group-ios svg { color: var(--text-muted); flex-shrink: 0; }

        .login-btn-ios {
          width: 100%;
          height: 54px;
          background: var(--primary);
          color: white;
          border-radius: 16px;
          font-weight: 700;
          font-size: 1rem;
          display: flex; align-items: center; justify-content: center;
          gap: 0.75rem;
          margin-top: 2rem;
          box-shadow: 0 10px 20px var(--primary-light);
          cursor: pointer;
          transition: var(--transition);
          border: none;
        }
        .login-btn-ios:hover { transform: translateY(-2px); box-shadow: 0 15px 30px var(--primary-light); }
        .login-btn-ios:disabled { opacity: 0.7; transform: none; cursor: not-allowed; }

        .login-error { 
          color: #ff3b30; 
          font-size: 0.85rem; 
          font-weight: 600; 
          margin-top: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          padding: 0.6rem 1rem;
          background: rgba(255, 59, 48, 0.08);
          border-radius: 10px;
        }
        .animate-shake {
          animation: shake 0.4s ease;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%       { transform: translateX(-8px); }
          40%       { transform: translateX(8px); }
          60%       { transform: translateX(-5px); }
          80%       { transform: translateX(5px); }
        }

        @media (max-width: 500px) {
          .login-card {
            padding: 1.5rem;
            max-width: 90%;
            border-radius: 20px;
          }
          .login-header h1 { font-size: 1.5rem; }
          .login-header p { font-size: 0.8rem; margin-top: 1rem; }
          .input-group-ios input { height: 44px; font-size: 0.9rem; }
          .login-btn-ios { height: 48px; font-size: 0.9rem; margin-top: 1.5rem; }
        }
      `}</style>
    </div>
  );
};

export default LoginPage;

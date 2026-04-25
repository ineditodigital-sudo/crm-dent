import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Conversations from './pages/Conversations';
import CalendarPage from './pages/Calendar';
import Landing from './pages/Landing';
import LoginPage from './pages/Login';
import WebEditor from './pages/WebEditor';
import PatientsPage from './pages/Patients';
import ReportsPage from './pages/Reports';
import ServicesPage from './pages/Services';
import ConnectionsPage from './pages/Connections';
import BusinessPage from './pages/Business';
import { ThemeToggle } from './components/ThemeToggle';
import { Smartphone, Plus, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BrandProvider, useBrand } from './context/BrandContext';

const API_URL = '';

const WhatsAppStatus = () => {
  const { authFetch } = useAuth();
  const [status, setStatus] = React.useState({ connected: false, qr: null });
  
  React.useEffect(() => {
    const check = () => {
      authFetch(`${API_URL}/api/whatsapp/status`)
        .then(res => res.ok ? res.json() : { connected: false, qr: null })
        .then(data => setStatus(data))
        .catch(() => setStatus({ connected: false, qr: null }));
    };
    check();
    const interval = setInterval(check, 10000);
    return () => clearInterval(interval);
  }, [authFetch]);

  if (status.connected) {
    return (
      <Link to="/connect" className="wa-status-pill connected glass-card">
        <div className="status-dot" />
        <span>WhatsApp Conectado</span>
      </Link>
    );
  }

  return (
    <Link to="/connect" className="wa-status-pill disconnected glass-card">
      <Smartphone size={14} />
      <span>{status.qr ? 'Escanea QR' : 'WhatsApp Offline'}</span>
    </Link>
  );
};

const CRMLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { brand } = useBrand();

  const pathLabel: Record<string, string> = {
    '/': 'Dashboard', '/conversations': 'Mensajes', '/calendar': 'Agenda',
    '/patients': 'Pacientes', '/services': 'Servicios', '/reports': 'Reportes',
    '/web-editor': 'Editor Web', '/connections': 'Conexiones', '/business': 'Negocio',
  };

  if (!user) return <Navigate to="/login" replace />;
  
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <header className="content-header glass-nav">
          <div className="header-breadcrumbs">
            {brand.logo_url ? (
              <img src={brand.logo_url} alt={brand.clinic_name} className="header-logo" />
            ) : (
              <span className="ios-label">{brand.clinic_name || 'CRM'}</span>
            )}
            <h2 className="current-path">{pathLabel[location.pathname] || location.pathname.slice(1)}</h2>
          </div>
          <div className="header-actions">
             <button className="new-appointment-btn">
               <Plus size={18} /> <span>Nueva Cita</span>
             </button>
             <WhatsAppStatus />
             <ThemeToggle />
             <div className="user-profile glass-card">
               <div className="u-avatar">{user.charAt(0).toUpperCase()}</div>
               <span className="u-name">{user}</span>
             </div>
             <button 
               className="logout-btn glass-card"
               onClick={logout}
               title="Cerrar sesión"
             >
               <LogOut size={16} />
             </button>
          </div>
        </header>
        <div className="scrollable-content">
          {children}
        </div>
      </main>
      <style>{`
        .app-layout {
          display: flex;
          height: 100vh;
          overflow: hidden;
          background-color: var(--bg-app);
        }
        .main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          position: relative;
          min-width: 0;
        }
        .content-header {
          padding: 1.25rem 2.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-shrink: 0;
        }
        .current-path { font-size: 1.25rem; font-weight: 700; color: var(--text-primary); }
        
        .header-actions { display: flex; align-items: center; gap: 1rem; flex-wrap: nowrap; }

        .new-appointment-btn {
          background: var(--primary);
          color: white;
          border: none;
          padding: 0.6rem 1.2rem;
          border-radius: var(--radius-full);
          font-weight: 700;
          font-size: 0.85rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          box-shadow: 0 8px 16px var(--primary-light);
          transition: var(--transition);
          white-space: nowrap;
        }
        .new-appointment-btn:hover { transform: translateY(-2px); box-shadow: 0 12px 24px var(--primary-light); }

        .logout-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          border: none;
          color: var(--text-muted);
          transition: var(--transition);
          background: transparent;
          flex-shrink: 0;
        }
        .logout-btn:hover { color: #ff3b30; background: rgba(255,59,48,0.1); }

        .wa-status-pill {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.4rem 1rem;
          border-radius: var(--radius-full);
          font-size: 0.75rem;
          font-weight: 700;
          text-decoration: none;
          transition: var(--transition);
          white-space: nowrap;
        }
        .wa-status-pill.connected { background: rgba(52, 199, 89, 0.1); color: #34c759; }
        .wa-status-pill.disconnected { background: rgba(255, 59, 48, 0.1); color: #ff3b30; }
        .status-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; flex-shrink: 0; }

        .scrollable-content {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 2.5rem;
        }

        .user-profile {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.4rem 1rem 0.4rem 0.4rem;
          border-radius: var(--radius-full);
        }
        .u-avatar {
          width: 32px;
          height: 32px;
          background: var(--primary);
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 0.8rem;
          flex-shrink: 0;
        }
        
        @media (max-width: 900px) {
          .app-layout { flex-direction: column; height: 100dvh; }
          /* Hide desktop header on mobile — Sidebar component renders its own mobile topbar */
          .content-header { display: none; }
          .scrollable-content { padding: 1rem; }
        }
      `}</style>
    </div>
  );
};

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" />} />
      <Route path="/landing" element={<Landing />} />
      
      <Route path="/" element={<CRMLayout><Dashboard /></CRMLayout>} />
      <Route path="/conversations" element={<CRMLayout><Conversations /></CRMLayout>} />
      <Route path="/calendar" element={<CRMLayout><CalendarPage /></CRMLayout>} />
      <Route path="/patients" element={<CRMLayout><PatientsPage /></CRMLayout>} />
      <Route path="/services" element={<CRMLayout><ServicesPage /></CRMLayout>} />
      <Route path="/reports" element={<CRMLayout><ReportsPage /></CRMLayout>} />
      <Route path="/web-editor" element={<CRMLayout><WebEditor /></CRMLayout>} />
      <Route path="/connections" element={<CRMLayout><ConnectionsPage /></CRMLayout>} />
      <Route path="/business" element={<CRMLayout><BusinessPage /></CRMLayout>} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <BrandProvider>
          <AppRoutes />
        </BrandProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;

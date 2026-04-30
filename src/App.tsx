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
import BusinessPage from './pages/Business';
import LogsPage from './pages/Logs';
import SEOPage from './pages/SEO';
import { ThemeToggle } from './components/ThemeToggle';
import { Smartphone, LogOut, Bell, Menu } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BrandProvider } from './context/BrandContext';

// --- Notification Bell con SSE ---
const NotificationBell = () => {
  const { token } = useAuth();

  const [count, setCount] = React.useState(0);
  const [show, setShow] = React.useState(false);
  const [notifications, setNotifications] = React.useState<{ id: number; text: string; time: string }[]>([]);

  React.useEffect(() => {
    // Pedir permiso de notificaciones push
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  React.useEffect(() => {
    if (!token) return;
    const evtSource = new EventSource(`/api/notifications/stream?token=${token}`);
    
    evtSource.addEventListener('new_message', (e) => {
      const data = JSON.parse(e.data);
      const newNotif = {
        id: Date.now(),
        text: `💬 ${data.patient_name || data.phone}: "${data.text}"`,
        time: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
      };
      setNotifications(prev => [newNotif, ...prev].slice(0, 10));
      setCount(c => c + 1);
      // Notificación push del navegador
      if (Notification.permission === 'granted') {
        new Notification('📱 Nuevo mensaje WhatsApp', {
          body: `${data.patient_name || data.phone}: ${data.text}`,
          icon: '/favicon.ico',
        });
      }
    });

    evtSource.addEventListener('appointment_created', (e) => {
      const data = JSON.parse(e.data);
      const newNotif = {
        id: Date.now(),
        text: `📅 Cita agendada: ${data.patient_name} - ${data.service}`,
        time: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
      };
      setNotifications(prev => [newNotif, ...prev].slice(0, 10));
      setCount(c => c + 1);
    });

    evtSource.onerror = () => evtSource.close();
    return () => evtSource.close();
  }, [token]);

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => { setShow(s => !s); setCount(0); }}
        style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: 'var(--text-muted)', position: 'relative', padding: '6px',
          borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'var(--transition)',
        }}
        title="Notificaciones"
      >
        <Bell size={20} />
        {count > 0 && (
          <span style={{
            position: 'absolute', top: 0, right: 0, background: '#ff3b30',
            color: 'white', borderRadius: '50%', width: '16px', height: '16px',
            fontSize: '10px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{count > 9 ? '9+' : count}</span>
        )}
      </button>
      {show && (
        <div style={{
          position: 'absolute', top: '110%', right: 0, width: '320px', maxHeight: '400px',
          overflowY: 'auto', background: 'var(--glass-bg)', backdropFilter: 'blur(20px)',
          border: '1px solid var(--border)', borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          zIndex: 1000, padding: '0.75rem',
        }}>
          <p style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 0.5rem 0.25rem' }}>
            NOTIFICACIONES
          </p>
          {notifications.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>Sin notificaciones</p>
          ) : notifications.map(n => (
            <div 
              key={n.id} 
              onClick={() => { setShow(false); window.location.href = '/admin/conversations'; }}
              style={{
                padding: '0.6rem 0.75rem', borderRadius: '10px', marginBottom: '0.4rem',
                background: 'var(--glass-bg)', border: '1px solid var(--border)',
                fontSize: '0.82rem', lineHeight: 1.4, cursor: 'pointer'
              }}
              className="notif-item"
            >
              <p style={{ margin: 0, color: 'var(--text-primary)' }}>{n.text}</p>
              <p style={{ margin: '2px 0 0', color: 'var(--text-muted)', fontSize: '0.75rem' }}>{n.time}</p>
            </div>
          ))}
        </div>
      )}
      <style>{`.notif-item:hover { background: var(--bg-app) !important; transform: translateX(3px); transition: 0.2s; }`}</style>
    </div>
  );
};


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
      <div className="wa-status-pill connected glass-card">
        <div className="status-dot" />
        <span>WhatsApp Conectado</span>
      </div>
    );
  }

  return (
    <div className="wa-status-pill disconnected glass-card">
      <Smartphone size={14} />
      <span>{status.qr ? 'Escanea QR' : 'WhatsApp Offline'}</span>
    </div>
  );
};

import SettingsPage from './pages/Settings';

const CRMLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  const pathLabel: Record<string, string> = {
    '/admin': 'Dashboard', '/admin/conversations': 'Mensajes', '/admin/calendar': 'Agenda',
    '/admin/patients': 'Pacientes', '/admin/services': 'Servicios', '/admin/reports': 'Reportes',
    '/admin/web-editor': 'Editor Web', '/admin/settings': 'Configuración', '/admin/business': 'Negocio', 
    '/admin/logs': 'Log Sistema', '/admin/seo': 'SEO & Marketing'
  };

  if (!user) return <Navigate to="/admin/login" replace />;
  
  return (
    <div className="app-layout">
      <Sidebar mobileOpen={isSidebarOpen} setMobileOpen={setIsSidebarOpen} />
      <main className="main-content">
        <header className="content-header glass-nav">
          <div className="header-breadcrumbs">
            <h2 className="current-path">{pathLabel[location.pathname] || 'Panel'}</h2>
          </div>
           <div className="header-actions">
             <NotificationBell />
             <div className="mobile-hide-status">
               <WhatsAppStatus />
             </div>
             <ThemeToggle />
             <div className="user-profile glass-card mobile-hide">
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
             <button 
               className="mobile-hamburger-trigger"
               onClick={() => setIsSidebarOpen(true)}
             >
               <Menu size={24} />
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
        .header-breadcrumbs { display: flex; align-items: center; gap: 1rem; }
        .mobile-hamburger-trigger {
          display: none;
          background: var(--bg-surface);
          border: 1px solid var(--glass-border);
          color: var(--text-primary);
          width: 40px;
          height: 40px;
          border-radius: 10px;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        @media (max-width: 900px) {
          .mobile-hamburger-trigger { display: flex; }
          .header-breadcrumbs { gap: 0.75rem; }
        }

        .current-path { font-size: 1.25rem; font-weight: 700; color: var(--text-primary); }

        .header-logo {
          height: 38px;
          width: auto;
          object-fit: contain;
          margin-right: 1rem;
        }

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
          .app-layout { 
            flex-direction: column; 
            height: 100dvh; 
            overflow: hidden; 
          }
          .main-content { flex: 1; min-height: 0; }
          .content-header { 
            padding: 0.75rem 1rem; 
            background: var(--glass-bg);
            border-bottom: 1px solid var(--glass-border);
          }
          .current-path { font-size: 1rem; }
          .header-actions { gap: 0.5rem; }
          .user-profile.mobile-hide { display: none; }
          .mobile-hide-status { display: none; }
          .logout-btn { display: flex; opacity: 1; color: #ff3b30; }
          .scrollable-content { 
            padding: 1rem; 
            height: 100%;
          }
        }
      `}</style>
    </div>
  );
};

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/admin/login" element={!user ? <LoginPage /> : <Navigate to="/admin" />} />
      
      <Route path="/admin" element={<CRMLayout><Dashboard /></CRMLayout>} />
      <Route path="/admin/conversations" element={<CRMLayout><Conversations /></CRMLayout>} />
      <Route path="/admin/calendar" element={<CRMLayout><CalendarPage /></CRMLayout>} />
      <Route path="/admin/patients" element={<CRMLayout><PatientsPage /></CRMLayout>} />
      <Route path="/admin/services" element={<CRMLayout><ServicesPage /></CRMLayout>} />
      <Route path="/admin/reports" element={<CRMLayout><ReportsPage /></CRMLayout>} />
      <Route path="/admin/web-editor" element={<CRMLayout><WebEditor /></CRMLayout>} />
      <Route path="/admin/settings" element={<CRMLayout><SettingsPage /></CRMLayout>} />
      <Route path="/admin/business" element={<CRMLayout><BusinessPage /></CRMLayout>} />
      <Route path="/admin/logs" element={<CRMLayout><LogsPage /></CRMLayout>} />
      <Route path="/admin/seo" element={<CRMLayout><SEOPage /></CRMLayout>} />

      {/* Fallback para login antiguo o rutas no encontradas en admin */}
      <Route path="/login" element={<Navigate to="/admin/login" replace />} />
      <Route path="/landing" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// ... styles inside CRMLayout or App ...

import { ThemeProvider } from './context/ThemeContext';

function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <BrandProvider>
            <AppRoutes />
          </BrandProvider>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;

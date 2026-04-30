import { 
  LayoutDashboard, 
  MessageSquare, 
  Calendar,
  Users, 
  BarChart3, 
  Settings,
  Globe,
  LayoutGrid,
  Building2,
  X,
  Search,
  ChevronRight
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { Logo } from './Logo';
import { useBrand } from '../context/BrandContext';
import { useTheme } from '../context/ThemeContext';

const navItems = [
  { icon: <LayoutDashboard size={18} />, label: 'Dashboard', path: '/admin' },
  { icon: <MessageSquare size={18} />, label: 'Mensajes', path: '/admin/conversations' },
  { icon: <Calendar size={18} />, label: 'Agenda', path: '/admin/calendar' },
  { icon: <Users size={18} />, label: 'Pacientes', path: '/admin/patients' },
  { icon: <LayoutGrid size={18} />, label: 'Servicios', path: '/admin/services' },
  { icon: <BarChart3 size={18} />, label: 'Reportes', path: '/admin/reports' },
  { icon: <Search size={18} />, label: 'SEO & Marketing', path: '/admin/seo' },
  { icon: <Building2 size={18} />, label: 'Negocio', path: '/admin/business' },
  { icon: <Globe size={18} />, label: 'Editor Web', path: '/admin/web-editor' },
  { icon: <Settings size={18} />, label: 'Configuración', path: '/admin/settings' },
];

const Sidebar = ({ mobileOpen, setMobileOpen }: { mobileOpen: boolean, setMobileOpen: (o: boolean) => void }) => {
  const { brand } = useBrand();
  const { isDark } = useTheme();

  const logoSrc = isDark ? (brand.logo_url || brand.logo_dark_url) : (brand.logo_dark_url || brand.logo_url);

  return (
    <>
      {/* ── MOBILE DRAWER OVERLAY ── */}
      {mobileOpen && (
        <div className="drawer-overlay" onClick={() => setMobileOpen(false)} />
      )}

      {/* ── SIDEBAR (desktop) + DRAWER (mobile) ── */}
      <aside className={`sidebar-glass ${mobileOpen ? 'drawer-open' : ''}`}>
        <div className="sidebar-header">
          {logoSrc ? (
            <img 
              src={logoSrc} 
              alt={brand.clinic_name} 
              className="sidebar-logo-img" 
              style={{ filter: isDark && !brand.logo_url ? 'invert(1) brightness(2)' : 'none' }}
            />
          ) : (
            <Logo />
          )}
          {/* Close button on mobile */}
          <button className="drawer-close-btn" onClick={() => setMobileOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav-ios">
          <span className="ios-label nav-section-label">Menú Principal</span>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => `nav-link-ios ${isActive ? 'active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              <div className="icon-wrapper">{item.icon}</div>
              <span className="link-label">{item.label}</span>
              <ChevronRight className="chevron" size={14} />
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer-ios">
          {brand.clinic_name && (
            <p className="sidebar-clinic-name">{brand.clinic_name}</p>
          )}
        </div>
      </aside>

      <style>{`
        /* ─── DESKTOP SIDEBAR ─── */
        .sidebar-glass {
          width: 280px;
          min-width: 280px;
          height: 100vh;
          background: var(--bg-card);
          backdrop-filter: var(--glass-blur);
          border-right: 1px solid var(--glass-border);
          display: flex;
          flex-direction: column;
          padding: 2rem 1rem;
          transition: var(--transition);
          overflow-y: auto;
          overflow-x: hidden;
          flex-shrink: 0;
        }

        .sidebar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 2.5rem;
          padding: 0 0.5rem;
        }
        .sidebar-logo-img { max-height: 44px; max-width: 180px; object-fit: contain; }
        .drawer-close-btn { display: none; background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 6px; border-radius: 8px; }

        .sidebar-nav-ios { display: flex; flex-direction: column; gap: 0.4rem; flex: 1; }
        .nav-section-label { padding: 0 0.5rem; margin-bottom: 0.5rem; display: block; }

        .nav-link-ios {
          display: flex; align-items: center; gap: 1rem;
          padding: 0.8rem 1rem;
          color: var(--text-secondary);
          text-decoration: none;
          border-radius: var(--radius-btn);
          transition: var(--transition);
          position: relative;
        }
        .nav-link-ios .icon-wrapper { color: var(--text-muted); transition: var(--transition); flex-shrink: 0; }
        .link-label { font-size: 0.95rem; font-weight: 600; flex: 1; white-space: nowrap; }
        .chevron { opacity: 0; transform: translateX(-5px); transition: var(--transition); color: var(--text-muted); flex-shrink: 0; }
        .nav-link-ios:hover { background: var(--glass); color: var(--text-primary); }
        .nav-link-ios:hover .chevron { opacity: 1; transform: translateX(0); }
        .nav-link-ios.active {
          background: var(--primary);
          color: white;
          box-shadow: 0 8px 20px var(--primary-light);
        }
        .nav-link-ios.active .icon-wrapper,
        .nav-link-ios.active .chevron { color: white; opacity: 1; transform: translateX(0); }

        .sidebar-footer-ios { margin-top: auto; padding: 1rem 0.5rem 0; }
        .sidebar-clinic-name { font-size: 0.72rem; color: var(--text-muted); font-weight: 600; text-align: center; opacity: 0.7; }

        /* ─── MOBILE TOP BAR (hidden on desktop) ─── */
        .mobile-topbar { display: none; }

        /* ─── DRAWER OVERLAY ─── */
        .drawer-overlay { display: none; }

        /* ─── MOBILE STYLES ─── */
        @media (max-width: 900px) {
          /* Hide desktop sidebar by default on mobile */
          .sidebar-glass {
            position: fixed;
            top: 0;
            right: -100%;
            width: min(300px, 85vw);
            height: 100vh;
            z-index: 1000;
            box-shadow: -8px 0 40px rgba(0,0,0,0.4);
            transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            padding: 1.5rem 1rem;
          }
          .sidebar-glass.drawer-open {
            right: 0;
          }

          /* Show close button on mobile */
          .drawer-close-btn { display: flex; }

          /* Show mobile top bar */
          .mobile-topbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0.75rem 1.25rem;
            background: var(--bg-card);
            border-bottom: 1px solid var(--glass-border);
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            z-index: 1100;
            backdrop-filter: var(--glass-blur);
          }
          .mobile-brand { display: flex; align-items: center; gap: 0.75rem; }
          .mobile-logo-img { height: 32px; object-fit: contain; }
          .mobile-page-label { font-size: 1rem; font-weight: 700; color: var(--text-primary); }
          .hamburger-btn {
            width: 40px; height: 40px;
            display: flex; align-items: center; justify-content: center;
            border-radius: 10px;
            background: var(--glass);
            color: var(--text-primary);
            border: 1px solid var(--glass-border);
            cursor: pointer;
          }

          /* Overlay */
          .drawer-overlay {
            display: block;
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.5);
            z-index: 999;
            backdrop-filter: blur(2px);
          }
        }
      `}</style>
    </>
  );
};

export default Sidebar;

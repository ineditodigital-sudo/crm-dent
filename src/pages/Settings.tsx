import { useState } from 'react';
import { Plug, ScrollText } from 'lucide-react';
import ConnectionsPage from './Connections';
import LogsPage from './Logs';
import { motion, AnimatePresence } from 'framer-motion';

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState<'connections' | 'logs'>('connections');

  return (
    <div className="settings-page animate-ios">
      <div className="settings-header">
        <div>
          <h1 className="page-title">Configuración</h1>
          <p className="page-sub">Panel técnico y monitorización del sistema.</p>
        </div>
      </div>

      <div className="settings-tabs glass-card">
        <button 
          className={`tab-btn ${activeTab === 'connections' ? 'active' : ''}`}
          onClick={() => setActiveTab('connections')}
        >
          <Plug size={18} /> Conexiones
        </button>
        <button 
          className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          <ScrollText size={18} /> Log Sistema
        </button>
      </div>

      <div className="settings-content">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'connections' ? <ConnectionsPage /> : <LogsPage />}
          </motion.div>
        </AnimatePresence>
      </div>

      <style>{`
        .settings-page { display: flex; flex-direction: column; gap: 2rem; }
        .settings-tabs {
          display: flex;
          gap: 0.5rem;
          padding: 0.5rem;
          border-radius: var(--radius-lg);
          width: fit-content;
        }
        .tab-btn {
          padding: 0.6rem 1.25rem;
          border-radius: 12px;
          border: none;
          background: transparent;
          color: var(--text-muted);
          font-weight: 600;
          font-size: 0.9rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          cursor: pointer;
          transition: var(--transition);
        }
        .tab-btn:hover { background: var(--bg-surface); color: var(--text-primary); }
        .tab-btn.active {
          background: var(--primary);
          color: white;
          box-shadow: 0 4px 12px var(--primary-light);
        }
        
        @media (max-width: 768px) {
          .settings-tabs { width: 100%; justify-content: center; }
          .tab-btn { flex: 1; padding: 0.6rem 0.5rem; justify-content: center; font-size: 0.8rem; gap: 0.4rem; }
        }
      `}</style>
    </div>
  );
};

export default SettingsPage;

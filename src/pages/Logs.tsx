import { useState, useEffect, useCallback } from 'react';
import { Terminal, RefreshCw, AlertCircle, Info, CheckCircle, Search, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

const LogsPage = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const { authFetch } = useAuth();

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/logs');
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, [fetchLogs]);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.msg.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || log.type === filter;
    return matchesSearch && matchesFilter;
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'error': return <AlertCircle size={16} className="text-red" />;
      case 'info': return <Info size={16} className="text-blue" />;
      case 'success': return <CheckCircle size={16} className="text-green" />;
      default: return <Info size={16} />;
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="logs-container animate-ios">
      <header className="logs-header">
        <div className="header-info">
          <h1 className="page-title">
            <Terminal className="title-icon" /> Log del Sistema
          </h1>
          <p className="page-subtitle">Actividad técnica y errores del bot en tiempo real.</p>
        </div>
        <div className="header-actions">
          <div className="search-box glass-card">
            <Search size={16} />
            <input 
              type="text" 
              placeholder="Buscar en logs..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
          </div>
          <button className="refresh-btn glass-card" onClick={fetchLogs} disabled={loading}>
            <RefreshCw size={18} className={loading ? 'spinning' : ''} />
          </button>
        </div>
      </header>

      <div className="logs-filters glass-card">
        {['all', 'info', 'error'].map(f => (
          <button 
            key={f} 
            className={`filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'Todos' : f === 'info' ? 'Info' : 'Errores'}
          </button>
        ))}
      </div>

      <main className="logs-main glass-card">
        <div className="logs-table-header">
          <div className="col-time">Hora</div>
          <div className="col-type">Tipo</div>
          <div className="col-msg">Mensaje</div>
        </div>
        <div className="logs-list">
          <AnimatePresence initial={false}>
            {filteredLogs.length > 0 ? (
              filteredLogs.map((log, i) => (
                <motion.div 
                  key={log.time + i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`log-row type-${log.type}`}
                >
                  <div className="col-time">
                    <Clock size={12} style={{ opacity: 0.5, marginRight: 6 }} />
                    {formatTime(log.time)}
                  </div>
                  <div className="col-type">
                    <span className={`type-badge ${log.type}`}>
                      {getIcon(log.type)}
                      {log.type.toUpperCase()}
                    </span>
                  </div>
                  <div className="col-msg">{log.msg}</div>
                </motion.div>
              ))
            ) : (
              <div className="logs-empty">
                <Terminal size={48} />
                <p>No se encontraron registros que coincidan.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <style>{`
        .logs-container { display: flex; flex-direction: column; gap: 1.5rem; max-width: 1200px; margin: 0 auto; }
        .logs-header { display: flex; justify-content: space-between; align-items: flex-start; }
        .page-title { font-size: 2rem; font-weight: 800; display: flex; align-items: center; gap: 0.75rem; color: var(--text-primary); }
        .title-icon { color: var(--primary); }
        .page-subtitle { color: var(--text-muted); margin-top: 0.25rem; }

        .header-actions { display: flex; gap: 1rem; }
        .search-box { display: flex; align-items: center; gap: 0.75rem; padding: 0.6rem 1rem; border-radius: 12px; width: 300px; }
        .search-box input { border: none; background: none; outline: none; color: var(--text-primary); flex: 1; font-size: 0.9rem; }
        .refresh-btn { padding: 0.6rem; border-radius: 12px; color: var(--primary); cursor: pointer; display: flex; align-items: center; }

        .logs-filters { display: flex; padding: 0.4rem; border-radius: 14px; width: fit-content; gap: 0.25rem; }
        .filter-btn { padding: 0.5rem 1.25rem; border-radius: 10px; border: none; background: none; font-weight: 700; font-size: 0.85rem; color: var(--text-muted); cursor: pointer; transition: var(--transition); }
        .filter-btn:hover { color: var(--text-primary); background: var(--bg-app); }
        .filter-btn.active { background: var(--primary); color: white; box-shadow: 0 4px 12px var(--primary-light); }

        .logs-main { display: flex; flex-direction: column; border-radius: 20px; overflow: hidden; height: calc(100vh - 300px); }
        .logs-table-header { display: grid; grid-template-columns: 120px 120px 1fr; padding: 1rem 1.5rem; background: rgba(0,0,0,0.02); border-bottom: 1px solid var(--glass-border); font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted); }
        
        .logs-list { flex: 1; overflow-y: auto; padding: 0.5rem 0; }
        .log-row { display: grid; grid-template-columns: 120px 120px 1fr; padding: 0.75rem 1.5rem; border-bottom: 1px solid rgba(0,0,0,0.02); transition: var(--transition); align-items: center; }
        .log-row:hover { background: var(--bg-app); }
        
        .col-time { font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; color: var(--text-secondary); display: flex; align-items: center; }
        .col-type { display: flex; }
        .type-badge { display: flex; align-items: center; gap: 0.4rem; font-size: 0.65rem; font-weight: 800; padding: 0.2rem 0.6rem; border-radius: 6px; }
        .type-badge.error { background: rgba(255, 59, 48, 0.1); color: #ff3b30; }
        .type-badge.info { background: rgba(0, 122, 255, 0.1); color: #007aff; }
        
        .col-msg { font-size: 0.88rem; color: var(--text-primary); line-height: 1.4; word-break: break-all; }
        
        .logs-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem; height: 100%; opacity: 0.3; color: var(--text-muted); }

        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spinning { animation: spin 1s linear infinite; }

        @media (max-width: 768px) {
          .logs-header { flex-direction: column; gap: 1rem; }
          .search-box { width: 100%; }
          .logs-table-header { display: none; }
          .log-row { grid-template-columns: 1fr; gap: 0.5rem; padding: 1.25rem 1.5rem; }
          .col-time { order: 1; }
          .col-type { order: 2; }
          .col-msg { order: 3; font-size: 0.95rem; }
        }
      `}</style>
    </div>
  );
};

export default LogsPage;

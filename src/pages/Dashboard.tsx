import React from 'react';
import { 
  Users, 
  Calendar, 
  Activity,
  ArrowUpRight,
  MoreHorizontal,
  ChevronRight,
  Bot,
  Zap
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const Widget = ({ icon, label, value, trend, color, delay }: any) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5 }}
    className="glass-card widget-ios"
  >
    <div className="widget-header">
      <div className={`icon-circle ${color}`}>
        {icon}
      </div>
      <button className="more-btn"><MoreHorizontal size={16} /></button>
    </div>
    <div className="widget-body">
      <span className="ios-label">{label}</span>
      <h2 className="widget-value">{value}</h2>
    </div>
    <div className="widget-footer">
      <span className={`trend-pill ${trend.includes('+') ? 'positive' : 'negative'}`}>
        <Activity size={10} />
        {trend}
      </span>
      <span className="footer-subtext">vs. mes pasado</span>
    </div>
  </motion.div>
);

const Dashboard = () => {
  const [stats, setStats] = React.useState<any>({ totalLeads: 0, botMessages: 0, todayApps: 0, conversion: '0%' });
  const [recentChats, setRecentChats] = React.useState<any[]>([]);
  const { authFetch } = useAuth();

  const API_URL = '';

  React.useEffect(() => {
    authFetch(`${API_URL}/api/stats`)
      .then(res => res.ok ? res.json() : {})
      .then(data => setStats(data))
      .catch(err => console.error(err));
      
    authFetch(`${API_URL}/api/conversations`)
      .then(res => res.ok ? res.json() : [])
      .then(data => setRecentChats(Array.isArray(data) ? data : []))
      .catch(err => console.error(err));
  }, [authFetch]);

  return (
    <div className="dashboard-ios animate-ios">
      <section className="welcome-banner">
        <h1 className="display-text">Hola, Stephanie</h1>
        <p className="subtitle">Aquí tienes un vistazo de tu clínica hoy.</p>
      </section>

      <div className="widgets-grid-ios">
        <Widget 
          delay={0.1}
          icon={<Users size={20} />} 
          label="Total Leads" 
          value={stats.totalLeads.toString()} 
          trend="+18.4%" 
          color="blue" 
        />
        <Widget 
          delay={0.2}
          icon={<Bot size={20} />} 
          label="Interacciones IA" 
          value={stats.botMessages.toLocaleString()} 
          trend="+12.2%" 
          color="purple" 
        />
        <Widget 
          delay={0.3}
          icon={<Calendar size={20} />} 
          label="Citas de Hoy" 
          value={stats.todayApps.toString()} 
          trend="+4.3%" 
          color="green" 
        />
        <Widget 
          delay={0.4}
          icon={<Zap size={20} />} 
          label="Conversión" 
          value={stats.conversion} 
          trend="+2.1%" 
          color="amber" 
        />
      </div>

      <div className="dashboard-main-grid">
        <div className="main-col">
          <div className="glass-card section-card">
            <div className="card-header">
              <h3>Alertas de Atención Humana</h3>
              <button className="ios-link">Ver todas <ChevronRight size={14} /></button>
            </div>
            <div className="alert-list">
              {recentChats.length > 0 ? (
                recentChats.slice(0, 3).map((chat: any, i: number) => (
                  <div key={i} className="alert-item">
                    <div className={`alert-indicator ${chat.manual_mode ? 'red' : 'blue'}`} />
                    <div className="alert-content">
                      <strong>{chat.name || chat.phone}</strong>
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>
                        {chat.last_message || 'Inició interacción'}
                      </span>
                    </div>
                    <span className="alert-time">
                      {new Date(chat.last_message_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <button className="action-btn-ios" onClick={() => window.location.href = '/admin/conversations'}>Atender</button>
                  </div>
                ))
              ) : (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No hay mensajes recientes
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="side-col">
          <div className="glass-card section-card performance-widget">
            <h3 className="ios-label">Rendimiento Bot</h3>
            <div className="chart-placeholder">
               <div className="bar" style={{ height: '60%' }}></div>
               <div className="bar active" style={{ height: '85%' }}></div>
               <div className="bar" style={{ height: '45%' }}></div>
               <div className="bar" style={{ height: '70%' }}></div>
               <div className="bar" style={{ height: '55%' }}></div>
            </div>
            <div className="chart-stats">
               <div className="c-stat">
                 <strong>98%</strong>
                 <span>Efectividad</span>
               </div>
               <div className="c-stat">
                 <strong><ArrowUpRight size={14} /> 4.2m</strong>
                 <span>T. Respuesta</span>
               </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .dashboard-ios { display: flex; flex-direction: column; gap: 3rem; }
        .welcome-banner { margin-bottom: 1rem; }
        .subtitle { color: var(--text-muted); font-size: 1.1rem; font-weight: 500; margin-top: 0.5rem; }

        .widgets-grid-ios { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.5rem; }
        
        .widget-ios { padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
        .widget-header { display: flex; justify-content: space-between; align-items: center; }
        
        .icon-circle { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
        .icon-circle.blue { background: #007aff; color: white; box-shadow: 0 4px 12px rgba(0, 122, 255, 0.4); }
        .icon-circle.purple { background: #5856d6; color: white; box-shadow: 0 4px 12px rgba(88, 86, 214, 0.4); }
        .icon-circle.green { background: #34c759; color: white; box-shadow: 0 4px 12px rgba(52, 199, 89, 0.4); }
        .icon-circle.amber { background: #ffb700; color: white; box-shadow: 0 4px 12px rgba(255, 183, 0, 0.4); }

        .widget-value { font-size: 2.25rem; font-weight: 800; color: var(--text-primary); margin-top: 0.25rem; }
        
        .widget-footer { display: flex; align-items: center; gap: 0.75rem; }
        .trend-pill { font-size: 0.7rem; font-weight: 800; display: flex; align-items: center; gap: 0.3rem; padding: 0.25rem 0.6rem; border-radius: 20px; }
        .trend-pill.positive { background: rgba(52, 199, 89, 0.1); color: #34c759; }
        .trend-pill.negative { background: rgba(255, 59, 48, 0.1); color: #ff3b30; }
        .footer-subtext { font-size: 0.7rem; color: var(--text-muted); font-weight: 600; }

        .dashboard-main-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 2rem; }
        .section-card { padding: 2rem; }
        .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
        .card-header h3 { font-size: 1.1rem; }
        .ios-link { color: var(--primary); font-size: 0.85rem; font-weight: 600; display: flex; align-items: center; gap: 0.25rem; }

        .alert-list { display: flex; flex-direction: column; gap: 1.25rem; }
        .alert-item { display: flex; align-items: center; gap: 1.25rem; padding: 1.25rem; background: var(--bg-surface); border-radius: 16px; transition: var(--transition); }
        .alert-item:hover { transform: scale(1.02); box-shadow: var(--shadow-ios); }
        
        .alert-indicator { width: 8px; height: 8px; border-radius: 50%; box-shadow: 0 0 10px currentColor; }
        .alert-indicator.red { color: #ff3b30; background: #ff3b30; }
        .alert-indicator.orange { color: #ff9500; background: #ff9500; }
        .alert-indicator.blue { color: #007aff; background: #007aff; }

        .alert-content { flex: 1; display: flex; flex-direction: column; }
        .alert-content strong { font-size: 0.95rem; }
        .alert-content span { font-size: 0.8rem; color: var(--text-muted); }
        .alert-time { font-size: 0.75rem; color: var(--text-muted); font-weight: 600; }

        .action-btn-ios { background: var(--primary); color: white; padding: 0.5rem 1rem; border-radius: 10px; font-size: 0.8rem; font-weight: 700; opacity: 0; transition: var(--transition); }
        .alert-item:hover .action-btn-ios { opacity: 1; }

        .performance-widget { display: flex; flex-direction: column; height: 100%; }
        .chart-placeholder { flex: 1; display: flex; align-items: flex-end; justify-content: center; gap: 1rem; padding: 2rem 0; min-height: 150px; }
        .bar { width: 12px; background: var(--bg-app); border-radius: 6px; transition: var(--transition); }
        .bar.active { background: var(--primary); box-shadow: 0 0 15px var(--primary-light); }
        
        .chart-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; padding-top: 1.5rem; border-top: 1px solid var(--glass-border); }
        .c-stat { display: flex; flex-direction: column; align-items: center; text-align: center; }
        .c-stat strong { font-size: 1.1rem; display: flex; align-items: center; gap: 2px; }
        @media (max-width: 1024px) {
          .dashboard-main-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 768px) {
          .dashboard-ios { gap: 1.5rem; padding-bottom: 80px; } /* Space for bottom nav */
          .display-text { font-size: 2.5rem; }
          .chart-stats { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;

import React, { useState, useEffect, useCallback } from 'react';
import { BarChart3, Users, Bot, CalendarCheck, MessageSquare, TrendingUp, RefreshCw, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const tok = () => localStorage.getItem('crm_token') || '';

const StatCard = ({ icon, label, value, color = 'var(--primary)' }: any) => (
  <motion.div className="stat-card glass-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
    <div className="stat-icon" style={{ background: `${color}22` }}>{React.cloneElement(icon, { size: 22, style: { color } })}</div>
    <div className="stat-info">
      <span className="stat-value">{value ?? '—'}</span>
      <span className="stat-label">{label}</span>
    </div>
  </motion.div>
);

const Bar = ({ label, value, max, color }: any) => (
  <div className="bar-row">
    <span className="bar-label">{label}</span>
    <div className="bar-track"><div className="bar-fill" style={{ width: `${max ? (value / max) * 100 : 0}%`, background: color || 'var(--primary)' }} /></div>
    <span className="bar-val">{value}</span>
  </div>
);

const AIReportSection = () => {
  const [report, setReport] = useState('');
  const [generating, setGenerating] = useState(false);

  const generateAIReport = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/reports/ai', { headers: { Authorization: `Bearer ${tok()}` } });
      const data = await res.json();
      setReport(data.report || 'No se pudo generar el reporte.');
    } catch (err) {
      setReport('Ocurrió un error al conectar con Gemini.');
    }
    setGenerating(false);
  };

  return (
    <div className="ai-report-box glass-card">
      <div className="ai-header">
        <div className="ai-title"><Bot size={24} color="var(--primary)" /> Análisis Estratégico (IA)</div>
        <button className="btn-ai" onClick={generateAIReport} disabled={generating}>
          {generating ? <RefreshCw size={18} className="spinning" /> : <TrendingUp size={18} />}
          {generating ? 'Analizando...' : 'Generar Análisis con Gemini'}
        </button>
      </div>
      <div className="ai-body">
        {report ? (
          <div className="ai-content">{report}</div>
        ) : (
          <div className="ai-placeholder">
            Haz clic en el botón para que la IA analice el rendimiento de tu clínica basándose en los datos actuales del CRM.
          </div>
        )}
      </div>
    </div>
  );
};

const ReportsPage = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/reports', { headers: { Authorization: `Bearer ${tok()}` } });
      setData(await r.json());
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const t = data?.totals || {};
  const maxService = data?.byService?.[0]?.count || 1;

  return (
    <div className="reports-page animate-ios">
      <div className="reports-header">
        <div>
          <h1 className="page-title">Reportes</h1>
          <p className="page-sub">Métricas en tiempo real del CRM y el bot de WhatsApp</p>
        </div>
        <button className="btn-ghost" onClick={load}><RefreshCw size={16} className={loading ? 'spinning' : ''} /> Actualizar</button>
      </div>

      {loading ? (
        <div className="loading-state"><RefreshCw size={28} className="spinning" /> Cargando métricas...</div>
      ) : (
        <>
          {/* KPIs */}
          <div className="stats-grid">
            <StatCard icon={<Users />} label="Total Contactos" value={t.total_patients} />
            <StatCard icon={<TrendingUp />} label="Interesados" value={t.total_leads} color="#ff9f0a" />
            <StatCard icon={<Users />} label="Convertidos a Paciente" value={t.total_converted} color="#34c759" />
            <StatCard icon={<CalendarCheck />} label="Citas Agendadas" value={t.total_appointments} color="#5856d6" />
            <StatCard icon={<Bot />} label="Citas por el Bot" value={t.bot_appointments} color="#007aff" />
            <StatCard icon={<MessageSquare />} label="Mensajes del Bot" value={t.bot_messages} color="#ff2d55" />
          </div>

          {/* GRÁFICAS */}
          <div className="charts-grid">
            {/* Por servicio */}
            <div className="chart-card glass-card">
              <h3><BarChart3 size={18} /> Interés por Servicio</h3>
              {data?.byService?.length > 0 ? (
                <div className="bars">
                  {data.byService.map((s: any, i: number) => (
                    <Bar key={i} label={s.service} value={s.count} max={maxService} color={`hsl(${210 + i * 30}, 80%, 60%)`} />
                  ))}
                </div>
              ) : <p className="no-data">Sin datos aún. El bot irá registrando los servicios de interés.</p>}
            </div>

            {/* Por status */}
            <div className="chart-card glass-card">
              <h3><Users size={18} /> Estado de Contactos</h3>
              {data?.byStatus?.length > 0 ? (
                <div className="status-list">
                  {data.byStatus.map((s: any, i: number) => {
                    const colors: any = { Lead: '#ff9f0a', Interesado: '#007aff', Paciente: '#34c759', Inactivo: '#636366' };
                    const total = data.byStatus.reduce((a: number, x: any) => a + x.count, 0);
                    return (
                      <div key={i} className="status-row">
                        <span className="status-dot" style={{ background: colors[s.status] || '#888' }} />
                        <span className="status-name">{s.status}</span>
                        <div className="status-bar-track"><div className="status-bar-fill" style={{ width: `${(s.count / total) * 100}%`, background: colors[s.status] || '#888' }} /></div>
                        <span className="status-count">{s.count}</span>
                      </div>
                    );
                  })}
                </div>
              ) : <p className="no-data">Sin datos de estado aún.</p>}
            </div>
          </div>

          {/* ÚLTIMAS CITAS */}
          <div className="recent-apps glass-card">
            <h3><CalendarCheck size={18} /> Últimas Citas Agendadas</h3>
            {data?.recentApps?.length > 0 ? (
              <div className="table-responsive">
                <table className="apps-table">
                  <thead><tr><th>Paciente</th><th>Fecha</th><th>Servicio</th><th>Fuente</th><th></th></tr></thead>
                  <tbody>
                    {data.recentApps.map((a: any, i: number) => (
                      <tr key={i}>
                        <td>{a.patient_name}</td>
                        <td>{format(new Date(a.appointment_date), "d MMM, HH:mm", { locale: es })}</td>
                        <td>{a.description}</td>
                        <td><span className={`source-pill ${a.source}`}>{a.source === 'bot' ? '🤖 Bot' : '👤 Manual'}</span></td>
                        <td>{a.google_event_url && <a href={a.google_event_url} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} /></a>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="no-data">No hay citas registradas aún.</p>}
          </div>

          <AIReportSection />
        </>
      )}

      <style>{`
        .ai-report-box{margin-top:2rem;padding:2rem;border-radius:24px;background:linear-gradient(135deg, rgba(88,86,214,0.1) 0%, rgba(0,122,255,0.05) 100%);border:1px solid rgba(88,86,214,0.2);position:relative;overflow:hidden}
        .ai-report-box::before{content:'';position:absolute;top:-50%;left:-50%;width:200%;height:200%;background:radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%);pointer-events:none}
        .ai-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem}
        .ai-title{display:flex;align-items:center;gap:.75rem;font-size:1.2rem;font-weight:800;color:var(--text-primary)}
        .ai-content{line-height:1.6;font-size:.95rem;color:var(--text-secondary);white-space:pre-wrap}
        .ai-content p{margin-bottom:1rem}
        .ai-content strong{color:var(--text-primary)}
        .btn-ai{background:var(--primary);color:white;padding:.8rem 1.5rem;border-radius:var(--radius-full);font-weight:700;display:flex;align-items:center;gap:.75rem;box-shadow:0 8px 20px rgba(0,122,255,0.3);transition:all .3s ease}
        .btn-ai:hover{transform:translateY(-2px);box-shadow:0 12px 24px rgba(0,122,255,0.4)}
        .btn-ai:disabled{opacity:.6;cursor:not-allowed}
        .ai-placeholder{text-align:center;padding:2rem;color:var(--text-muted)}
        .reports-page{display:flex;flex-direction:column;gap:2rem}
        .reports-header{display:flex;justify-content:space-between;align-items:flex-start}
        .page-title{font-size:2rem;font-weight:800}
        .page-sub{color:var(--text-muted);font-size:.9rem;margin-top:.25rem}
        .stats-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:1rem}
        .stat-card{padding:1.25rem;border-radius:16px;display:flex;align-items:center;gap:1rem}
        .stat-icon{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .stat-info{display:flex;flex-direction:column;gap:2px}
        .stat-value{font-size:1.6rem;font-weight:800;line-height:1}
        .stat-label{font-size:.75rem;color:var(--text-muted);font-weight:600}
        .charts-grid{display:grid;grid-template-columns:1fr 1fr;gap:1.5rem}
        .chart-card{padding:1.5rem;border-radius:18px}
        .chart-card h3{display:flex;align-items:center;gap:.5rem;font-size:1rem;font-weight:700;margin-bottom:1.25rem}
        .bars{display:flex;flex-direction:column;gap:.75rem}
        .bar-row{display:flex;align-items:center;gap:.75rem}
        .bar-label{font-size:.8rem;width:120px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--text-secondary)}
        .bar-track{flex:1;height:8px;border-radius:4px;background:var(--glass);overflow:hidden}
        .bar-fill{height:100%;border-radius:4px;transition:width .6s ease}
        .bar-val{font-size:.8rem;font-weight:700;width:24px;text-align:right;color:var(--text-muted)}
        .status-list{display:flex;flex-direction:column;gap:.75rem}
        .status-row{display:flex;align-items:center;gap:.75rem}
        .status-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}
        .status-name{font-size:.85rem;font-weight:600;width:90px}
        .status-bar-track{flex:1;height:8px;border-radius:4px;background:var(--glass);overflow:hidden}
        .status-bar-fill{height:100%;border-radius:4px;transition:width .6s ease}
        .status-count{font-size:.85rem;font-weight:700;width:24px;text-align:right}
        .recent-apps{padding:1.5rem;border-radius:18px}
        .recent-apps h3{display:flex;align-items:center;gap:.5rem;font-size:1rem;font-weight:700;margin-bottom:1.25rem}
        .table-responsive{overflow-x:auto;width:100%}
        .apps-table{width:100%;border-collapse:collapse;font-size:.85rem;min-width:500px}
        .apps-table th{text-align:left;padding:.5rem .75rem;font-size:.75rem;color:var(--text-muted);border-bottom:1px solid var(--glass-border)}
        .apps-table td{padding:.65rem .75rem;border-bottom:1px solid var(--glass-border)}
        .source-pill{font-size:.72rem;padding:3px 8px;border-radius:20px;font-weight:600}
        .source-pill.bot{background:rgba(0,122,255,.15);color:#007aff}
        .source-pill.manual{background:rgba(52,199,89,.15);color:#34c759}
        .no-data{color:var(--text-muted);font-size:.85rem;text-align:center;padding:2rem}
        .loading-state{display:flex;align-items:center;justify-content:center;gap:1rem;padding:6rem;color:var(--text-muted)}
        .btn-ghost{padding:.65rem 1.25rem;border-radius:var(--radius-full);font-weight:600;color:var(--text-secondary);background:var(--glass);display:flex;align-items:center;gap:.5rem;font-size:.85rem}
        @keyframes spin{to{transform:rotate(360deg)}}
        .spinning{animation:spin .8s linear infinite}
        @media(max-width:768px){
          .charts-grid{grid-template-columns:1fr}
          .stats-grid{grid-template-columns:1fr 1fr}
          .reports-header{flex-direction:column;gap:1rem}
        }
      `}</style>
    </div>
  );
};
export default ReportsPage;

import { useState, useEffect, useCallback } from 'react';
import { Users, MessageSquare, RefreshCw, Search, ChevronRight, Bot, User, Circle, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const tok = () => localStorage.getItem('crm_token') || '';

const STATUS_COLORS: Record<string, string> = {
  'Lead': '#ff9f0a',
  'Interesado': '#007aff',
  'Paciente': '#34c759',
  'Inactivo': '#636366',
};

const PatientsPage = () => {
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const r = await fetch('/api/patients', { headers: { Authorization: `Bearer ${tok()}` } });
      if (!r.ok) throw new Error(`Error ${r.status}: ${r.statusText}`);
      const data = await r.json();
      if (!Array.isArray(data)) throw new Error('Respuesta inesperada del servidor');
      setPatients(data);
    } catch (err: any) {
      console.error('Error cargando pacientes:', err);
      setFetchError(err.message || 'No se pudo conectar al servidor');
      setPatients([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = patients.filter(p =>
    (p.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.phone || '').includes(search) ||
    (p.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.service_interested || '').toLowerCase().includes(search.toLowerCase())
  );

  const savePatient = async () => {
    if (!selected) return;
    setSaving(true);
    await fetch(`/api/patients/${selected.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` },
      body: JSON.stringify(editForm)
    });
    setSaving(false);
    load();
    setSelected({ ...selected, ...editForm });
  };
  
  const deletePatient = async () => {
    if (!selected) return;
    if (!confirm('¿ESTÁS SEGURO? Esta acción eliminará permanentemente al paciente, todo su historial de mensajes y sus citas. Esta acción no se puede deshacer.')) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/patients/${selected.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tok()}` }
      });
      if (r.ok) {
        setSelected(null);
        load();
      }
    } catch (err) {
      console.error(err);
    }
    setSaving(false);
  };

  return (
    <div className="patients-page animate-ios">
      <div className="patients-header">
        <div>
          <h1 className="page-title">Pacientes</h1>
          <p className="page-sub">{patients.length} contactos registrados por el bot y el equipo</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn-ghost" title="Fusiona pacientes con el mismo número de teléfono" onClick={async () => {
            if(!confirm('¿Buscar y fusionar contactos duplicados (mismo número)?')) return;
            const r = await fetch('/api/patients/merge-duplicates', { method: 'POST', headers: { Authorization: `Bearer ${tok()}` } });
            const data = await r.json();
            alert(data.message || 'Proceso completado.');
            load();
          }}><Users size={16} /> Unir Duplicados</button>
          <button className="btn-ghost" onClick={load}><RefreshCw size={16} className={loading ? 'spinning' : ''} /> Actualizar</button>
        </div>
      </div>

      <div className="patients-layout">
        {/* LISTA */}
        <div className={`patients-list glass-card ${selected ? 'hide-mobile' : ''}`}>
          <div className="search-bar">
            <Search size={16} />
            <input placeholder="Buscar por nombre, teléfono o servicio..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="patient-items">
            {loading ? (
              <div className="loading-state"><RefreshCw size={20} className="spinning" /> Cargando...</div>
            ) : fetchError ? (
              <div className="loading-state" style={{ color: '#ff3b30', padding: '2rem', textAlign: 'center', gap: '1rem', flexDirection: 'column' }}>
                <Users size={28} style={{ opacity: 0.4 }} />
                <strong>Error al cargar</strong>
                <span style={{ fontSize: '0.8rem' }}>{fetchError}</span>
                <button className="btn-ghost" style={{ alignSelf: 'center', marginTop: '0.5rem' }} onClick={load}>
                  <RefreshCw size={14} /> Reintentar
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="loading-state"><Users size={28} style={{ opacity: 0.3 }} /><span>Sin resultados</span></div>
            ) : (
              filtered.map((p, i) => (
                <motion.div
                  key={p.id}
                  className={`patient-item ${selected?.id === p.id ? 'active' : ''}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => { setSelected(p); setEditForm({ name: p.name, email: p.email, service_interested: p.service_interested, status: p.status }); }}
                >
                  <div className="patient-avatar" style={{ background: STATUS_COLORS[p.status] || '#636366' }}>
                    {p.source === 'bot' ? <Bot size={16} color="white" /> : <User size={16} color="white" />}
                  </div>
                  <div className="patient-info">
                    <strong>{p.name || 'Nuevo paciente'}</strong>
                    <span>{p.phone}</span>
                  </div>
                  <div className="patient-meta">
                    <span className="status-dot" style={{ background: STATUS_COLORS[p.status] || '#636366' }} />
                    <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* DETALLE */}
        <div className={`patient-detail glass-card ${!selected ? 'hide-mobile' : ''}`}>
          {!selected ? (
            <div className="no-selection"><Users size={48} style={{ opacity: 0.2 }} /><p>Selecciona un paciente para ver sus datos</p></div>
          ) : (
            <div className="detail-content">
              <button className="mobile-back-btn btn-ghost" onClick={() => setSelected(null)}>
                <ChevronRight size={16} style={{ transform: 'rotate(180deg)' }} /> Volver a la lista
              </button>
              
              <div className="detail-avatar" style={{ background: STATUS_COLORS[selected.status] || '#636366' }}>
                <User size={32} color="white" />
              </div>
              <h2 className="detail-name">{selected.name || 'Sin nombre'}</h2>
              <div className="detail-stats">
                <div className="ds-item"><MessageSquare size={14} />{selected.message_count || 0} mensajes</div>
                <div className="ds-item"><Circle size={8} style={{ fill: STATUS_COLORS[selected.status], color: STATUS_COLORS[selected.status] }} />{selected.status}</div>
              </div>

              <div className="detail-form">
                <h4>Información</h4>
                <label>Nombre<input value={editForm.name || ''} onChange={e => setEditForm((f: any) => ({ ...f, name: e.target.value }))} /></label>
                <label>Teléfono (WhatsApp)<input value={selected.phone || ''} disabled style={{ opacity: 0.5 }} /></label>
                <label>Email<input value={editForm.email || ''} onChange={e => setEditForm((f: any) => ({ ...f, email: e.target.value }))} placeholder="correo@ejemplo.com" /></label>
                <label>Servicio de Interés<input value={editForm.service_interested || ''} onChange={e => setEditForm((f: any) => ({ ...f, service_interested: e.target.value }))} placeholder="Ej: Limpieza dental" /></label>
                <label>Estado
                  <select value={editForm.status || 'Lead'} onChange={e => setEditForm((f: any) => ({ ...f, status: e.target.value }))}>
                    <option>Lead</option>
                    <option>Interesado</option>
                    <option>Paciente</option>
                    <option>Inactivo</option>
                  </select>
                </label>
              </div>

              <button className="btn-primary save-btn" onClick={savePatient} disabled={saving}>
                {saving ? <RefreshCw size={16} className="spinning" /> : null} {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>

              <button className="btn-ghost delete-patient-btn" onClick={deletePatient} disabled={saving} style={{ marginTop: '0.5rem', color: '#ff3b30', border: '1px solid rgba(255,59,48,0.2)', width: '100%', justifyContent: 'center' }}>
                <Trash2 size={16} /> Eliminar Paciente Permanentemente
              </button>

              {selected.last_interaction && (
                <p className="last-seen">Última interacción: {format(new Date(selected.last_interaction), "d 'de' MMMM, HH:mm", { locale: es })}</p>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .patients-page{display:flex;flex-direction:column;gap:2rem}
        .patients-header{display:flex;justify-content:space-between;align-items:flex-start}
        .page-title{font-size:2rem;font-weight:800}
        .page-sub{color:var(--text-muted);font-size:.9rem;margin-top:.25rem}
        .patients-layout{display:grid;grid-template-columns:380px 1fr;gap:1.5rem;height:calc(100vh - 200px)}
        .patients-list{border-radius:20px;display:flex;flex-direction:column;overflow:hidden}
        .search-bar{display:flex;align-items:center;gap:.75rem;padding:1rem 1.25rem;border-bottom:1px solid var(--glass-border)}
        .search-bar input{flex:1;border:none;background:none;font-size:.9rem;color:var(--text-primary)}
        .patient-items{flex:1;overflow-y:auto}
        .patient-item{display:flex;align-items:center;gap:1rem;padding:1rem 1.25rem;cursor:pointer;transition:var(--transition);border-bottom:1px solid var(--glass-border)}
        .patient-item:hover,.patient-item.active{background:var(--glass)}
        .patient-avatar{width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .patient-info{flex:1;display:flex;flex-direction:column;gap:2px}
        .patient-info strong{font-size:.9rem;font-weight:700}
        .patient-info span{font-size:.78rem;color:var(--text-muted)}
        .patient-meta{display:flex;align-items:center;gap:.5rem}
        .status-dot{width:8px;height:8px;border-radius:50%}
        .patient-detail{border-radius:20px;padding:2rem;overflow-y:auto}
        .no-selection{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:1rem;color:var(--text-muted)}
        .detail-content{display:flex;flex-direction:column;align-items:center;gap:1.25rem}
        .detail-avatar{width:80px;height:80px;border-radius:50%;display:flex;align-items:center;justify-content:center}
        .detail-name{font-size:1.5rem;font-weight:800;text-align:center}
        .detail-stats{display:flex;gap:1.5rem;flex-wrap:wrap;justify-content:center}
        .ds-item{display:flex;align-items:center;gap:.4rem;font-size:.8rem;color:var(--text-muted);font-weight:600}
        .detail-form{width:100%;display:flex;flex-direction:column;gap:.75rem;margin-top:.5rem}
        .detail-form h4{font-size:.85rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:.25rem}
        .detail-form label{display:flex;flex-direction:column;gap:.3rem;font-size:.8rem;font-weight:600;color:var(--text-secondary)}
        .detail-form input,.detail-form select{padding:.7rem 1rem;border-radius:12px;border:1px solid var(--glass-border);background:var(--bg-surface);font-size:.9rem;color:var(--text-primary)}
        .save-btn{width:100%;justify-content:center;margin-top:.5rem}
        .last-seen{font-size:.75rem;color:var(--text-muted)}
        .loading-state{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.75rem;padding:3rem;color:var(--text-muted);font-size:.9rem}
        .btn-primary{background:var(--primary);color:white;padding:.75rem 1.5rem;border-radius:var(--radius-full);font-weight:700;display:flex;align-items:center;gap:.5rem;font-size:.9rem}
        .btn-ghost{padding:.65rem 1.25rem;border-radius:var(--radius-full);font-weight:600;color:var(--text-secondary);background:var(--glass);display:flex;align-items:center;gap:.5rem;font-size:.85rem}
        .mobile-back-btn{display:none;align-self:flex-start}
        @keyframes spin{to{transform:rotate(360deg)}}
        .spinning{animation:spin .8s linear infinite}
        @media(max-width:900px){
          .patients-layout{grid-template-columns:1fr;height:auto}
          .patient-detail{min-height:calc(100vh - 250px)}
          .hide-mobile{display:none !important}
          .mobile-back-btn{display:flex}
          .patients-header{flex-direction:column;gap:1rem}
        }
      `}</style>
    </div>
  );
};
export default PatientsPage;

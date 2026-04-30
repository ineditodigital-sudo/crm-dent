import { useState, useEffect, useCallback } from 'react';
import { Users, MessageSquare, RefreshCw, Search, ChevronRight, Bot, User, Trash2, CalendarCheck, Star, LayoutGrid, List } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const tok = () => localStorage.getItem('crm_token') || '';

// ---- Configuración de estados ----
const STATUS_CONFIG: Record<string, { color: string; label: string; emoji: string }> = {
  'lead':      { color: '#ff9f0a', label: 'Lead',      emoji: '🔵' },
  'nuevo':     { color: '#007aff', label: 'Nuevo',     emoji: '🟢' },
  'prospecto': { color: '#5856d6', label: 'Prospecto', emoji: '🟡' },
  'frecuente': { color: '#34c759', label: 'Frecuente', emoji: '🟣' },
  'especial':  { color: '#ff2d55', label: 'Especial',  emoji: '⭐' },
  // Compatibilidad con estados viejos
  'Lead':      { color: '#ff9f0a', label: 'Lead',      emoji: '🔵' },
  'Interesado':{ color: '#5856d6', label: 'Interesado',emoji: '🟡' },
  'Paciente':  { color: '#34c759', label: 'Paciente',  emoji: '🟢' },
  'Inactivo':  { color: '#636366', label: 'Inactivo',  emoji: '⚪' },
};

const getStatusConfig = (s: string) => STATUS_CONFIG[s] || { color: '#636366', label: s || 'Desconocido', emoji: '⚪' };

const StatusBadge = ({ status }: { status: string }) => {
  const cfg = getStatusConfig(status);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      background: cfg.color + '22', color: cfg.color,
      padding: '3px 10px', borderRadius: '20px',
      fontSize: '0.72rem', fontWeight: 700, border: `1px solid ${cfg.color}44`,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color, display: 'inline-block' }} />
      {cfg.label}
    </span>
  );
};

const contactsPage = () => {
  const [contacts, setcontacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [contactAppts, setcontactAppts] = useState<any[]>([]);
  const [loadingAppts, setLoadingAppts] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');

  const load = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const r = await fetch('/api/contacts', { headers: { Authorization: `Bearer ${tok()}` } });
      if (!r.ok) throw new Error(`Error ${r.status}: ${r.statusText}`);
      const data = await r.json();
      if (!Array.isArray(data)) throw new Error('Respuesta inesperada del servidor');
      setcontacts(data);
    } catch (err: any) {
      setFetchError(err.message || 'No se pudo conectar al servidor');
      setcontacts([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadcontactAppts = useCallback(async (contactId: number) => {
    setLoadingAppts(true);
    try {
      const r = await fetch('/api/appointments', { headers: { Authorization: `Bearer ${tok()}` } });
      if (r.ok) {
        const all = await r.json();
        setcontactAppts(all.filter((a: any) => a.contact_id === contactId));
      }
    } catch { setcontactAppts([]); }
    setLoadingAppts(false);
  }, []);

  const filtered = contacts.filter(p =>
    (p.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.phone || '').includes(search) ||
    (p.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.service_interested || '').toLowerCase().includes(search.toLowerCase())
  );

  const savecontact = async () => {
    if (!selected) return;
    setSaving(true);
    await fetch(`/api/contacts/${selected.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` },
      body: JSON.stringify(editForm)
    });
    // Cambio de estado via ruta dedicada
    if (editForm.status !== selected.status) {
      await fetch(`/api/contacts/${selected.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` },
        body: JSON.stringify({ status: editForm.status })
      });
    }
    setSaving(false);
    load();
    setSelected({ ...selected, ...editForm });
  };
  
  const deletecontact = async () => {
    if (!selected) return;
    if (!confirm('¿ESTÁS SEGURO? Esta acción eliminará permanentemente al paciente, todo su historial de mensajes y sus citas. Esta acción no se puede deshacer.')) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/contacts/${selected.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tok()}` }
      });
      if (r.ok) { setSelected(null); load(); }
    } catch (err) { console.error(err); }
    setSaving(false);
  };

  const apptStatusColor = (s: string) => {
    if (s === 'cancelada') return '#ff3b30';
    if (s === 'completada') return '#34c759';
    return '#ff9f0a';
  };

  return (
    <div className="contacts-page animate-ios">
      <div className="contacts-header">
        <div>
          <h1 className="page-title">Contactos / Leads</h1>
          <p className="page-sub">{contacts.length} contactos registrados en tu embudo</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <div className="view-toggle glass-card">
            <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}><List size={16} /> Lista</button>
            <button className={viewMode === 'kanban' ? 'active' : ''} onClick={() => setViewMode('kanban')}><LayoutGrid size={16} /> Kanban</button>
          </div>
          <button className="btn-ghost" title="Fusiona contactos duplicados" onClick={async () => {
            if(!confirm('¿Buscar y fusionar contactos duplicados (mismo número)?')) return;
            const r = await fetch('/api/contacts/merge-duplicates', { method: 'POST', headers: { Authorization: `Bearer ${tok()}` } });
            const data = await r.json();
            alert(data.message || 'Proceso completado.');
            load();
          }}><Users size={16} /> Unir Duplicados</button>
          <button className="btn-ghost" onClick={load}><RefreshCw size={16} className={loading ? 'spinning' : ''} /> Actualizar</button>
        </div>
      </div>

      <div className="contacts-layout">
        {/* VISTA KANBAN */}
        {viewMode === 'kanban' && (
          <div className="kanban-board">
            {['lead', 'nuevo', 'prospecto', 'frecuente', 'especial'].map(col => {
              const colcontacts = filtered.filter(p => p.status === col || (p.status?.toLowerCase() === col));
              const cfg = getStatusConfig(col);
              return (
                <div 
                  key={col} 
                  className="kanban-column glass-card"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={async (e) => {
                    e.preventDefault();
                    const idStr = e.dataTransfer.getData('contactId');
                    if (!idStr) return;
                    const id = parseInt(idStr);
                    // Actualización optimista
                    setcontacts(prev => prev.map(p => p.id === id ? { ...p, status: col } : p));
                    // API Call
                    await fetch(`/api/contacts/${id}/status`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` },
                      body: JSON.stringify({ status: col })
                    });
                  }}
                >
                  <div className="k-col-header" style={{ borderBottom: `2px solid ${cfg.color}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>{cfg.emoji}</span>
                      <h4 style={{ margin: 0, fontSize: '0.9rem' }}>{cfg.label}</h4>
                    </div>
                    <span className="k-count">{colcontacts.length}</span>
                  </div>
                  <div className="k-col-body">
                    {colcontacts.map(p => (
                      <div 
                        key={p.id} 
                        className="k-card glass-card" 
                        draggable 
                        onDragStart={(e) => e.dataTransfer.setData('contactId', p.id.toString())}
                        onClick={() => {
                          setSelected(p);
                          setEditForm({ name: p.name, email: p.email, service_interested: p.service_interested, status: p.status });
                          loadcontactAppts(p.id);
                          setViewMode('list'); // switch to list to view details
                        }}
                      >
                        <div className="k-card-title">{p.name || 'Sin nombre'}</div>
                        <div className="k-card-sub">{p.phone}</div>
                        <div className="k-card-footer">
                          {p.message_count ? <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}><MessageSquare size={10} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '2px' }}/> {p.message_count}</span> : <span />}
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{format(new Date(p.last_interaction || new Date()), "d MMM", { locale: es })}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* LISTA Y DETALLE */}
        {viewMode === 'list' && (
          <>
            <div className={`contacts-list glass-card ${selected ? 'hide-mobile' : ''}`}>
          <div className="search-bar">
            <Search size={16} />
            <input placeholder="Buscar por nombre, teléfono o servicio..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="contact-items">
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
              filtered.map((p, i) => {
                const cfg = getStatusConfig(p.status);
                return (
                  <motion.div
                    key={p.id}
                    className={`contact-item ${selected?.id === p.id ? 'active' : ''}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => {
                      setSelected(p);
                      setEditForm({ name: p.name, email: p.email, service_interested: p.service_interested, status: p.status });
                      loadcontactAppts(p.id);
                    }}
                  >
                    <div className="contact-avatar" style={{ background: cfg.color }}>
                      {p.status === 'especial' ? <Star size={16} color="white" /> : p.source === 'bot' ? <Bot size={16} color="white" /> : <User size={16} color="white" />}
                    </div>
                    <div className="contact-info">
                      <strong>{p.name || 'Nuevo paciente'}</strong>
                      <span>{p.phone}</span>
                    </div>
                    <div className="contact-meta">
                      <StatusBadge status={p.status} />
                      <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>

        {/* DETALLE */}
        <div className={`contact-detail glass-card ${!selected ? 'hide-mobile' : ''}`}>
          {!selected ? (
            <div className="no-selection"><Users size={48} style={{ opacity: 0.2 }} /><p>Selecciona un paciente para ver sus datos</p></div>
          ) : (
            <div className="detail-content">
              <button className="mobile-back-btn btn-ghost" onClick={() => setSelected(null)}>
                <ChevronRight size={16} style={{ transform: 'rotate(180deg)' }} /> Volver a la lista
              </button>
              
              <div className="detail-avatar" style={{ background: getStatusConfig(selected.status).color }}>
                {selected.status === 'especial' ? <Star size={32} color="white" /> : <User size={32} color="white" />}
              </div>
              <h2 className="detail-name">{selected.name || 'Sin nombre'}</h2>
              <div className="detail-stats">
                <div className="ds-item"><MessageSquare size={14} />{selected.message_count || 0} mensajes</div>
                <div className="ds-item"><StatusBadge status={selected.status} /></div>
              </div>

              <div className="detail-form">
                <h4>Información</h4>
                <label>Nombre<input value={editForm.name || ''} onChange={e => setEditForm((f: any) => ({ ...f, name: e.target.value }))} /></label>
                <label>Teléfono (WhatsApp)<input value={selected.phone || ''} disabled style={{ opacity: 0.5 }} /></label>
                <label>Email<input value={editForm.email || ''} onChange={e => setEditForm((f: any) => ({ ...f, email: e.target.value }))} placeholder="correo@ejemplo.com" /></label>
                <label>Servicio de Interés<input value={editForm.service_interested || ''} onChange={e => setEditForm((f: any) => ({ ...f, service_interested: e.target.value }))} placeholder="Ej: Limpieza dental" /></label>
                
                <label>Estado del Paciente
                  <select value={editForm.status || 'lead'} onChange={e => setEditForm((f: any) => ({ ...f, status: e.target.value }))}>
                    <option value="lead">🔵 Lead (nuevo sin datos)</option>
                    <option value="nuevo">🟢 Nuevo (dio su nombre)</option>
                    <option value="prospecto">🟡 Prospecto (contactado por mí)</option>
                    <option value="frecuente">🟣 Frecuente (2+ citas)</option>
                    <option value="especial">⭐ Especial (VIP)</option>
                  </select>
                </label>
              </div>

              <button className="btn-primary save-btn" onClick={savecontact} disabled={saving}>
                {saving ? <RefreshCw size={16} className="spinning" /> : null} {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>

              {/* Historial de Citas */}
              <div className="appt-history">
                <h4><CalendarCheck size={14} /> Historial de Citas</h4>
                {loadingAppts ? (
                  <div className="loading-state" style={{ padding: '1rem' }}><RefreshCw size={16} className="spinning" /></div>
                ) : contactAppts.length === 0 ? (
                  <p className="no-appts">Sin citas registradas</p>
                ) : contactAppts.map((a: any) => (
                  <div key={a.id} className="appt-item" style={{ borderLeftColor: apptStatusColor(a.status) }}>
                    <strong>{a.description || a.treatment_type || 'Cita'}</strong>
                    <span>{a.appointment_date ? format(new Date(a.appointment_date), "d 'de' MMMM yyyy, HH:mm", { locale: es }) : 'Sin fecha'}</span>
                    <span className="appt-status-tag" style={{ color: apptStatusColor(a.status) }}>{a.status}</span>
                  </div>
                ))}
              </div>

              <button className="btn-ghost delete-contact-btn" onClick={deletecontact} disabled={saving} style={{ marginTop: '0.5rem', color: '#ff3b30', border: '1px solid rgba(255,59,48,0.2)', width: '100%', justifyContent: 'center' }}>
                <Trash2 size={16} /> Eliminar Paciente Permanentemente
              </button>

              {selected.last_interaction && (
                <p className="last-seen">Última interacción: {format(new Date(selected.last_interaction), "d 'de' MMMM, HH:mm", { locale: es })}</p>
              )}
            </div>
          )}
        </div>
          </>
        )}
      </div>

      <style>{`
        .contacts-page{display:flex;flex-direction:column;gap:2rem}
        .contacts-header{display:flex;justify-content:space-between;align-items:flex-start}
        .page-title{font-size:2rem;font-weight:800}
        .page-sub{color:var(--text-muted);font-size:.9rem;margin-top:.25rem}
        .contacts-layout{display:grid;grid-template-columns:400px 1fr;gap:1.5rem;height:calc(100vh - 200px)}
        .contacts-list{border-radius:20px;display:flex;flex-direction:column;overflow:hidden}
        .search-bar{display:flex;align-items:center;gap:.75rem;padding:1rem 1.25rem;border-bottom:1px solid var(--glass-border)}
        .search-bar input{flex:1;border:none;background:none;font-size:.9rem;color:var(--text-primary)}
        .contact-items{flex:1;overflow-y:auto}
        .contact-item{display:flex;align-items:center;gap:1rem;padding:1rem 1.25rem;cursor:pointer;transition:var(--transition);border-bottom:1px solid var(--glass-border)}
        .contact-item:hover,.contact-item.active{background:var(--glass)}
        .contact-avatar{width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .contact-info{flex:1;display:flex;flex-direction:column;gap:2px;min-width:0}
        .contact-info strong{font-size:.9rem;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .contact-info span{font-size:.78rem;color:var(--text-muted)}
        .contact-meta{display:flex;align-items:center;gap:.5rem;flex-shrink:0}
        .contact-detail{border-radius:20px;padding:2rem;overflow-y:auto}
        .no-selection{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:1rem;color:var(--text-muted)}
        .detail-content{display:flex;flex-direction:column;align-items:center;gap:1.25rem}
        .detail-avatar{width:80px;height:80px;border-radius:50%;display:flex;align-items:center;justify-content:center}
        .detail-name{font-size:1.5rem;font-weight:800;text-align:center}
        .detail-stats{display:flex;gap:1.5rem;flex-wrap:wrap;justify-content:center}
        .ds-item{display:flex;align-items:center;gap:.4rem;font-size:.8rem;color:var(--text-muted);font-weight:600}
        .detail-form{width:100%;display:flex;flex-direction:column;gap:.75rem;margin-top:.5rem}
        .detail-form h4{font-size:.85rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:.25rem;display:flex;align-items:center;gap:.4rem}
        .detail-form label{display:flex;flex-direction:column;gap:.3rem;font-size:.8rem;font-weight:600;color:var(--text-secondary)}
        .detail-form input,.detail-form select{padding:.7rem 1rem;border-radius:12px;border:1px solid var(--glass-border);background:var(--bg-surface);font-size:.9rem;color:var(--text-primary)}
        .save-btn{width:100%;justify-content:center;margin-top:.5rem}
        .last-seen{font-size:.75rem;color:var(--text-muted)}
        .loading-state{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.75rem;padding:3rem;color:var(--text-muted);font-size:.9rem}
        .btn-primary{background:var(--primary);color:white;padding:.75rem 1.5rem;border-radius:var(--radius-full);font-weight:700;display:flex;align-items:center;gap:.5rem;font-size:.9rem;border:none;cursor:pointer}
        .btn-ghost{padding:.65rem 1.25rem;border-radius:var(--radius-full);font-weight:600;color:var(--text-secondary);background:var(--glass);display:flex;align-items:center;gap:.5rem;font-size:.85rem;border:none;cursor:pointer}
        .view-toggle { display: flex; padding: 0.25rem; border-radius: 12px; }
        .view-toggle button { display: flex; align-items: center; gap: 0.4rem; padding: 0.5rem 1rem; border: none; background: transparent; color: var(--text-muted); cursor: pointer; border-radius: 8px; font-weight: 600; font-size: 0.85rem; transition: 0.3s; }
        .view-toggle button.active { background: var(--bg-app); color: var(--text-primary); box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
        .mobile-back-btn{display:none;align-self:flex-start}

        /* Kanban Styles */
        .kanban-board { display: flex; gap: 1rem; overflow-x: auto; padding-bottom: 1rem; height: 100%; grid-column: 1 / -1; }
        .kanban-column { min-width: 280px; width: 280px; display: flex; flex-direction: column; background: rgba(var(--bg-app-rgb), 0.3); border: 1px solid var(--glass-border); padding: 1rem; border-radius: 16px; }
        .k-col-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 0.75rem; margin-bottom: 1rem; }
        .k-count { background: var(--glass); padding: 0.2rem 0.6rem; border-radius: 12px; font-size: 0.75rem; font-weight: 700; color: var(--text-muted); }
        .k-col-body { display: flex; flex-direction: column; gap: 0.75rem; flex: 1; overflow-y: auto; }
        .k-card { padding: 1rem; cursor: grab; background: var(--bg-surface); border: 1px solid var(--glass-border); display: flex; flex-direction: column; gap: 0.4rem; transition: 0.2s; }
        .k-card:active { cursor: grabbing; transform: scale(0.98); }
        .k-card:hover { border-color: var(--primary); box-shadow: 0 5px 15px rgba(0,0,0,0.05); }
        .k-card-title { font-weight: 700; font-size: 0.9rem; color: var(--text-primary); }
        .k-card-sub { font-size: 0.8rem; color: var(--text-muted); }
        .k-card-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 0.25rem; border-top: 1px solid var(--glass-border); padding-top: 0.5rem; }

        /* Historial citas */
        .appt-history{width:100%;display:flex;flex-direction:column;gap:.5rem;margin-top:.25rem}
        .appt-history h4{font-size:.85rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;display:flex;align-items:center;gap:.4rem;margin-bottom:.25rem}
        .appt-item{padding:.6rem .9rem;background:var(--glass);border-radius:12px;border-left:3px solid var(--primary);display:flex;flex-direction:column;gap:2px}
        .appt-item strong{font-size:.85rem;font-weight:700}
        .appt-item span{font-size:.75rem;color:var(--text-muted)}
        .appt-status-tag{font-size:.7rem;font-weight:700;text-transform:capitalize}
        .no-appts{font-size:.82rem;color:var(--text-muted);text-align:center;padding:.5rem}
        @keyframes spin{to{transform:rotate(360deg)}}
        .spinning{animation:spin .8s linear infinite}
        @media(max-width:900px){
          .contacts-layout{grid-template-columns:1fr;height:auto; min-height: calc(100vh - 200px);}
          .contact-detail{min-height:calc(100vh - 250px); padding: 1.25rem;}
          .hide-mobile{display:none !important}
          .mobile-back-btn{display:flex; margin-bottom: 1rem;}
          .contacts-header{flex-direction:column;gap:1rem; align-items: stretch;}
          .btn-ghost { justify-content: center; width: 100%; }
          .page-title { font-size: 1.5rem; }
          .detail-name { font-size: 1.25rem; }
        }
      `}</style>
    </div>
  );
};
export default contactsPage;

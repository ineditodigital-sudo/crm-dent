import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Pencil, Trash2, Check, X, Clock, DollarSign, Sparkles, ToggleLeft, ToggleRight, RefreshCw, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const tok = () => localStorage.getItem('crm_token') || '';
interface Service { id: number; name: string; description: string; price: number | null; duration_minutes: number; active: boolean; image_url?: string; }
const emptyForm = (): Partial<Service> => ({ name: '', description: '', price: undefined, duration_minutes: 60, active: true, image_url: '' });

const ServicesPage = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | 'new' | null>(null);
  const [form, setForm] = useState<Partial<Service>>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await fetch('/api/services', { headers: { Authorization: `Bearer ${tok()}` } }); setServices(await r.json()); } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData(); fd.append('image', file);
    try {
      const r = await fetch('/api/upload', { method: 'POST', headers: { Authorization: `Bearer ${tok()}` }, body: fd });
      const data = await r.json();
      if (data.url) setForm(f => ({ ...f, image_url: data.url }));
    } catch (err) { setError('Error subiendo imagen'); }
    setUploading(false);
  };

  const save = async () => {
    if (!form.name) { setError('El nombre es requerido'); return; }
    setSaving(true); setError('');
    try {
      const url = editingId === 'new' ? '/api/services' : `/api/services/${editingId}`;
      const r = await fetch(url, { method: editingId === 'new' ? 'POST' : 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` }, body: JSON.stringify(form) });
      if (!r.ok) throw new Error((await r.json()).error);
      setEditingId(null); setForm(emptyForm()); load();
    } catch (e: any) { setError(e.message); }
    setSaving(false);
  };

  const toggle = async (s: Service) => {
    await fetch(`/api/services/${s.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` }, body: JSON.stringify({ active: !s.active }) });
    load();
  };

  const del = async (id: number) => {
    if (!confirm('¿Eliminar este servicio?')) return;
    await fetch(`/api/services/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${tok()}` } });
    load();
  };

  return (
    <div className="services-page animate-ios">
      <div className="services-header">
        <div>
          <h1 className="page-title">Servicios</h1>
          <p className="page-sub">La IA consulta estos servicios en tiempo real para informar a los pacientes.</p>
        </div>
        <button className="btn-primary" onClick={() => { setEditingId('new'); setForm(emptyForm()); }}>
          <Plus size={18} /> Nuevo Servicio
        </button>
      </div>

      <AnimatePresence>
        {editingId !== null && (
          <motion.div className="service-form-card glass-card" initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
            <h3 style={{ marginBottom: '1.5rem', fontWeight: 700 }}>{editingId === 'new' ? '✨ Nuevo Servicio' : '✏️ Editar Servicio'}</h3>
            <div className="form-grid">
              <div className="image-upload-section full-width">
                <div className="service-img-preview" onClick={() => fileInputRef.current?.click()}>
                  {form.image_url ? <img src={form.image_url} alt="Preview" /> : <div className="img-placeholder"><ImageIcon size={32} /><p>Subir Imagen</p></div>}
                  {uploading && <div className="upload-overlay"><RefreshCw size={24} className="spinning" /></div>}
                </div>
                <input type="file" ref={fileInputRef} hidden onChange={handleUpload} accept="image/*" />
                <p className="img-hint">Recomendado: 800x600px. Se mostrará en la landing page.</p>
              </div>

              <label>Nombre *<input value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Limpieza Dental" /></label>
              <label>Precio (MXN)<input type="number" value={form.price ?? ''} onChange={e => setForm(f => ({ ...f, price: e.target.value ? Number(e.target.value) : undefined }))} placeholder="0.00" min="0" step="0.01" /></label>
              <label>Duración (min)<input type="number" value={form.duration_minutes || 60} onChange={e => setForm(f => ({ ...f, duration_minutes: Number(e.target.value) }))} min="15" step="15" /></label>
              <label className="full-width">Descripción<textarea value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Descripción que verá la IA y los pacientes..." rows={3} /></label>
            </div>
            {error && <div className="form-error">{error}</div>}
            <div className="form-actions">
              <button className="btn-ghost" onClick={() => { setEditingId(null); setError(''); }}><X size={16} /> Cancelar</button>
              <button className="btn-primary" onClick={save} disabled={saving || uploading}>
                {saving ? <RefreshCw size={16} className="spinning" /> : <Check size={16} />} {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="loading-state"><RefreshCw size={24} className="spinning" /> Cargando...</div>
      ) : services.length === 0 ? (
        <div className="empty-state glass-card"><Sparkles size={40} style={{ opacity: 0.3 }} /><p>No hay servicios aún. ¡Agrega el primero!</p></div>
      ) : (
        <div className="services-grid">
          {services.map((s, i) => (
            <motion.div key={s.id} className={`service-card glass-card ${!s.active ? 'inactive' : ''}`} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              {s.image_url && <div className="card-img-top"><img src={s.image_url} alt={s.name} /></div>}
              <div className="sc-header">
                <div className="sc-icon"><Sparkles size={20} /></div>
                <div className="sc-meta">
                  <h3>{s.name}</h3>
                  {!s.active && <span className="badge-inactive">Inactivo</span>}
                </div>
              </div>
              {s.description && <p className="sc-desc">{s.description}</p>}
              <div className="sc-footer">
                <div className="sc-stats">
                  {s.price != null && <span className="sc-stat"><DollarSign size={13} />${Number(s.price).toLocaleString('es-MX')}</span>}
                  <span className="sc-stat"><Clock size={13} />{s.duration_minutes} min</span>
                </div>
                <div className="sc-actions">
                  <button className="icon-btn" onClick={() => toggle(s)} title={s.active ? 'Desactivar' : 'Activar'}>
                    {s.active ? <ToggleRight size={18} style={{ color: 'var(--primary)' }} /> : <ToggleLeft size={18} />}
                  </button>
                  <button className="icon-btn" onClick={() => { setEditingId(s.id); setForm({ ...s }); }}><Pencil size={15} /></button>
                  <button className="icon-btn danger" onClick={() => del(s.id)}><Trash2 size={15} /></button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <style>{`
        .services-page{display:flex;flex-direction:column;gap:2rem}
        .services-header{display:flex;justify-content:space-between;align-items:flex-start}
        .page-title{font-size:2rem;font-weight:800}
        .page-sub{color:var(--text-muted);font-size:.9rem;margin-top:.25rem}
        .service-form-card{padding:2rem;border-radius:20px}
        .form-grid{display:grid;grid-template-columns:1fr 1fr;gap:1.25rem}
        .full-width{grid-column:1/-1}
        
        .image-upload-section{display:flex;flex-direction:column;gap:.75rem;margin-bottom:1rem}
        .service-img-preview{width:200px;height:140px;border-radius:16px;overflow:hidden;background:var(--bg-surface);border:2px dashed var(--glass-border);cursor:pointer;position:relative;transition:all .3s}
        .service-img-preview:hover{border-color:var(--primary);background:rgba(0,122,255,.05)}
        .service-img-preview img{width:100%;height:100%;object-fit:cover}
        .img-placeholder{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.5rem;color:var(--text-muted);font-size:.75rem}
        .upload-overlay{position:absolute;inset:0;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;color:white}
        .img-hint{font-size:.7rem;color:var(--text-muted)}

        .form-grid label{display:flex;flex-direction:column;gap:.4rem;font-size:.8rem;font-weight:600;color:var(--text-secondary)}
        .form-grid input,.form-grid textarea{padding:.75rem 1rem;border-radius:12px;border:1px solid var(--glass-border);background:var(--bg-surface);font-size:.9rem;color:var(--text-primary);resize:vertical}
        .form-error{color:#ff3b30;font-size:.8rem;background:rgba(255,59,48,.1);padding:.5rem .75rem;border-radius:8px;margin-top:.5rem}
        .form-actions{display:flex;justify-content:flex-end;gap:1rem;margin-top:1.5rem}
        .services-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:1.25rem}
        .service-card{padding:1.5rem;border-radius:18px;display:flex;flex-direction:column;gap:.75rem;transition:var(--transition);overflow:hidden}
        .service-card.inactive{opacity:.5}
        .card-img-top{margin:-1.5rem -1.5rem .5rem;height:160px;overflow:hidden}
        .card-img-top img{width:100%;height:100%;object-fit:cover;transition:transform .5s}
        .service-card:hover .card-img-top img{transform:scale(1.05)}

        .sc-header{display:flex;align-items:center;gap:1rem}
        .sc-icon{width:40px;height:40px;background:rgba(0,122,255,.12);border-radius:12px;display:flex;align-items:center;justify-content:center;color:var(--primary);flex-shrink:0}
        .sc-meta h3{font-size:1rem;font-weight:700}
        .badge-inactive{font-size:.65rem;background:rgba(255,59,48,.15);color:#ff3b30;padding:2px 6px;border-radius:6px;font-weight:600}
        .sc-desc{font-size:.82rem;color:var(--text-muted);line-height:1.5;flex:1}
        .sc-footer{display:flex;justify-content:space-between;align-items:center;margin-top:auto}
        .sc-stats{display:flex;gap:.75rem}
        .sc-stat{display:flex;align-items:center;gap:4px;font-size:.78rem;color:var(--text-muted);font-weight:600}
        .sc-actions{display:flex;gap:.25rem}
        .icon-btn{padding:.4rem;border-radius:8px;color:var(--text-muted);transition:var(--transition)}
        .icon-btn:hover{background:var(--glass);color:var(--text-primary)}
        .icon-btn.danger:hover{color:#ff3b30;background:rgba(255,59,48,.1)}
        .loading-state{display:flex;align-items:center;justify-content:center;gap:1rem;padding:4rem;color:var(--text-muted)}
        .empty-state{padding:4rem;text-align:center;display:flex;flex-direction:column;align-items:center;gap:1rem;border-radius:20px}
        .btn-primary{background:var(--primary);color:white;padding:.75rem 1.5rem;border-radius:var(--radius-full);font-weight:700;display:flex;align-items:center;gap:.5rem;font-size:.9rem}
        .btn-ghost{padding:.75rem 1.5rem;border-radius:var(--radius-full);font-weight:600;color:var(--text-secondary);background:var(--glass);display:flex;align-items:center;gap:.5rem;font-size:.9rem}
        @keyframes spin{to{transform:rotate(360deg)}}
        .spinning{animation:spin .8s linear infinite}
        @media(max-width:768px){
          .form-grid{grid-template-columns:1fr}
          .services-header{flex-direction:column;gap:1rem; align-items: stretch;}
          .btn-primary { justify-content: center; width: 100%; }
          .page-title { font-size: 1.5rem; }
          .service-form-card { padding: 1.25rem; }
          .form-actions { flex-direction: column; }
          .form-actions button { width: 100%; justify-content: center; }
          .services-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
};
export default ServicesPage;

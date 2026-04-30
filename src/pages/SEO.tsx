import { useState, useEffect } from 'react';
import { Save, Share2, Search, FileText, Code, CheckCircle, RefreshCw, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const tok = () => localStorage.getItem('crm_token') || '';

const SEOPage = () => {
  const [settings, setSettings] = useState<any>({
    title: '',
    description: '',
    keywords: '',
    canonical_url: '',
    og_title: '',
    og_description: '',
    og_image: '',
    robots: 'index, follow',
    robots_txt: '',
    json_ld: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetch('/api/settings/seo', { headers: { Authorization: `Bearer ${tok()}` } })
      .then(res => res.json())
      .then(data => {
        setSettings((s: any) => ({ ...s, ...data }));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const res = await fetch('/api/settings/seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` },
        body: JSON.stringify(settings)
      });
      if (res.ok) setMessage({ type: 'success', text: 'Configuración SEO guardada correctamente.' });
      else throw new Error('Error al guardar');
    } catch (e) {
      setMessage({ type: 'error', text: 'Error al conectar con el servidor.' });
    }
    setSaving(false);
  };

  if (loading) return <div className="loading-container" style={{padding: '4rem', textAlign: 'center'}}><RefreshCw className="spinning" /> Cargando SEO...</div>;

  return (
    <div className="seo-page animate-ios">
      <div className="page-header">
        <div>
          <h1 className="page-title">SEO & Marketing</h1>
          <p className="page-sub">Optimiza la visibilidad de tu landing page en Google y redes sociales.</p>
        </div>
        <button className="btn-primary" onClick={save} disabled={saving}>
          {saving ? <RefreshCw size={18} className="spinning" /> : <Save size={18} />}
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>

      {message.text && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }}
          className={`alert-banner ${message.type}`}
        >
          {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {message.text}
        </motion.div>
      )}

      <div className="seo-grid">
        {/* --- META TAGS PRINCIPALES --- */}
        <div className="seo-section glass-card">
          <div className="section-header">
            <Search size={20} className="section-icon" />
            <div>
              <h3>Meta Etiquetas Básicas</h3>
              <p>Controlan el título y descripción que Google muestra en los resultados.</p>
            </div>
          </div>
          <div className="form-group">
            <label><Search size={14} /> Título de la Página (Meta Title)</label>
            <input 
              value={settings.title || ''} 
              onChange={e => setSettings({...settings, title: e.target.value})}
              placeholder="Ej: Clínica Dental Smile - Ortodoncia e Implantes en CDMX"
              maxLength={60}
            />
            <span className={`char-count ${(settings.title || '').length > 55 ? 'warning' : ''}`}>
              {(settings.title || '').length}/60 - Recomendado máx 60
            </span>
          </div>
          <div className="form-group">
            <label><FileText size={14} /> Descripción (Meta Description)</label>
            <textarea 
              value={settings.description || ''} 
              onChange={e => setSettings({...settings, description: e.target.value})}
              placeholder="Breve resumen de 150-160 caracteres..."
              rows={3}
              maxLength={160}
            />
            <span className={`char-count ${(settings.description || '').length > 150 ? 'warning' : ''}`}>
              {(settings.description || '').length}/160 - Recomendado máx 160
            </span>
          </div>
          <div className="form-group">
            <label>Palabras Clave (Keywords)</label>
            <input 
              value={settings.keywords || ''} 
              onChange={e => setSettings({...settings, keywords: e.target.value})}
              placeholder="dentista, ortodoncia, limpieza dental..."
            />
          </div>
        </div>

        {/* --- SOCIAL MEDIA (Open Graph) --- */}
        <div className="seo-section glass-card">
          <div className="section-header">
            <Share2 size={20} className="section-icon" />
            <div>
              <h3>Redes Sociales (Open Graph)</h3>
              <p>Cómo se ve tu link al compartirlo en WhatsApp, Facebook o Twitter.</p>
            </div>
          </div>
          <div className="form-group">
            <label>Título para Redes</label>
            <input 
              value={settings.og_title || ''} 
              onChange={e => setSettings({...settings, og_title: e.target.value})}
              placeholder="Título llamativo para compartir"
            />
          </div>
          <div className="form-group">
            <label>Descripción para Redes</label>
            <textarea 
              value={settings.og_description || ''} 
              onChange={e => setSettings({...settings, og_description: e.target.value})}
              placeholder="Descripción corta para previsualización"
              rows={2}
            />
          </div>
          <div className="form-group">
            <label>URL de Imagen (Preview Image)</label>
            <input 
              value={settings.og_image || ''} 
              onChange={e => setSettings({...settings, og_image: e.target.value})}
              placeholder="https://tu-dominio.com/banner-seo.jpg"
            />
            <p className="field-hint">Usa una imagen de 1200x630px para mejores resultados.</p>
          </div>
        </div>

        {/* --- TÉCNICO --- */}
        <div className="seo-section glass-card">
          <div className="section-header">
            <Code size={20} className="section-icon" />
            <div>
              <h3>Configuración Técnica</h3>
              <p>Instrucciones directas para los rastreadores.</p>
            </div>
          </div>
          <div className="form-group">
            <label>URL Canónica</label>
            <input 
              value={settings.canonical_url || ''} 
              onChange={e => setSettings({...settings, canonical_url: e.target.value})}
              placeholder="https://crm-dent.inedito.digital/"
            />
          </div>
          <div className="form-group">
            <label>Directiva Robots (Indexación)</label>
            <select 
              value={settings.robots || 'index, follow'} 
              onChange={e => setSettings({...settings, robots: e.target.value})}
            >
              <option value="index, follow">Indexar y Seguir (Recomendado)</option>
              <option value="noindex, follow">No Indexar pero Seguir links</option>
              <option value="index, nofollow">Indexar pero No Seguir links</option>
              <option value="noindex, nofollow">Ocultar completamente de Google</option>
            </select>
          </div>
        </div>

        {/* --- ROBOTS.TXT & JSON-LD --- */}
        <div className="seo-section glass-card full-width">
          <div className="section-header">
            <FileText size={20} className="section-icon" />
            <div>
              <h3>Scripts & Archivos de Servidor</h3>
              <p>Datos estructurados y reglas de rastreo avanzadas.</p>
            </div>
          </div>
          <div className="editor-grid">
            <div className="form-group">
              <label>Archivo robots.txt (Personalizado)</label>
              <textarea 
                className="code-editor"
                value={settings.robots_txt || ''} 
                onChange={e => setSettings({...settings, robots_txt: e.target.value})}
                placeholder="User-agent: *..."
                rows={6}
              />
            </div>
            <div className="form-group">
              <label>Datos Estructurados (JSON-LD)</label>
              <textarea 
                className="code-editor"
                value={settings.json_ld || ''} 
                onChange={e => setSettings({...settings, json_ld: e.target.value})}
                placeholder='{"@context": "https://schema.org", "@type": "LocalBusiness" ...}'
                rows={6}
              />
              <p className="field-hint">Inserta aquí el código generado en Schema.org para potenciar Rich Results.</p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .seo-page { display: flex; flex-direction: column; gap: 2rem; }
        .page-header { display: flex; justify-content: space-between; align-items: flex-start; }
        .page-title { font-size: 2rem; font-weight: 800; color: var(--text-primary); }
        .page-sub { color: var(--text-muted); font-size: 0.95rem; }
        
        .alert-banner { 
          padding: 1rem 1.5rem; 
          border-radius: 12px; 
          display: flex; 
          align-items: center; 
          gap: 0.75rem; 
          font-weight: 600; 
          font-size: 0.9rem;
          margin-top: 1rem;
        }
        .alert-banner.success { background: rgba(52, 199, 89, 0.1); color: #34c759; border: 1px solid rgba(52, 199, 89, 0.2); }
        .alert-banner.error { background: rgba(255, 59, 48, 0.1); color: #ff3b30; border: 1px solid rgba(255, 59, 48, 0.2); }

        .seo-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 1.5rem; margin-top: 1rem; }
        .full-width { grid-column: 1 / -1; }

        .seo-section { padding: 1.5rem; border-radius: 20px; display: flex; flex-direction: column; gap: 1.5rem; }
        .section-header { display: flex; gap: 1rem; align-items: flex-start; }
        .section-icon { color: var(--primary); background: rgba(0, 122, 255, 0.1); padding: 8px; border-radius: 12px; box-sizing: content-box; }
        .section-header h3 { font-size: 1.1rem; font-weight: 700; margin: 0; color: var(--text-primary); }
        .section-header p { font-size: 0.8rem; color: var(--text-muted); margin: 2px 0 0; }

        .form-group { display: flex; flex-direction: column; gap: 0.5rem; }
        .form-group label { font-size: 0.85rem; font-weight: 700; color: var(--text-secondary); display: flex; align-items: center; gap: 0.5rem; }
        .form-group input, .form-group textarea, .form-group select {
          padding: 0.8rem 1rem;
          border-radius: 12px;
          border: 1px solid var(--glass-border);
          background: var(--bg-surface);
          color: var(--text-primary);
          font-size: 0.9rem;
          transition: var(--transition);
        }
        .form-group input:focus, .form-group textarea:focus { border-color: var(--primary); outline: none; }
        
        .char-count { font-size: 0.7rem; color: var(--text-muted); align-self: flex-end; }
        .char-count.warning { color: #ffb700; font-weight: 700; }
        .field-hint { font-size: 0.75rem; color: var(--text-muted); font-style: italic; }
        
        .code-editor { font-family: 'monospace'; font-size: 0.8rem; background: #1a1a1a !important; color: #00ff41 !important; border-color: #333 !important; }
        
        .editor-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
        
        .btn-primary { 
          background: var(--primary); color: white; padding: 0.8rem 1.5rem; 
          border-radius: var(--radius-full); font-weight: 700; display: flex; 
          align-items: center; gap: 0.5rem; font-size: 0.95rem; border: none; cursor: pointer;
        }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spinning { animation: spin 1s linear infinite; }

        @media (max-width: 768px) {
          .seo-grid { grid-template-columns: 1fr; gap: 1rem; }
          .editor-grid { grid-template-columns: 1fr; }
          .page-header { flex-direction: column; gap: 1rem; align-items: stretch; }
          .btn-primary { justify-content: center; width: 100%; }
          .page-title { font-size: 1.5rem; }
          .seo-section { padding: 1.25rem; }
          .char-count { font-size: 0.65rem; }
        }
      `}</style>
    </div>
  );
};

export default SEOPage;

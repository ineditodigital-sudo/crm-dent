import { useState, useEffect, useRef } from 'react';
import { Type, LayoutTemplate, Activity, CheckCircle, Globe, Bot, Palette, User, Sparkles, RefreshCw, X, Camera, Plus, Monitor, Smartphone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useBrand } from '../context/BrandContext';

const SECTIONS = [
  { id: 'brand',        label: 'Marca',        icon: <Palette size={16} /> },
  { id: 'hero',         label: 'Hero',          icon: <LayoutTemplate size={16} /> },
  { id: 'professional', label: 'Especialista',  icon: <User size={16} /> },
  { id: 'services',     label: 'Servicios',     icon: <Type size={16} /> },
  { id: 'gallery',      label: 'Galería',       icon: <Camera size={16} /> }, // Nueva sección
  { id: 'faq',          label: 'FAQs',          icon: <Bot size={16} /> },
  { id: 'contact',      label: 'Contacto',      icon: <Globe size={16} /> },
];

const FieldGroup = ({ label, children }: any) => (
  <div style={{ marginBottom: '1.25rem' }}>
    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{label}</label>
    {children}
  </div>
);

const inputStyle: any = {
  width: '100%', padding: '0.85rem 1rem', background: 'var(--bg-app)',
  border: '2px solid transparent', borderRadius: 12, fontSize: '0.9rem',
  color: 'var(--text-primary)', transition: 'all 0.2s', boxSizing: 'border-box',
};

const WebEditor = () => {
  const [settings, setSettings] = useState<any>({ hero: {}, services: {}, contact: {} });
  const [loading, setLoading] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [activeSection, setActiveSection] = useState('brand');
  const [previewKey, setPreviewKey] = useState(0);
  const { authFetch } = useAuth();
  const { brand } = useBrand();
  const [generatingLanding, setGeneratingLanding] = useState(false);
  const [landingPreview, setLandingPreview] = useState('');
  const saveTimeout = useRef<any>(null);

  useEffect(() => {
    authFetch('/api/settings')
      .then(res => res.ok ? res.json() : {})
      .then((data: any) => {
        setSettings({
          hero: data.hero || { title: 'Sonrisas Brillantes, Vida Feliz', subtitle: 'Ofrecemos los mejores tratamientos...' },
          services: data.services || { title: 'Nuestras Especialidades' },
          contact: data.contact || { phone: '+52 123 456 7890', address: 'Av. Principal #123' },
          ai_context: data.ai_context || { services: 'Blanqueamiento, Limpieza, Ortodoncia', prices: '', hours: 'Lunes a Viernes 9-7' },
          brand: data.brand || {},
          theme: data.theme || {},
          images: data.images || {},
          api_keys: data.api_keys || {},
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [authFetch]);

  const handleChange = (section: string, key: string, value: string) => {
    setSettings((prev: any) => ({ ...prev, [section]: { ...prev[section], [key]: value } }));
  };

  const handleSave = async (section: string, key_name: string, content: string) => {
    try {
      await authFetch('/api/settings', { method: 'POST', body: JSON.stringify({ section, key_name, content }) });
      setSaveSuccess(true);
      setPreviewKey(k => k + 1);
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => setSaveSuccess(false), 2500);
    } catch {}
  };

  const handleUpload = async (section: string, key: string, file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    try {
      const res = await authFetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) { handleChange(section, key, data.url); handleSave(section, key, data.url); }
    } catch {}
  };
  const generateLandingContent = async () => {
    if (!brand.giro && !brand.clinic_name) {
      alert('Primero ingresa el nombre y giro del negocio en la sección Negocio.');
      return;
    }
    setGeneratingLanding(true);
    try {
      const r = await authFetch('/api/brand/generate-landing', {
        method: 'POST',
        body: JSON.stringify({ clinic_name: brand.clinic_name, giro: brand.giro, tagline: brand.tagline })
      });
      if (r.ok) {
        const data = await r.json();
        const applied = data.applied || {};
        const count = Object.values(applied).filter(Boolean).length;
        setLandingPreview(
          `✅ ${count} secciones aplicadas automáticamente:\n\n` +
          `📌 Título Hero: ${applied.heroTitulo || '—'}\n` +
          `📝 Subtítulo: ${applied.heroSubtitulo || '—'}`
        );
        // Recargar settings para ver cambios en los inputs
        const res = await authFetch('/api/settings');
        if (res.ok) {
          const newData = await res.json();
          setSettings((prev: any) => ({ ...prev, ...newData }));
          setPreviewKey(k => k + 1);
        }
      } else {
        alert('No se pudo generar el contenido. Revisa la configuración de Gemini.');
      }
    } catch (err) { alert('Error de conexión'); }
    setGeneratingLanding(false);
  };

  if (loading) return <div style={{ padding: '3rem', display: 'flex', justifyContent: 'center' }}><Activity className="animate-spin" size={40} color="var(--primary)" /></div>;

  return (
    <div className="webeditor-container animate-ios">
      <div className="webeditor-layout">
        
        {/* === SECCIÓN 1: TABS === */}
        <div className="editor-tabs-sidebar">
          {SECTIONS.map(s => (
            <button key={s.id} title={s.label} onClick={() => setActiveSection(s.id)} className={`sidebar-tab ${activeSection === s.id ? 'active' : ''}`}>
              {s.icon}
            </button>
          ))}
        </div>

        {/* === SECCIÓN 2: CONTROLES === */}
        <div className="editor-controls-panel">
          <div className="controls-header">
            <div>
              <h2 className="controls-title">{SECTIONS.find(s => s.id === activeSection)?.label}</h2>
              <p className="controls-sub">Edita y guarda al salir</p>
            </div>
            {saveSuccess && (
              <span className="save-status">
                <CheckCircle size={14} /> Guardado
              </span>
            )}
          </div>
  
          <div className="controls-scroll-area">
            
            <div className="ia-generator-widget">
              <div className="ia-widget-header">
                <Sparkles size={16} />
                <span>Generador de Contenido IA</span>
              </div>
              <p className="ia-widget-desc">Usa la info de tu negocio para crear textos persuasivos automáticamente.</p>
              <button 
                onClick={generateLandingContent} 
                disabled={generatingLanding}
                className="btn-ia-generate"
              >
                {generatingLanding ? <RefreshCw size={14} className="spinning" /> : <Sparkles size={14} />}
                {generatingLanding ? 'Generando...' : 'Generar Landing con IA'}
              </button>
              {landingPreview && (
                <div className="ia-preview-box">
                  <button onClick={() => setLandingPreview('')} className="close-ia-preview"><X size={12} /></button>
                  <pre>{landingPreview}</pre>
                </div>
              )}
            </div>
  
            {/* --- MARCA --- */}
            {activeSection === 'brand' && (
              <>
                <FieldGroup label="Logo Principal (Color)">
                  <input type="file" accept="image/*" onChange={e => e.target.files?.[0] && handleUpload('brand', 'logo_url', e.target.files[0])} style={{ ...inputStyle, padding: '0.6rem' }} />
                  {settings.brand?.logo_url && <img src={settings.brand.logo_url} alt="logo" className="preview-thumb light" />}
                </FieldGroup>
  
                <FieldGroup label="Logo Alternativo (Blanco/Negativo)">
                  <input type="file" accept="image/*" onChange={e => e.target.files?.[0] && handleUpload('brand', 'logo_dark_url', e.target.files[0])} style={{ ...inputStyle, padding: '0.6rem' }} />
                  {settings.brand?.logo_dark_url && <img src={settings.brand.logo_dark_url} alt="logo dark" className="preview-thumb dark" />}
                  <p className="field-hint">Ideal para fondos oscuros o barras de navegación.</p>
                </FieldGroup>
  
                <FieldGroup label="Nombre del Negocio">
                  <input type="text" value={settings.brand?.clinic_name || ''} onChange={e => handleChange('brand', 'clinic_name', e.target.value)} onBlur={e => handleSave('brand', 'clinic_name', e.target.value)} style={inputStyle} />
                </FieldGroup>
                <FieldGroup label="Giro / Especialidad">
                  <input type="text" value={settings.brand?.giro || ''} onChange={e => handleChange('brand', 'giro', e.target.value)} onBlur={e => handleSave('brand', 'giro', e.target.value)} style={inputStyle} />
                </FieldGroup>
                <div className="grid-2-cols">
                  <FieldGroup label="Color Principal">
                    <input type="color" value={settings.theme?.primary || '#007aff'} onChange={e => handleChange('theme', 'primary', e.target.value)} onBlur={e => handleSave('theme', 'primary', e.target.value)} className="color-picker-input" />
                  </FieldGroup>
                  <FieldGroup label="Tipografía">
                    <select value={settings.theme?.font || 'Inter'} onChange={e => { handleChange('theme', 'font', e.target.value); handleSave('theme', 'font', e.target.value); }} style={{ ...inputStyle }}>
                      <option value="Inter">Inter (Moderna)</option>
                      <option value="Playfair Display">Playfair (Clásica)</option>
                      <option value="Poppins">Poppins</option>
                      <option value="Roboto">Roboto</option>
                    </select>
                  </FieldGroup>
                </div>
              </>
            )}
  
            {/* --- HERO --- */}
            {activeSection === 'hero' && (
              <>
                <FieldGroup label="Imagen Hero">
                  <input type="file" accept="image/*" onChange={e => e.target.files?.[0] && handleUpload('images', 'hero', e.target.files[0])} style={{ ...inputStyle, padding: '0.6rem' }} />
                  {settings.images?.hero && <img src={settings.images.hero} alt="hero" className="hero-preview-img" />}
                </FieldGroup>
                <FieldGroup label="Título Principal">
                  <input type="text" value={settings.hero?.title || ''} onChange={e => handleChange('hero', 'title', e.target.value)} onBlur={e => handleSave('hero', 'title', e.target.value)} style={inputStyle} />
                </FieldGroup>
                <FieldGroup label="Subtítulo">
                  <textarea rows={4} value={settings.hero?.subtitle || ''} onChange={e => handleChange('hero', 'subtitle', e.target.value)} onBlur={e => handleSave('hero', 'subtitle', e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} />
                </FieldGroup>
              </>
            )}
  
            {/* --- ESPECIALISTA --- */}
            {activeSection === 'professional' && (
              <>
                <FieldGroup label="Mostrar Sección de Profesional">
                  <select 
                    value={settings.professional?.show || 'yes'} 
                    onChange={e => { handleChange('professional', 'show', e.target.value); handleSave('professional', 'show', e.target.value); }}
                    style={inputStyle}
                  >
                    <option value="yes">Sí, mostrar sección</option>
                    <option value="no">No, ocultar sección</option>
                  </select>
                </FieldGroup>
                <FieldGroup label="Foto del Especialista">
                  <input type="file" accept="image/*" onChange={e => e.target.files?.[0] && handleUpload('images', 'doctor', e.target.files[0])} style={{ ...inputStyle, padding: '0.6rem' }} />
                  {settings.images?.doctor && <img src={settings.images.doctor} alt="doctor" className="doc-avatar-preview" />}
                </FieldGroup>
                <FieldGroup label="Nombre del Especialista">
                  <input type="text" value={settings.brand?.doctor_name || ''} onChange={e => handleChange('brand', 'doctor_name', e.target.value)} onBlur={e => handleSave('brand', 'doctor_name', e.target.value)} style={inputStyle} />
                </FieldGroup>
                <FieldGroup label="Párrafo sobre el profesional">
                  <textarea rows={6} value={settings.professional?.bio || ''} onChange={e => handleChange('professional', 'bio', e.target.value)} onBlur={e => handleSave('professional', 'bio', e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} />
                </FieldGroup>
              </>
            )}
  
            {/* --- SERVICIOS --- */}
            {activeSection === 'services' && (
              <>
                <div className="editor-info-box">
                  <p>💡 Los servicios se editan en la sección "Servicios". Aquí solo los textos de la web.</p>
                </div>
                <FieldGroup label="Título de la Sección">
                  <input type="text" value={settings.services?.title || ''} onChange={e => handleChange('services', 'title', e.target.value)} onBlur={e => handleSave('services', 'title', e.target.value)} style={inputStyle} />
                </FieldGroup>
                <FieldGroup label="Subtítulo de Servicios">
                  <input type="text" value={settings.services?.subtitle || ''} onChange={e => handleChange('services', 'subtitle', e.target.value)} onBlur={e => handleSave('services', 'subtitle', e.target.value)} style={inputStyle} />
                </FieldGroup>
              </>
            )}
  
            {/* --- GALERÍA --- */}
            {activeSection === 'gallery' && (
              <>
                <FieldGroup label="Mostrar Galería en la Web">
                  <select 
                    value={settings.gallery?.show || 'yes'} 
                    onChange={e => { handleChange('gallery', 'show', e.target.value); handleSave('gallery', 'show', e.target.value); }}
                    style={inputStyle}
                  >
                    <option value="yes">Sí, mostrar sección</option>
                    <option value="no">No, ocultar sección</option>
                  </select>
                </FieldGroup>
  
                <div className="gallery-editor-grid">
                  <p className="grid-title">FOTOS DE LA GALERÍA (Máx. 6)</p>
                  <div className="gallery-thumbs">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                      <div key={i} className="gallery-thumb-wrap">
                        <div 
                          onClick={() => document.getElementById(`gallery-upload-${i}`)?.click()}
                          className="thumb-placeholder"
                        >
                          {settings.images?.[`gallery_${i}`] ? (
                            <img src={settings.images[`gallery_${i}`]} alt={`G${i}`} />
                          ) : (
                            <Plus size={20} />
                          )}
                        </div>
                        <input 
                          id={`gallery-upload-${i}`} type="file" hidden accept="image/*" 
                          onChange={e => e.target.files?.[0] && handleUpload('images', `gallery_${i}`, e.target.files[0])} 
                        />
                        {settings.images?.[`gallery_${i}`] && (
                           <button 
                            onClick={() => { handleChange('images', `gallery_${i}`, ''); handleSave('images', `gallery_${i}`, ''); }}
                            className="remove-thumb-btn"
                           >
                             <X size={12} />
                           </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
  
            {/* --- FAQs --- */}
            {activeSection === 'faq' && (
              <div className="faq-editor-list">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="faq-editor-item">
                    <FieldGroup label={`Pregunta ${i}`}>
                      <input type="text" value={settings.faq?.[`q${i}`] || ''} onChange={e => handleChange('faq', `q${i}`, e.target.value)} onBlur={e => handleSave('faq', `q${i}`, e.target.value)} style={inputStyle} />
                    </FieldGroup>
                    <FieldGroup label={`Respuesta ${i}`}>
                      <textarea rows={3} value={settings.faq?.[`a${i}`] || ''} onChange={e => handleChange('faq', `a${i}`, e.target.value)} onBlur={e => handleSave('faq', `a${i}`, e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} />
                    </FieldGroup>
                  </div>
                ))}
              </div>
            )}
  
            {/* --- CONTACTO --- */}
            {activeSection === 'contact' && (
              <>
                <FieldGroup label="Teléfono / WhatsApp">
                  <input type="text" value={settings.contact?.phone || ''} onChange={e => handleChange('contact', 'phone', e.target.value)} onBlur={e => handleSave('contact', 'phone', e.target.value)} style={inputStyle} />
                </FieldGroup>
                <FieldGroup label="Dirección (Aparecerá en el Mapa)">
                  <input type="text" value={settings.contact?.address || ''} onChange={e => handleChange('contact', 'address', e.target.value)} onBlur={e => handleSave('contact', 'address', e.target.value)} style={inputStyle} />
                </FieldGroup>
                <FieldGroup label="Email de Contacto">
                  <input type="email" value={settings.contact?.email || ''} onChange={e => handleChange('contact', 'email', e.target.value)} onBlur={e => handleSave('contact', 'email', e.target.value)} style={inputStyle} />
                </FieldGroup>
              </>
            )}
  
            <div className="apply-changes-footer">
              <button
                onClick={() => {
                  setSaveSuccess(true);
                  setPreviewKey(k => k + 1);
                  setTimeout(() => setSaveSuccess(false), 3000);
                }}
                className="btn-apply-success"
              >
                <CheckCircle size={18} /> Aplicar Cambios Ahora
              </button>
            </div>
          </div>
        </div>
  
        {/* === SECCIÓN 3: PREVIEW === */}
        <div className="editor-preview-panel">
          <div className="preview-toolbar">
            <div className="window-dots">
              <div className="dot red" />
              <div className="dot yellow" />
              <div className="dot green" />
              <span className="preview-url">crm-dent.inedito.digital/</span>
            </div>
            <div className="mode-selectors">
              {(['desktop', 'mobile'] as const).map(m => (
                <button key={m} onClick={() => setPreviewMode(m)} className={`mode-btn ${previewMode === m ? 'active' : ''}`}>
                  {m === 'desktop' ? <Monitor size={14} /> : <Smartphone size={14} />}
                  <span>{m === 'desktop' ? 'Desktop' : 'Mobile'}</span>
                </button>
              ))}
            </div>
          </div>
  
          <div className="preview-frame-container">
            <div className={`preview-wrapper ${previewMode}`}>
              <iframe key={previewKey} src="/" title="Preview" />
            </div>
          </div>
        </div>
      </div>
  
      <style>{`
        .webeditor-container { height: calc(100vh - 120px); border: 1px solid var(--glass-border); border-radius: 20px; overflow: hidden; }
        .webeditor-layout { display: flex; height: 100%; background: var(--bg-surface); }
        
        .editor-tabs-sidebar { width: 64px; border-right: 1px solid var(--glass-border); display: flex; flex-direction: column; align-items: center; padding-top: 1rem; gap: 0.25rem; flex-shrink: 0; }
        .sidebar-tab { width: 44px; height: 44px; border-radius: 12px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; background: transparent; color: var(--text-muted); transition: 0.2s; }
        .sidebar-tab.active { background: var(--primary); color: white; }
        
        .editor-controls-panel { width: 340px; border-right: 1px solid var(--glass-border); display: flex; flex-direction: column; flex-shrink: 0; background: var(--bg-surface); }
        .controls-header { padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--glass-border); display: flex; align-items: center; justify-content: space-between; }
        .controls-title { font-weight: 800; font-size: 1rem; }
        .controls-sub { font-size: 0.75rem; color: var(--text-muted); margin-top: 2px; }
        .save-status { display: flex; align-items: center; gap: 0.3rem; color: #34c759; font-size: 0.8rem; font-weight: 700; }
        
        .controls-scroll-area { flex: 1; overflow-y: auto; padding: 1.5rem; }
        .ia-generator-widget { margin-bottom: 1.5rem; padding: 1rem; background: var(--primary-light); borderRadius: 16px; border: 1px solid var(--primary); display: flex; flex-direction: column; gap: 0.75rem; }
        .ia-widget-header { display: flex; align-items: center; gap: 0.5rem; color: var(--primary); font-weight: 700; font-size: 0.85rem; }
        .ia-widget-desc { font-size: 0.75rem; color: var(--text-secondary); margin: 0; }
        .btn-ia-generate { width: 100%; padding: 0.6rem; border-radius: 10px; border: none; background: var(--primary); color: white; font-weight: 700; font-size: 0.8rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem; }
        .ia-preview-box { background: white; padding: 0.75rem; border-radius: 12px; font-size: 0.7rem; position: relative; border: 1px solid var(--glass-border); }
        .ia-preview-box pre { margin: 0; white-space: pre-wrap; color: var(--text-primary); }
        .close-ia-preview { position: absolute; top: 8px; right: 8px; background: none; border: none; cursor: pointer; color: var(--text-muted); }
        
        .preview-thumb { height: 36px; margin-top: 8px; border-radius: 6px; padding: 4px; }
        .preview-thumb.light { background: #eee; }
        .preview-thumb.dark { background: #333; }
        .field-hint { font-size: 0.65rem; color: var(--text-muted); marginTop: 4px; }
        .grid-2-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .color-picker-input { width: 100%; height: 44px; padding: 4px; cursor: pointer; background: var(--bg-app); border: none; border-radius: 12px; }
        .hero-preview-img { width: 100%; height: 80px; object-fit: cover; margin-top: 8px; border-radius: 10px; }
        .doc-avatar-preview { width: 64px; height: 64px; border-radius: 50%; object-fit: cover; margin-top: 8px; }
        .editor-info-box { background: var(--primary-light); padding: 0.75rem; border-radius: 10px; margin-bottom: 1.5rem; border: 1px solid var(--primary); font-size: 0.75rem; color: var(--primary); font-weight: 700; }
        
        .gallery-thumbs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; margin-top: 0.5rem; }
        .gallery-thumb-wrap { position: relative; aspect-ratio: 1; }
        .thumb-placeholder { width: 100%; height: 100%; border-radius: 10px; border: 2px dashed var(--glass-border); background: var(--bg-app); display: flex; align-items: center; justify-content: center; cursor: pointer; overflow: hidden; color: var(--text-muted); }
        .thumb-placeholder img { width: 100%; height: 100%; object-fit: cover; }
        .remove-thumb-btn { position: absolute; top: -4px; right: -4px; background: #ff3b30; color: white; border: none; border-radius: 50%; width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; cursor: pointer; }
        .grid-title { font-size: 0.7rem; font-weight: 700; color: var(--text-muted); margin-bottom: 0.5rem; }
        
        .btn-apply-success { width: 100%; padding: 0.85rem; border-radius: 12px; border: none; background: var(--success); color: white; font-weight: 700; font-size: 0.9rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem; box-shadow: 0 8px 20px rgba(48,209,88,0.2); }
        
        .editor-preview-panel { flex: 1; background: #1a1a2e; display: flex; flex-direction: column; overflow: hidden; }
        .preview-toolbar { padding: 0.75rem 1.5rem; display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.04); border-bottom: 1px solid rgba(255,255,255,0.06); }
        .window-dots { display: flex; align-items: center; gap: 6px; }
        .dot { width: 10px; height: 10px; border-radius: 50%; }
        .dot.red { background: #ff5f57; }
        .dot.yellow { background: #febc2e; }
        .dot.green { background: #28c840; }
        .preview-url { margin-left: 1rem; color: rgba(255,255,255,0.3); font-family: monospace; font-size: 0.75rem; }
        
        .mode-selectors { display: flex; gap: 0.5rem; }
        .mode-btn { display: flex; align-items: center; gap: 0.4rem; padding: 0.4rem 0.8rem; border-radius: 8px; border: none; background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.4); font-size: 0.75rem; font-weight: 700; cursor: pointer; }
        .mode-btn.active { background: var(--primary); color: white; }
        
        .preview-frame-container { flex: 1; display: flex; align-items: center; justify-content: center; padding: 2rem; overflow: hidden; }
        .preview-wrapper { background: white; transition: 0.4s cubic-bezier(0.4, 0, 0.2, 1); overflow: hidden; position: relative; }
        .preview-wrapper.desktop { width: 100%; height: 100%; border-radius: 12px; box-shadow: 0 20px 60px rgba(0,0,0,0.5); }
        .preview-wrapper.mobile { width: 375px; height: 667px; border-radius: 40px; border: 12px solid #222; box-shadow: 0 30px 80px rgba(0,0,0,0.8); }
        .preview-wrapper iframe { width: 100%; height: 100%; border: none; }
        
        @media (max-width: 1024px) {
          .webeditor-container { height: auto; border: none; }
          .webeditor-layout { flex-direction: column; }
          .editor-tabs-sidebar { width: 100%; height: auto; flex-direction: row; padding: 0.5rem; overflow-x: auto; border-right: none; border-bottom: 1px solid var(--glass-border); }
          .editor-controls-panel { width: 100%; border-right: none; border-bottom: 1px solid var(--glass-border); max-height: 500px; }
          .editor-preview-panel { height: 600px; }
        }
      `}</style>
    </div>
  );
};

export default WebEditor;

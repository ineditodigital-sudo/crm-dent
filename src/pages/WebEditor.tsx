import { useState, useEffect, useRef } from 'react';
import { Type, LayoutTemplate, Activity, CheckCircle, Globe, Smartphone, Monitor, Bot, Palette, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const SECTIONS = [
  { id: 'brand',      label: 'Marca',        icon: <Palette size={16} /> },
  { id: 'hero',       label: 'Hero',          icon: <LayoutTemplate size={16} /> },
  { id: 'specialist', label: 'Especialista',  icon: <User size={16} /> },
  { id: 'services',   label: 'Servicios',     icon: <Type size={16} /> },
  { id: 'contact',    label: 'Contacto',      icon: <Globe size={16} /> },
  { id: 'ai',         label: 'IA / Bot',      icon: <Bot size={16} /> },
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

  if (loading) return <div style={{ padding: '3rem', display: 'flex', justifyContent: 'center' }}><Activity className="animate-spin" size={40} color="var(--primary)" /></div>;

  return (
    <div style={{ display: 'flex', gap: 0, height: 'calc(100vh - 120px)', overflow: 'hidden', borderRadius: 20, border: '1px solid var(--glass-border)' }}>

      {/* === COLUMNA 1: TABS === */}
      <div style={{ width: 64, background: 'var(--bg-surface)', borderRight: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '1rem', gap: '0.25rem', flexShrink: 0 }}>
        {SECTIONS.map(s => (
          <button key={s.id} title={s.label} onClick={() => setActiveSection(s.id)} style={{
            width: 44, height: 44, borderRadius: 12, border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: activeSection === s.id ? 'var(--primary)' : 'transparent',
            color: activeSection === s.id ? 'white' : 'var(--text-muted)',
            transition: 'all 0.2s',
          }}>
            {s.icon}
          </button>
        ))}
      </div>

      {/* === COLUMNA 2: CONTROLES === */}
      <div style={{ width: 320, background: 'var(--bg-surface)', borderRight: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontWeight: 800, fontSize: '1rem' }}>{SECTIONS.find(s => s.id === activeSection)?.label}</h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>Edita y guarda al salir</p>
          </div>
          {saveSuccess && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#34c759', fontSize: '0.8rem', fontWeight: 700 }}>
              <CheckCircle size={14} /> Guardado
            </span>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>

          {/* --- MARCA --- */}
          {activeSection === 'brand' && (
            <>
              <FieldGroup label="Logo del Negocio">
                <input type="file" accept="image/*" onChange={e => e.target.files?.[0] && handleUpload('brand', 'logo', e.target.files[0])} style={{ ...inputStyle, padding: '0.6rem' }} />
                {settings.brand?.logo && <img src={settings.brand.logo} alt="logo" style={{ height: 36, marginTop: 8, borderRadius: 6 }} />}
              </FieldGroup>
              <FieldGroup label="Nombre del Negocio">
                <input type="text" value={settings.brand?.name || ''} onChange={e => handleChange('brand', 'name', e.target.value)} onBlur={e => handleSave('brand', 'name', e.target.value)} style={inputStyle} onFocus={e => (e.target.style.borderColor = 'var(--primary)')} />
              </FieldGroup>
              <FieldGroup label="Giro / Especialidad">
                <input type="text" value={settings.brand?.niche || ''} onChange={e => handleChange('brand', 'niche', e.target.value)} onBlur={e => handleSave('brand', 'niche', e.target.value)} style={inputStyle} onFocus={e => (e.target.style.borderColor = 'var(--primary)')} />
              </FieldGroup>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <FieldGroup label="Color Principal">
                  <input type="color" value={settings.theme?.primary || '#007aff'} onChange={e => handleChange('theme', 'primary', e.target.value)} onBlur={e => handleSave('theme', 'primary', e.target.value)} style={{ ...inputStyle, padding: 4, height: 44, cursor: 'pointer' }} />
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
                {settings.images?.hero && <img src={settings.images.hero} alt="hero" style={{ width: '100%', height: 80, objectFit: 'cover', marginTop: 8, borderRadius: 10 }} />}
              </FieldGroup>
              <FieldGroup label="Título Principal">
                <input type="text" value={settings.hero?.title || ''} onChange={e => handleChange('hero', 'title', e.target.value)} onBlur={e => handleSave('hero', 'title', e.target.value)} style={inputStyle} onFocus={e => (e.target.style.borderColor = 'var(--primary)')} />
              </FieldGroup>
              <FieldGroup label="Subtítulo">
                <textarea rows={4} value={settings.hero?.subtitle || ''} onChange={e => handleChange('hero', 'subtitle', e.target.value)} onBlur={e => handleSave('hero', 'subtitle', e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} onFocus={e => (e.target.style.borderColor = 'var(--primary)')} />
              </FieldGroup>
            </>
          )}

          {/* --- ESPECIALISTA --- */}
          {activeSection === 'specialist' && (
            <>
              <FieldGroup label="Foto del Especialista">
                <input type="file" accept="image/*" onChange={e => e.target.files?.[0] && handleUpload('images', 'doctor', e.target.files[0])} style={{ ...inputStyle, padding: '0.6rem' }} />
                {settings.images?.doctor && <img src={settings.images.doctor} alt="doctor" style={{ width: 72, height: 72, objectFit: 'cover', marginTop: 8, borderRadius: '50%' }} />}
              </FieldGroup>
              <FieldGroup label="Nombre del Especialista">
                <input type="text" value={settings.brand?.doctor_name || ''} onChange={e => handleChange('brand', 'doctor_name', e.target.value)} onBlur={e => handleSave('brand', 'doctor_name', e.target.value)} style={inputStyle} onFocus={e => (e.target.style.borderColor = 'var(--primary)')} />
              </FieldGroup>
              <FieldGroup label="Especialidad / Cédula">
                <input type="text" value={settings.brand?.doctor_title || ''} onChange={e => handleChange('brand', 'doctor_title', e.target.value)} onBlur={e => handleSave('brand', 'doctor_title', e.target.value)} style={inputStyle} onFocus={e => (e.target.style.borderColor = 'var(--primary)')} />
              </FieldGroup>
            </>
          )}

          {/* --- SERVICIOS --- */}
          {activeSection === 'services' && (
            <>
              <FieldGroup label="Título de la Sección">
                <input type="text" value={settings.services?.title || ''} onChange={e => handleChange('services', 'title', e.target.value)} onBlur={e => handleSave('services', 'title', e.target.value)} style={inputStyle} onFocus={e => (e.target.style.borderColor = 'var(--primary)')} />
              </FieldGroup>
              <FieldGroup label="Subtítulo de Servicios">
                <input type="text" value={settings.services?.subtitle || ''} onChange={e => handleChange('services', 'subtitle', e.target.value)} onBlur={e => handleSave('services', 'subtitle', e.target.value)} style={inputStyle} onFocus={e => (e.target.style.borderColor = 'var(--primary)')} />
              </FieldGroup>
            </>
          )}

          {/* --- CONTACTO --- */}
          {activeSection === 'contact' && (
            <>
              <FieldGroup label="Teléfono / WhatsApp">
                <input type="text" value={settings.contact?.phone || ''} onChange={e => handleChange('contact', 'phone', e.target.value)} onBlur={e => handleSave('contact', 'phone', e.target.value)} style={inputStyle} onFocus={e => (e.target.style.borderColor = 'var(--primary)')} />
              </FieldGroup>
              <FieldGroup label="Dirección">
                <input type="text" value={settings.contact?.address || ''} onChange={e => handleChange('contact', 'address', e.target.value)} onBlur={e => handleSave('contact', 'address', e.target.value)} style={inputStyle} onFocus={e => (e.target.style.borderColor = 'var(--primary)')} />
              </FieldGroup>
              <FieldGroup label="Email de Contacto">
                <input type="email" value={settings.contact?.email || ''} onChange={e => handleChange('contact', 'email', e.target.value)} onBlur={e => handleSave('contact', 'email', e.target.value)} style={inputStyle} onFocus={e => (e.target.style.borderColor = 'var(--primary)')} />
              </FieldGroup>
            </>
          )}

          {/* --- IA --- */}
          {activeSection === 'ai' && (
            <>
              <FieldGroup label="Personalidad del Bot">
                <textarea rows={4} value={settings.ai_context?.personality || ''} onChange={e => handleChange('ai_context', 'personality', e.target.value)} onBlur={e => handleSave('ai_context', 'personality', e.target.value)} placeholder="Ej: Eres una asistente amigable y empática..." style={{ ...inputStyle, resize: 'vertical' }} onFocus={e => (e.target.style.borderColor = 'var(--primary)')} />
              </FieldGroup>
              <FieldGroup label="Servicios que ofrece">
                <textarea rows={3} value={settings.ai_context?.services || ''} onChange={e => handleChange('ai_context', 'services', e.target.value)} onBlur={e => handleSave('ai_context', 'services', e.target.value)} placeholder="Blanqueamiento, Limpieza, Ortodoncia..." style={{ ...inputStyle, resize: 'vertical' }} onFocus={e => (e.target.style.borderColor = 'var(--primary)')} />
              </FieldGroup>
              <FieldGroup label="Precios Aproximados">
                <textarea rows={3} value={settings.ai_context?.prices || ''} onChange={e => handleChange('ai_context', 'prices', e.target.value)} onBlur={e => handleSave('ai_context', 'prices', e.target.value)} placeholder="Limpieza $500, Blanqueamiento $1500..." style={{ ...inputStyle, resize: 'vertical' }} onFocus={e => (e.target.style.borderColor = 'var(--primary)')} />
              </FieldGroup>
              <FieldGroup label="Horarios de Atención">
                <input type="text" value={settings.ai_context?.hours || ''} onChange={e => handleChange('ai_context', 'hours', e.target.value)} onBlur={e => handleSave('ai_context', 'hours', e.target.value)} placeholder="Lunes a Viernes 9 AM - 7 PM" style={inputStyle} onFocus={e => (e.target.style.borderColor = 'var(--primary)')} />
              </FieldGroup>
            </>
          )}
        </div>
      </div>

      {/* === COLUMNA 3: PREVIEW === */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#1a1a2e', overflow: 'hidden' }}>
        {/* Preview toolbar */}
        <div style={{
          padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#febc2e' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#28c840' }} />
            <span style={{ marginLeft: '0.75rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>
              crm-dent.inedito.digital/landing
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {(['desktop', 'mobile'] as const).map(m => (
              <button key={m} onClick={() => setPreviewMode(m)} style={{
                padding: '0.4rem 0.75rem', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: previewMode === m ? 'var(--primary)' : 'rgba(255,255,255,0.06)',
                color: previewMode === m ? 'white' : 'rgba(255,255,255,0.4)',
                display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600,
                transition: 'all 0.2s'
              }}>
                {m === 'desktop' ? <Monitor size={14} /> : <Smartphone size={14} />}
                {m === 'desktop' ? 'Desktop' : 'Mobile'}
              </button>
            ))}
          </div>
        </div>

        {/* Preview frame */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', overflow: 'hidden' }}>
          <div style={{
            width: previewMode === 'mobile' ? 375 : '100%',
            height: '100%',
            maxWidth: '100%',
            background: 'white',
            borderRadius: previewMode === 'mobile' ? 36 : 12,
            overflow: 'hidden',
            boxShadow: previewMode === 'mobile'
              ? '0 0 0 8px #222, 0 30px 80px rgba(0,0,0,0.8)'
              : '0 20px 60px rgba(0,0,0,0.5)',
            transition: 'all 0.4s cubic-bezier(0.34,1.56,0.64,1)',
            position: 'relative',
          }}>
            <iframe
              key={previewKey}
              src="/landing"
              style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
              title="Preview de Landing Page"
            />
          </div>
        </div>
      </div>

      <style>{`
        textarea, input, select { font-family: inherit; }
        textarea:focus, input:focus, select:focus { outline: none; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: var(--glass-border); border-radius: 99px; }
      `}</style>
    </div>
  );
};

export default WebEditor;

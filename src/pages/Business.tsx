import { useState, useEffect, useRef } from 'react';
import { Building2, Upload, RefreshCw, Check, Palette, Type, Globe, ImageIcon, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { useBrand } from '../context/BrandContext';

const tok = () => localStorage.getItem('crm_token') || '';

const PRESET_COLORS = [
  { label: 'Azul Clínico', value: '#007aff' },
  { label: 'Esmeralda', value: '#30d158' },
  { label: 'Coral', value: '#ff6b6b' },
  { label: 'Índigo', value: '#5856d6' },
  { label: 'Ámbar', value: '#ff9f0a' },
  { label: 'Rosa', value: '#ff2d55' },
  { label: 'Teal', value: '#5ac8fa' },
  { label: 'Púrpura', value: '#bf5af2' },
];

const FONT_OPTIONS = [
  'Inter', 'Roboto', 'Outfit', 'Poppins', 'DM Sans',
  'Nunito', 'Raleway', 'Lato', 'Montserrat', 'Open Sans',
];

const GIRO_OPTIONS = [
  'Clínica Dental', 'Consultorio Médico', 'Clínica de Estética', 'Spa & Wellness',
  'Consultorio Psicológico', 'Clínica Veterinaria', 'Nutrición y Bienestar',
  'Centro de Fisioterapia', 'Clínica Oftalmológica', 'Otro',
];

type BrandState = {
  clinic_name: string;
  tagline: string;
  giro: string;
  primary_color: string;
  font_family: string;
  logo_url: string;
  logo_dark_url: string;
  favicon_url: string;
  business_hours: string; // JSON string
};

const defaultBrand: BrandState = {
  clinic_name: '',
  tagline: '',
  giro: 'Clínica Dental',
  primary_color: '#007aff',
  font_family: 'Inter',
  logo_url: '',
  logo_dark_url: '',
  favicon_url: '',
  business_hours: JSON.stringify({
    monday:    { active: true,  open: '09:00', close: '18:00' },
    tuesday:   { active: true,  open: '09:00', close: '18:00' },
    wednesday: { active: true,  open: '09:00', close: '18:00' },
    thursday:  { active: true,  open: '09:00', close: '18:00' },
    friday:    { active: true,  open: '09:00', close: '18:00' },
    saturday:  { active: false, open: '10:00', close: '14:00' },
    sunday:    { active: false, open: '10:00', close: '14:00' },
  }),
};

const ImageUploader = ({ label, currentUrl, onUploaded, hint }: {
  label: string; currentUrl: string; onUploaded: (url: string) => void; hint?: string;
}) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentUrl);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setPreview(currentUrl); }, [currentUrl]);

  const handleFile = async (file: File) => {
    if (!file) return;
    const maxMB = 5;
    if (file.size > maxMB * 1024 * 1024) {
      alert(`El archivo es muy grande. Máximo ${maxMB}MB.`);
      return;
    }
    setUploading(true);
    const fd = new FormData();
    fd.append('image', file);
    try {
      const r = await fetch('/api/brand/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tok()}` },
        body: fd,
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Error subiendo imagen');
      setPreview(data.url);
      onUploaded(data.url);
    } catch (err: any) {
      alert(err.message);
    }
    setUploading(false);
  };

  return (
    <div className="img-uploader">
      <span className="uploader-label">{label}</span>
      {hint && <span className="uploader-hint">{hint}</span>}
      <div
        className="upload-zone"
        onClick={() => inputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
      >
        {preview ? (
          <div className="preview-wrap">
            <img src={preview} alt={label} className="img-preview" />
            <button className="remove-img" onClick={e => { e.stopPropagation(); setPreview(''); onUploaded(''); }}>
              <X size={14} />
            </button>
          </div>
        ) : (
          <div className="upload-placeholder">
            {uploading ? <RefreshCw size={24} className="spinning" /> : <ImageIcon size={24} />}
            <span>{uploading ? 'Subiendo...' : 'Click o arrastra una imagen'}</span>
            <span className="upload-formats">JPG, PNG, WEBP · Máx. 5MB</span>
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
    </div>
  );
};

const BusinessPage = () => {
  const { brand: globalBrand, setBrand: setGlobalBrand } = useBrand();
  const [brand, setBrandLocal] = useState<BrandState>({ ...defaultBrand, ...globalBrand });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const loading = false;

  // Sync local state when globalBrand changes (e.g. on first load)
  useEffect(() => {
    setBrandLocal(b => ({ ...b, ...globalBrand }));
  }, [globalBrand]);

  const save = async () => {
    setSaving(true);
    try {
      const r = await fetch('/api/brand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` },
        body: JSON.stringify(brand),
      });
      if (!r.ok) throw new Error('Error guardando');
      // Apply globally to the whole CRM
      setGlobalBrand(brand);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      alert(err.message);
    }
    setSaving(false);
  };

  const set = (key: keyof BrandState, value: string) => {
    const next = { ...brand, [key]: value };
    setBrandLocal(next);
    // Apply color/font in real time across the whole CRM
    setGlobalBrand({ [key]: value });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '1rem', color: 'var(--text-muted)' }}>
        <RefreshCw size={24} className="spinning" /> Cargando configuración de marca...
      </div>
    );
  }

  return (
    <div className="business-page animate-ios">
      <div className="biz-header">
        <div>
          <h1 className="page-title">Negocio</h1>
          <p className="page-sub">Personaliza la identidad visual y la información de tu clínica</p>
        </div>
        <button className="save-all-btn" onClick={save} disabled={saving}>
          {saving ? <RefreshCw size={16} className="spinning" /> : saved ? <Check size={16} /> : null}
          {saving ? 'Guardando...' : saved ? '¡Guardado!' : 'Guardar cambios'}
        </button>
      </div>

      <div className="biz-grid">

        {/* === INFORMACIÓN DEL NEGOCIO === */}
        <motion.div className="biz-section glass-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <div className="section-title">
            <Globe size={20} />
            <h2>Información del Negocio</h2>
          </div>
          <div className="biz-form">
            <label>
              Nombre de la Clínica / Negocio
              <input value={brand.clinic_name} onChange={e => set('clinic_name', e.target.value)} placeholder="Ej: Dra. Stephanie Ortega" />
            </label>
            <label>
              Eslogan o Subtítulo
              <input value={brand.tagline} onChange={e => set('tagline', e.target.value)} placeholder="Ej: Tu sonrisa, nuestra pasión" />
            </label>
            <label>
              Giro del Negocio
              <select value={brand.giro} onChange={e => set('giro', e.target.value)}>
                {GIRO_OPTIONS.map(g => <option key={g}>{g}</option>)}
              </select>
            </label>
          </div>
        </motion.div>

        {/* === LOGOS === */}
        <motion.div className="biz-section glass-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="section-title">
            <ImageIcon size={20} />
            <h2>Logos e Íconos</h2>
          </div>
          <div className="logo-grid">
            <ImageUploader
              label="Logo Principal"
              hint="Para fondo oscuro / sidebar del CRM"
              currentUrl={brand.logo_url}
              onUploaded={url => set('logo_url', url)}
            />
            <ImageUploader
              label="Logo Alternativo"
              hint="Para fondo claro / landing page"
              currentUrl={brand.logo_dark_url}
              onUploaded={url => set('logo_dark_url', url)}
            />
            <ImageUploader
              label="Favicon"
              hint="Ícono del navegador. Se aplica automáticamente."
              currentUrl={brand.favicon_url}
              onUploaded={url => set('favicon_url', url)}
            />
          </div>
        </motion.div>

        {/* === COLOR PRIMARIO === */}
        <motion.div className="biz-section glass-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div className="section-title">
            <Palette size={20} />
            <h2>Color de Marca</h2>
          </div>
          <p className="section-desc">El color primario se aplica en botones, acentos y el CRM en tiempo real.</p>

          <div className="color-presets">
            {PRESET_COLORS.map(c => (
              <button
                key={c.value}
                className={`color-swatch ${brand.primary_color === c.value ? 'selected' : ''}`}
                style={{ background: c.value }}
                title={c.label}
                onClick={() => set('primary_color', c.value)}
              >
                {brand.primary_color === c.value && <Check size={14} color="white" />}
              </button>
            ))}
          </div>

          <div className="custom-color-row">
            <label className="ios-label">Color personalizado</label>
            <div className="color-input-wrap">
              <input
                type="color"
                value={brand.primary_color}
                onChange={e => set('primary_color', e.target.value)}
                className="color-picker"
              />
              <input
                type="text"
                value={brand.primary_color}
                onChange={e => /^#[0-9A-Fa-f]{0,6}$/.test(e.target.value) && set('primary_color', e.target.value)}
                className="color-hex-input"
                placeholder="#007aff"
                maxLength={7}
              />
            </div>
            <div className="color-preview-bar" style={{ background: brand.primary_color }}>
              <span>Vista previa del color</span>
            </div>
          </div>
        </motion.div>

        {/* === HORARIOS === */}
        <motion.div className="biz-section glass-card" style={{ gridColumn: '1 / -1' }} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.17 }}>
          <div className="section-title">
            <span style={{ fontSize: '1.2rem' }}>🕐</span>
            <h2>Horarios de Atención</h2>
          </div>
          <p className="section-desc">La IA consultará estos horarios para indicar disponibilidad a los pacientes.</p>
          <div className="hours-grid">
            {(() => {
              const DAY_LABELS: Record<string, string> = {
                monday: 'Lunes', tuesday: 'Martes', wednesday: 'Miércoles',
                thursday: 'Jueves', friday: 'Viernes', saturday: 'Sábado', sunday: 'Domingo'
              };
              let hours: any = {};
              try { hours = JSON.parse(brand.business_hours || '{}'); } catch {}
              return Object.entries(DAY_LABELS).map(([key, label]) => {
                const day = hours[key] || { active: false, open: '09:00', close: '18:00' };
                const update = (patch: any) => {
                  hours[key] = { ...day, ...patch };
                  set('business_hours', JSON.stringify(hours));
                };
                return (
                  <div key={key} className={`hours-row ${day.active ? 'active' : 'inactive'}`}>
                    <label className="hours-toggle">
                      <input type="checkbox" checked={!!day.active} onChange={e => update({ active: e.target.checked })} />
                      <span className="toggle-track"><span className="toggle-thumb" /></span>
                      <span className="hours-day">{label}</span>
                    </label>
                    {day.active ? (
                      <div className="hours-times">
                        <input type="time" value={day.open} onChange={e => update({ open: e.target.value })} />
                        <span>—</span>
                        <input type="time" value={day.close} onChange={e => update({ close: e.target.value })} />
                      </div>
                    ) : (
                      <span className="hours-closed">Cerrado</span>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        </motion.div>

        {/* === TIPOGRAFÍA === */}
        <motion.div className="biz-section glass-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="section-title">
            <Type size={20} />
            <h2>Tipografía</h2>
          </div>
          <p className="section-desc">Fuente principal del CRM y la landing page.</p>
          <div className="font-grid">
            {FONT_OPTIONS.map(f => (
              <button
                key={f}
                className={`font-pill ${brand.font_family === f ? 'selected' : ''}`}
                style={{ fontFamily: f }}
                onClick={() => set('font_family', f)}
              >
                {f}
              </button>
            ))}
          </div>
          {brand.font_family && (
            <div className="font-preview" style={{ fontFamily: brand.font_family }}>
              Clínica Dental — <em>"{brand.tagline || 'Tu sonrisa, nuestra pasión'}"</em>
            </div>
          )}
        </motion.div>

        {/* === PREVIEW IDENTIDAD === */}
        <motion.div className="biz-section glass-card identity-preview" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <div className="section-title">
            <Building2 size={20} />
            <h2>Vista Previa de Identidad</h2>
          </div>
          <div className="preview-card" style={{ fontFamily: brand.font_family, '--brand': brand.primary_color } as any}>
            <div className="pc-header" style={{ background: brand.primary_color }}>
              {brand.logo_url ? (
                <img src={brand.logo_url} alt="Logo" className="pc-logo" />
              ) : (
                <div className="pc-logo-placeholder">{(brand.clinic_name || 'CRM')[0]?.toUpperCase()}</div>
              )}
              <div>
                <strong>{brand.clinic_name || 'Nombre de tu clínica'}</strong>
                <p>{brand.giro}</p>
              </div>
            </div>
            <div className="pc-body">
              <p className="pc-tagline">{brand.tagline || 'Tu eslogan aparecerá aquí'}</p>
              <button className="pc-btn" style={{ background: brand.primary_color }}>Agendar Cita</button>
            </div>
          </div>
        </motion.div>

      </div>

      <div className="biz-footer-actions">
        <button className="save-all-btn large" onClick={save} disabled={saving}>
          <Upload size={18} />
          {saving ? 'Guardando...' : saved ? '¡Cambios guardados exitosamente!' : 'Guardar todos los cambios'}
        </button>
      </div>

      <style>{`
        .business-page { display: flex; flex-direction: column; gap: 2rem; }
        .biz-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; }
        .page-title { font-size: 2rem; font-weight: 800; }
        .page-sub { color: var(--text-muted); font-size: .9rem; margin-top: .25rem; }
        .save-all-btn { background: var(--primary); color: white; padding: .75rem 1.5rem; border-radius: var(--radius-full); font-weight: 700; display: flex; align-items: center; gap: .5rem; font-size: .9rem; box-shadow: 0 4px 16px var(--primary-light); transition: var(--transition); }
        .save-all-btn:disabled { opacity: .7; }
        .save-all-btn.large { padding: 1rem 2.5rem; font-size: 1rem; }
        .biz-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
        .biz-section { padding: 1.75rem; border-radius: 20px; display: flex; flex-direction: column; gap: 1.25rem; }
        .section-title { display: flex; align-items: center; gap: .75rem; }
        .section-title h2 { font-size: 1.05rem; font-weight: 700; }
        .section-desc { font-size: .85rem; color: var(--text-muted); margin-top: -.5rem; }
        .biz-form { display: flex; flex-direction: column; gap: .9rem; }
        .biz-form label { display: flex; flex-direction: column; gap: .3rem; font-size: .8rem; font-weight: 600; color: var(--text-secondary); }
        .biz-form input, .biz-form select { padding: .75rem 1rem; border-radius: 12px; border: 1px solid var(--glass-border); background: var(--bg-surface); font-size: .9rem; color: var(--text-primary); }

        /* Logo uploaders */
        .logo-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; }
        .img-uploader { display: flex; flex-direction: column; gap: .4rem; }
        .uploader-label { font-size: .8rem; font-weight: 700; color: var(--text-secondary); }
        .uploader-hint { font-size: .7rem; color: var(--text-muted); margin-top: -.25rem; }
        .upload-zone { border: 2px dashed var(--glass-border); border-radius: 14px; padding: 1rem; cursor: pointer; transition: var(--transition); min-height: 100px; display: flex; align-items: center; justify-content: center; position: relative; background: var(--bg-surface); }
        .upload-zone:hover { border-color: var(--primary); background: color-mix(in srgb, var(--primary) 5%, transparent); }
        .upload-placeholder { display: flex; flex-direction: column; align-items: center; gap: .4rem; color: var(--text-muted); text-align: center; }
        .upload-placeholder span { font-size: .78rem; }
        .upload-formats { font-size: .65rem !important; opacity: .6; }
        .preview-wrap { position: relative; width: 100%; display: flex; align-items: center; justify-content: center; }
        .img-preview { max-height: 80px; max-width: 100%; object-fit: contain; border-radius: 8px; }
        .remove-img { position: absolute; top: -8px; right: -8px; width: 22px; height: 22px; background: #ff3b30; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: none; cursor: pointer; }
        .info-note { font-size: .75rem; color: var(--text-muted); background: var(--glass); padding: .75rem; border-radius: 10px; display: flex; flex-direction: column; gap: .25rem; }
        .info-note code { font-family: monospace; font-size: .7rem; word-break: break-all; color: var(--primary); }

        /* Colors */
        .color-presets { display: flex; gap: .75rem; flex-wrap: wrap; }
        .color-swatch { width: 36px; height: 36px; border-radius: 50%; border: 3px solid transparent; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: var(--transition); }
        .color-swatch.selected { border-color: white; box-shadow: 0 0 0 3px var(--primary); }
        .custom-color-row { display: flex; flex-direction: column; gap: .5rem; }
        .color-input-wrap { display: flex; align-items: center; gap: .75rem; }
        .color-picker { width: 48px; height: 44px; border-radius: 10px; border: 1px solid var(--glass-border); padding: 2px; cursor: pointer; background: var(--bg-surface); }
        .color-hex-input { flex: 1; padding: .65rem 1rem; border-radius: 12px; border: 1px solid var(--glass-border); background: var(--bg-surface); font-size: .9rem; font-family: monospace; color: var(--text-primary); }
        .color-preview-bar { height: 44px; border-radius: 12px; display: flex; align-items: center; padding: 0 1rem; }
        .color-preview-bar span { color: white; font-weight: 700; font-size: .85rem; text-shadow: 0 1px 3px rgba(0,0,0,.3); }

        /* Fonts */
        .font-grid { display: flex; flex-wrap: wrap; gap: .5rem; }
        .font-pill { padding: .5rem 1rem; border-radius: 20px; font-size: .85rem; font-weight: 600; background: var(--bg-surface); border: 1px solid var(--glass-border); color: var(--text-secondary); cursor: pointer; transition: var(--transition); }
        .font-pill.selected { background: var(--primary); color: white; border-color: var(--primary); }
        .font-pill:hover:not(.selected) { border-color: var(--primary); color: var(--primary); }
        .font-preview { padding: 1rem 1.25rem; background: var(--bg-surface); border-radius: 12px; font-size: 1rem; color: var(--text-primary); border: 1px solid var(--glass-border); }

        /* Identity preview */
        .identity-preview { grid-column: 1 / -1; }
        .preview-card { border-radius: 16px; overflow: hidden; border: 1px solid var(--glass-border); max-width: 400px; }
        .pc-header { display: flex; align-items: center; gap: 1rem; padding: 1.25rem 1.5rem; }
        .pc-header strong { color: white; font-size: 1rem; font-weight: 700; }
        .pc-header p { color: rgba(255,255,255,.7); font-size: .78rem; margin-top: 2px; }
        .pc-logo { height: 44px; width: auto; object-fit: contain; }
        .pc-logo-placeholder { width: 44px; height: 44px; background: rgba(255,255,255,.25); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 1.2rem; flex-shrink: 0; }
        .pc-body { padding: 1.5rem; background: var(--bg-surface); display: flex; flex-direction: column; gap: 1rem; align-items: flex-start; }
        .pc-tagline { font-size: .9rem; color: var(--text-muted); font-style: italic; }
        .pc-btn { padding: .6rem 1.25rem; border-radius: 20px; color: white; font-weight: 700; font-size: .85rem; }

        .biz-footer-actions { display: flex; justify-content: center; padding: 1rem 0 2rem; }

        /* Business Hours */
        .hours-grid { display: flex; flex-direction: column; gap: 0.6rem; }
        .hours-row { display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1rem; border-radius: 12px; background: var(--bg-surface); border: 1px solid var(--glass-border); gap: 1rem; }
        .hours-row.inactive { opacity: 0.6; }
        .hours-toggle { display: flex; align-items: center; gap: 0.75rem; cursor: pointer; user-select: none; }
        .hours-toggle input[type=checkbox] { display: none; }
        .toggle-track { width: 40px; height: 22px; background: var(--glass-border); border-radius: 11px; position: relative; transition: background 0.2s; flex-shrink: 0; }
        .hours-toggle input:checked + .toggle-track { background: var(--primary); }
        .toggle-thumb { position: absolute; top: 3px; left: 3px; width: 16px; height: 16px; background: white; border-radius: 50%; transition: transform 0.2s; }
        .hours-toggle input:checked + .toggle-track .toggle-thumb { transform: translateX(18px); }
        .hours-day { font-weight: 700; font-size: 0.88rem; min-width: 80px; }
        .hours-times { display: flex; align-items: center; gap: 0.5rem; }
        .hours-times input[type=time] { padding: 0.4rem 0.75rem; border-radius: 10px; border: 1px solid var(--glass-border); background: var(--bg-app); font-size: 0.85rem; color: var(--text-primary); }
        .hours-closed { font-size: 0.8rem; color: var(--text-muted); font-weight: 600; }

        @keyframes spin { to { transform: rotate(360deg); } }
        .spinning { animation: spin .8s linear infinite; }

        @media(max-width: 1024px) {
          .biz-grid { grid-template-columns: 1fr; }
          .logo-grid { grid-template-columns: 1fr 1fr; }
          .identity-preview { grid-column: 1; }
        }
        @media(max-width: 768px) {
          .biz-header { flex-direction: column; }
          .save-all-btn { width: 100%; justify-content: center; }
          .logo-grid { grid-template-columns: 1fr; }
          .color-presets { gap: .5rem; }
        }
      `}</style>
    </div>
  );
};

export default BusinessPage;

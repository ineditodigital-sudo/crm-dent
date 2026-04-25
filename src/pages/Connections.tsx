import { useState, useEffect } from 'react';
import { Smartphone, CalendarCheck, RefreshCw, CheckCircle2, AlertCircle, ExternalLink, Save, Eye, EyeOff, Unplug, Bot } from 'lucide-react';
import { motion } from 'framer-motion';
import WhatsAppConnect from './WhatsAppConnect';
import { useAuth } from '../context/AuthContext';

const ConnectionsPage = () => {
  const { authFetch } = useAuth();
  const [tab, setTab] = useState<'whatsapp' | 'calendar' | 'gemini'>('whatsapp');
  const [calStatus, setCalStatus] = useState<boolean | null>(null);
  const [keys, setKeys] = useState({ google_id: '', google_secret: '', gemini_key: '' });
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [keysStatus, setKeysStatus] = useState<string[]>([]);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    // Calendar status
    authFetch('/api/calendar/status')
      .then(r => r.json()).then(d => setCalStatus(d.connected)).catch(() => setCalStatus(false));
    // Keys status
    authFetch('/api/settings/keys-status')
      .then(r => r.json()).then(d => setKeysStatus(d.configured || [])).catch(() => {});
  }, [authFetch]);

  const saveKeys = async () => {
    setSaving(true); setSaveMsg('');
    const keysToSave = Object.entries(keys).filter(([_, val]) => val.trim() !== '');
    
    if (keysToSave.length === 0) {
      setSaving(false);
      setSaveMsg('❌ No hay claves nuevas por guardar');
      setTimeout(() => setSaveMsg(''), 3000);
      return;
    }

    try {
      // Guardar cada clave individualmente
      for (const [key_name, content] of keysToSave) {
        const r = await authFetch('/api/settings', {
          method: 'POST',
          body: JSON.stringify({ section: 'api_keys', key_name, content })
        });
        if (!r.ok) throw new Error(`Error guardando ${key_name}`);
      }
      
      setSaveMsg('✅ Claves guardadas correctamente');
      setKeys({ google_id: '', google_secret: '', gemini_key: '' });
      const d = await authFetch('/api/settings/keys-status');
      setKeysStatus((await d.json()).configured || []);
    } catch { setSaveMsg('❌ Error guardando claves'); }
    setSaving(false);
    setTimeout(() => setSaveMsg(''), 3000);
  };

  const disconnectCalendar = async () => {
    if (!confirm('¿Desconectar Google Calendar? Deberás volver a autorizar.')) return;
    setDisconnecting(true);
    await authFetch('/api/calendar/disconnect', { method: 'POST' });
    setCalStatus(false);
    setDisconnecting(false);
  };

  const REDIRECT_URI = `${window.location.protocol}//${window.location.hostname}/api/calendar/callback`;

  return (
    <div className="connections-page animate-ios">
      <div className="conn-header">
        <h1 className="page-title">Conexiones</h1>
        <p className="page-sub">Gestiona todas las integraciones externas del CRM desde un solo lugar</p>
      </div>

      {/* TABS */}
      <div className="conn-tabs glass-card">
        {[
          { id: 'whatsapp', label: 'WhatsApp', icon: <Smartphone size={18} /> },
          { id: 'calendar', label: 'Google Calendar', icon: <CalendarCheck size={18} /> },
          { id: 'gemini', label: 'Inteligencia Artificial', icon: <Bot size={18} /> },
        ].map(t => (
          <button key={t.id} className={`conn-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id as any)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* WHATSAPP */}
      {tab === 'whatsapp' && <WhatsAppConnect />}

      {/* GOOGLE CALENDAR */}
      {tab === 'calendar' && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="conn-section glass-card">
          <div className="conn-section-header">
            <div className="conn-icon" style={{ background: 'rgba(234,67,53,.15)' }}><CalendarCheck size={24} style={{ color: '#ea4335' }} /></div>
            <div>
              <h2>Google Calendar</h2>
              <p>Permite que la IA consulte la agenda y agende citas automáticamente</p>
            </div>
            <div className={`status-badge ${calStatus ? 'connected' : 'disconnected'}`}>
              {calStatus ? <><CheckCircle2 size={14} /> Conectado</> : <><AlertCircle size={14} /> Desconectado</>}
            </div>
          </div>

          {!calStatus ? (
            <div className="cal-setup">
              <div className="setup-step">
                <span className="step-num">1</span>
                <div style={{ width: '100%' }}>
                  <strong>Configura las API Keys de Google</strong>
                  <p>Obtenlas desde Google Cloud Console y guárdalas aquí:</p>
                  
                  <div className="keys-form" style={{ marginTop: '1rem', background: 'var(--bg-app)', padding: '1.25rem', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                      <span className={`config-pill ${keysStatus.includes('google_id') ? 'ok' : 'missing'}`}>
                        {keysStatus.includes('google_id') ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />} Client ID
                      </span>
                      <span className={`config-pill ${keysStatus.includes('google_secret') ? 'ok' : 'missing'}`}>
                        {keysStatus.includes('google_secret') ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />} Client Secret
                      </span>
                    </div>

                    {[
                      { key: 'google_id', label: 'Google Client ID', placeholder: 'xxxx.apps.googleusercontent.com' },
                      { key: 'google_secret', label: 'Google Client Secret', placeholder: 'GOCSPX-...' }
                    ].map(f => (
                      <label key={f.key}>
                        {f.label}
                        <div className="key-input-row">
                          <input
                            type={showSecrets[f.key] ? 'text' : 'password'}
                            placeholder={`Actual: ${keysStatus.includes(f.key) ? '••••••••' : 'No configurada'} — Ingresa nueva para reemplazar`}
                            value={(keys as any)[f.key]}
                            onChange={e => setKeys(k => ({ ...k, [f.key]: e.target.value }))}
                          />
                          <button className="toggle-vis" onClick={() => setShowSecrets(s => ({ ...s, [f.key]: !s[f.key] }))}>
                            {showSecrets[f.key] ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </label>
                    ))}
                    
                    {saveMsg && <div className={`save-msg ${saveMsg.startsWith('✅') ? 'ok' : 'err'}`} style={{ marginTop: '1rem' }}>{saveMsg}</div>}
                    <button className="btn-primary" onClick={saveKeys} disabled={saving} style={{ marginTop: '1rem' }}>
                      {saving ? <RefreshCw size={16} className="spinning" /> : <Save size={16} />}
                      {saving ? 'Guardando...' : 'Guardar API Keys de Google'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="setup-step">
                <span className="step-num">2</span>
                <div>
                  <strong>Agrega el URI de redirección</strong>
                  <p>En Google Cloud Console → Credentials → OAuth Client, agrega este URI exacto:</p>
                  <code className="uri-code">{REDIRECT_URI}</code>
                </div>
              </div>

              <div className="setup-step">
                <span className="step-num">3</span>
                <div>
                  <strong>Autoriza el acceso</strong>
                  <p style={{ marginBottom: '0.5rem' }}>Abre la ventana de autorización para darle acceso al CRM a tu calendario.</p>
                  <a href="/api/calendar/auth" target="_blank" rel="noopener noreferrer" className="btn-connect">
                    <ExternalLink size={16} /> Conectar Google Calendar
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <div className="cal-connected">
              <CheckCircle2 size={48} style={{ color: '#34c759' }} />
              <p>Google Calendar está conectado. La IA puede ver la disponibilidad y agendar citas.</p>
              <button className="btn-danger" onClick={disconnectCalendar} disabled={disconnecting}>
                {disconnecting ? <RefreshCw size={16} className="spinning" /> : <Unplug size={16} />}
                Desconectar
              </button>
            </div>
          )}
        </motion.div>
      )}

      {/* GEMINI AI */}
      {tab === 'gemini' && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="conn-section glass-card">
          <div className="conn-section-header">
            <div className="conn-icon" style={{ background: 'rgba(52,168,83,.15)' }}><Bot size={24} style={{ color: '#34a853' }} /></div>
            <div>
              <h2>Inteligencia Artificial (Gemini)</h2>
              <p>Configura la clave API de Google Gemini para darle inteligencia a tu asistente de WhatsApp</p>
            </div>
            <div className={`status-badge ${keysStatus.includes('gemini_key') ? 'connected' : 'disconnected'}`}>
              {keysStatus.includes('gemini_key') ? <><CheckCircle2 size={14} /> Configurado</> : <><AlertCircle size={14} /> Faltan datos</>}
            </div>
          </div>

          <div className="keys-form" style={{ marginTop: '0.5rem' }}>
            <div style={{ padding: '1rem', borderRadius: 10, background: 'rgba(255,183,0,0.08)', border: '1px solid rgba(255,183,0,0.2)', marginBottom: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              ⚠️ Consigue tu API Key gratuita en <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{ color: 'var(--primary)' }}>Google AI Studio</a>.
            </div>

            <label>
              Gemini API Key
              <div className="key-input-row">
                <input
                  type={showSecrets['gemini_key'] ? 'text' : 'password'}
                  placeholder={`Actual: ${keysStatus.includes('gemini_key') ? '••••••••' : 'No configurada'} — Ingresa nueva para reemplazar`}
                  value={keys.gemini_key}
                  onChange={e => setKeys(k => ({ ...k, gemini_key: e.target.value }))}
                />
                <button className="toggle-vis" onClick={() => setShowSecrets(s => ({ ...s, gemini_key: !s.gemini_key }))}>
                  {showSecrets['gemini_key'] ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>
          </div>

          {saveMsg && <div className={`save-msg ${saveMsg.startsWith('✅') ? 'ok' : 'err'}`}>{saveMsg}</div>}
          <button className="btn-primary" onClick={saveKeys} disabled={saving}>
            {saving ? <RefreshCw size={16} className="spinning" /> : <Save size={16} />}
            {saving ? 'Guardando...' : 'Guardar API Key'}
          </button>
        </motion.div>
      )}

      <style>{`
        .connections-page{display:flex;flex-direction:column;gap:2rem}
        .conn-header{}
        .page-title{font-size:2rem;font-weight:800}
        .page-sub{color:var(--text-muted);font-size:.9rem;margin-top:.25rem}
        .conn-tabs{display:flex;gap:.25rem;padding:.5rem;border-radius:16px;width:fit-content}
        .conn-tab{display:flex;align-items:center;gap:.5rem;padding:.65rem 1.25rem;border-radius:12px;font-size:.9rem;font-weight:600;color:var(--text-muted);transition:var(--transition);border:none;background:transparent;cursor:pointer}
        .conn-tab.active{background:var(--primary);color:white}
        .conn-tab:hover:not(.active){background:var(--glass);color:var(--text-primary)}
        .conn-section{padding:2rem;border-radius:20px;display:flex;flex-direction:column;gap:1.5rem}
        .conn-section-header{display:flex;align-items:center;gap:1.25rem}
        .conn-icon{width:52px;height:52px;border-radius:16px;background:rgba(0,122,255,.12);display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .conn-section-header h2{font-size:1.25rem;font-weight:700}
        .conn-section-header p{font-size:.85rem;color:var(--text-muted);margin-top:.2rem}
        .status-badge{margin-left:auto;display:flex;align-items:center;gap:.4rem;padding:.4rem 1rem;border-radius:20px;font-size:.8rem;font-weight:700}
        .status-badge.connected{background:rgba(52,199,89,.15);color:#34c759}
        .status-badge.disconnected{background:rgba(255,59,48,.1);color:#ff3b30}
        .cal-setup{display:flex;flex-direction:column;gap:1.25rem}
        .setup-step{display:flex;align-items:flex-start;gap:1rem}
        .step-num{width:28px;height:28px;border-radius:50%;background:var(--primary);color:white;font-weight:800;font-size:.85rem;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:.15rem}
        .setup-step strong{font-size:.95rem;font-weight:700}
        .setup-step p{font-size:.85rem;color:var(--text-muted);margin-top:.2rem}
        .uri-code{display:block;background:var(--bg-surface);padding:.5rem 1rem;border-radius:8px;font-size:.8rem;margin-top:.5rem;word-break:break-all;border:1px solid var(--glass-border)}
        .btn-connect{display:inline-flex;align-items:center;gap:.5rem;background:var(--primary);color:white;padding:.6rem 1.25rem;border-radius:12px;font-weight:700;font-size:.85rem;margin-top:.5rem;text-decoration:none}
        .cal-connected{display:flex;flex-direction:column;align-items:center;gap:1.5rem;padding:2rem;text-align:center}
        .cal-connected p{font-size:.95rem;color:var(--text-muted)}
        .btn-danger{display:flex;align-items:center;gap:.5rem;background:rgba(255,59,48,.12);color:#ff3b30;padding:.65rem 1.5rem;border-radius:12px;font-weight:700;font-size:.9rem;border:none;cursor:pointer}
        .btn-danger:hover{background:rgba(255,59,48,.2)}
        .configured-pills{display:flex;flex-wrap:wrap;gap:.5rem}
        .config-pill{display:flex;align-items:center;gap:.4rem;padding:.35rem .75rem;border-radius:20px;font-size:.75rem;font-weight:700}
        .config-pill.ok{background:rgba(52,199,89,.15);color:#34c759}
        .config-pill.missing{background:rgba(255,59,48,.1);color:#ff3b30}
        .keys-form{display:flex;flex-direction:column;gap:1rem}
        .keys-form label{display:flex;flex-direction:column;gap:.4rem;font-size:.8rem;font-weight:600;color:var(--text-secondary)}
        .key-input-row{display:flex;gap:.5rem}
        .key-input-row input{flex:1;padding:.75rem 1rem;border-radius:12px;border:1px solid var(--glass-border);background:var(--bg-surface);font-size:.85rem;color:var(--text-primary)}
        .toggle-vis{padding:.75rem;border-radius:12px;background:var(--glass);color:var(--text-muted);border:none;cursor:pointer}
        .save-msg{padding:.6rem 1rem;border-radius:10px;font-size:.85rem;font-weight:600}
        .save-msg.ok{background:rgba(52,199,89,.15);color:#34c759}
        .save-msg.err{background:rgba(255,59,48,.1);color:#ff3b30}
        .btn-primary{background:var(--primary);color:white;padding:.75rem 1.5rem;border-radius:var(--radius-full);font-weight:700;display:flex;align-items:center;gap:.5rem;font-size:.9rem;width:fit-content;border:none;cursor:pointer}
        @keyframes spin{to{transform:rotate(360deg)}}
        .spinning{animation:spin .8s linear infinite}
        @media(max-width:768px){
          .conn-tabs{width:100%;overflow-x:auto;padding:.25rem}
          .conn-tab{padding:.5rem .75rem;font-size:.8rem;flex-shrink:0}
          .conn-section{padding:1.25rem}
          .conn-section-header{flex-direction:column;align-items:flex-start;gap:1rem}
          .status-badge{margin-left:0}
          .key-input-row{flex-direction:column}
          .toggle-vis{align-self:flex-end;margin-top:-44px;margin-right:4px}
          .btn-primary{width:100%;justify-content:center}
        }
      `}</style>
    </div>
  );
};
export default ConnectionsPage;

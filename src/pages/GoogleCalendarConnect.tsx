import { useState, useEffect, useCallback } from 'react';
import { Calendar, CheckCircle, AlertCircle, ExternalLink, Key, RefreshCw, ShieldCheck, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const GoogleCalendarConnect = () => {
    const { authFetch } = useAuth();
    const [calendarStatus, setCalendarStatus] = useState<'connected' | 'disconnected' | 'loading'>('loading');
    const [keys, setKeys] = useState({ google_id: '', google_secret: '' });
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [activeStep, setActiveStep] = useState(1);

    const checkStatus = useCallback(async () => {
        try {
            const res = await authFetch('/api/calendar/status');
            if (res.ok) {
                const data = await res.json();
                setCalendarStatus(data.connected ? 'connected' : 'disconnected');
                if (data.connected) setActiveStep(3);
            } else {
                setCalendarStatus('disconnected');
            }
        } catch {
            setCalendarStatus('disconnected');
        }
    }, [authFetch]);

    const loadKeys = useCallback(async () => {
        try {
            const res = await authFetch('/api/settings');
            if (res.ok) {
                const data = await res.json();
                setKeys({
                    google_id: data.api_keys?.google_id || '',
                    google_secret: data.api_keys?.google_secret || '',
                });
                if (data.api_keys?.google_id && data.api_keys?.google_secret) {
                    setActiveStep(2);
                }
            }
        } catch {}
    }, [authFetch]);

    useEffect(() => {
        checkStatus();
        loadKeys();
    }, [checkStatus, loadKeys]);

    const handleSaveKeys = async () => {
        setSaveStatus('saving');
        try {
            await authFetch('/api/settings', {
                method: 'POST',
                body: JSON.stringify({ section: 'api_keys', key_name: 'google_id', content: keys.google_id })
            });
            await authFetch('/api/settings', {
                method: 'POST',
                body: JSON.stringify({ section: 'api_keys', key_name: 'google_secret', content: keys.google_secret })
            });
            setSaveStatus('saved');
            setActiveStep(2);
            setTimeout(() => setSaveStatus('idle'), 2500);
        } catch {
            setSaveStatus('error');
            setTimeout(() => setSaveStatus('idle'), 3000);
        }
    };

    const handleConnect = () => {
        window.open('/api/calendar/auth', '_blank', 'width=600,height=700,scrollbars=yes');
        // Poll status after user returns
        const poll = setInterval(async () => {
            const res = await authFetch('/api/calendar/status').catch(() => null);
            if (res?.ok) {
                const data = await res.json();
                if (data.connected) {
                    setCalendarStatus('connected');
                    setActiveStep(3);
                    clearInterval(poll);
                }
            }
        }, 3000);
        setTimeout(() => clearInterval(poll), 120000);
    };

    const handleDisconnect = async () => {
        if (!confirm('¿Desconectar Google Calendar? La IA ya no podrá agendar citas automáticamente.')) return;
        try {
            await authFetch('/api/calendar/disconnect', { method: 'POST' });
            setCalendarStatus('disconnected');
            setActiveStep(2);
        } catch {}
    };

    const steps = [
        {
            n: 1,
            title: 'Configurar Credenciales OAuth',
            icon: <Key size={20} />,
            desc: 'Ingresa las claves de Google Cloud Console para autorizar el acceso al calendario.',
        },
        {
            n: 2,
            title: 'Autorizar Acceso',
            icon: <ShieldCheck size={20} />,
            desc: 'Abre la ventana de Google y aprueba el acceso a tu calendario.',
        },
        {
            n: 3,
            title: '¡Listo! Calendario Activo',
            icon: <Zap size={20} />,
            desc: 'La IA puede ahora consultar tu agenda y agendar citas automáticamente.',
        },
    ];

    return (
        <div style={{ padding: '0.5rem', maxWidth: '900px', margin: '0 auto' }}>
            {/* HEADER */}
            <header style={{ marginBottom: '2.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                    <div style={{
                        width: 48, height: 48, borderRadius: '14px',
                        background: 'linear-gradient(135deg, #4285F4, #34A853)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 8px 20px rgba(66,133,244,0.3)'
                    }}>
                        <Calendar size={26} color="white" />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Google Calendar</h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            Conecta tu agenda para que la IA programe citas sin empalmes.
                        </p>
                    </div>
                    <div style={{ marginLeft: 'auto' }}>
                        {calendarStatus === 'connected' ? (
                            <span style={{
                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                padding: '0.5rem 1.25rem', borderRadius: 99,
                                background: 'rgba(52,199,89,0.12)', color: '#34c759',
                                fontSize: '0.85rem', fontWeight: 700
                            }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#34c759', animation: 'pulse 2s infinite' }} />
                                Conectado
                            </span>
                        ) : (
                            <span style={{
                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                padding: '0.5rem 1.25rem', borderRadius: 99,
                                background: 'rgba(255,59,48,0.1)', color: '#ff3b30',
                                fontSize: '0.85rem', fontWeight: 700
                            }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff3b30' }} />
                                Desconectado
                            </span>
                        )}
                    </div>
                </div>
            </header>

            {/* STEPPER */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2.5rem', alignItems: 'flex-start' }}>
                {steps.map((step, i) => {
                    const isDone = activeStep > step.n;
                    const isActive = activeStep === step.n;
                    return (
                        <div key={step.n} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', flex: 1 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                <div style={{
                                    width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontWeight: 800, fontSize: '0.9rem', transition: 'all 0.3s',
                                    background: isDone ? '#34c759' : isActive ? 'var(--primary)' : 'var(--bg-surface)',
                                    color: isDone || isActive ? 'white' : 'var(--text-muted)',
                                    boxShadow: isActive ? '0 8px 20px var(--primary-light)' : 'none',
                                    border: isActive ? 'none' : '2px solid var(--glass-border)',
                                }}>
                                    {isDone ? <CheckCircle size={20} /> : step.icon}
                                </div>
                                {i < steps.length - 1 && (
                                    <div style={{
                                        width: 2, flex: 1, minHeight: 30,
                                        background: isDone ? '#34c759' : 'var(--glass-border)',
                                        transition: 'background 0.3s'
                                    }} />
                                )}
                            </div>
                            <div style={{ paddingTop: '0.5rem' }}>
                                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: isActive ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                    {step.title}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem', lineHeight: 1.4 }}>
                                    {step.desc}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* PASO 1: CREDENCIALES */}
            <div className="glass-card" style={{
                padding: '2rem', marginBottom: '1.5rem',
                border: activeStep === 1 ? '2px solid var(--primary)' : '2px solid transparent',
                transition: 'all 0.3s'
            }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', fontSize: '1.1rem', fontWeight: 700 }}>
                    <Key size={18} color="var(--primary)" />
                    Paso 1 — Credenciales de Google OAuth
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                    Necesitas un <strong>Client ID</strong> y <strong>Client Secret</strong> de Google Cloud Console.{' '}
                    <a
                        href="https://console.cloud.google.com/apis/credentials"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                    >
                        Abrir Google Cloud Console <ExternalLink size={12} />
                    </a>
                    . En tu proyecto, habilita la API de Google Calendar y crea unas credenciales OAuth 2.0 con la URI de redirección:{' '}
                    <code style={{ background: 'var(--bg-app)', padding: '0.2rem 0.5rem', borderRadius: 6, fontSize: '0.8rem' }}>
                        https://crm-dent.inedito.digital/api/calendar/callback
                    </code>
                </p>

                <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '1fr 1fr' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Google Client ID
                        </label>
                        <input
                            type="text"
                            value={keys.google_id}
                            onChange={e => setKeys(p => ({ ...p, google_id: e.target.value }))}
                            placeholder="000000000000-xxxx.apps.googleusercontent.com"
                            style={{
                                width: '100%', padding: '0.9rem 1rem',
                                background: 'var(--bg-app)', border: '2px solid transparent',
                                borderRadius: 12, fontSize: '0.85rem', color: 'var(--text-primary)',
                                transition: 'all 0.2s', boxSizing: 'border-box'
                            }}
                            onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                            onBlur={e => e.target.style.borderColor = 'transparent'}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Google Client Secret
                        </label>
                        <input
                            type="password"
                            value={keys.google_secret}
                            onChange={e => setKeys(p => ({ ...p, google_secret: e.target.value }))}
                            placeholder="GOCSPX-xxxxxxxxxxxxxxx"
                            style={{
                                width: '100%', padding: '0.9rem 1rem',
                                background: 'var(--bg-app)', border: '2px solid transparent',
                                borderRadius: 12, fontSize: '0.85rem', color: 'var(--text-primary)',
                                transition: 'all 0.2s', boxSizing: 'border-box'
                            }}
                            onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                            onBlur={e => e.target.style.borderColor = 'transparent'}
                        />
                    </div>
                </div>

                <div style={{ marginTop: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button
                        onClick={handleSaveKeys}
                        disabled={!keys.google_id || !keys.google_secret || saveStatus === 'saving'}
                        style={{
                            padding: '0.75rem 2rem', borderRadius: 99, fontWeight: 700,
                            border: 'none', cursor: keys.google_id && keys.google_secret ? 'pointer' : 'not-allowed',
                            background: saveStatus === 'saved' ? '#34c759' : 'var(--primary)',
                            color: 'white', fontSize: '0.9rem',
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            transition: 'all 0.3s',
                            boxShadow: '0 8px 20px var(--primary-light)',
                            opacity: !keys.google_id || !keys.google_secret ? 0.5 : 1,
                        }}
                    >
                        {saveStatus === 'saving' ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : saveStatus === 'saved' ? <CheckCircle size={16} /> : <Key size={16} />}
                        {saveStatus === 'saving' ? 'Guardando...' : saveStatus === 'saved' ? '¡Guardado!' : 'Guardar Credenciales'}
                    </button>
                    {saveStatus === 'error' && (
                        <span style={{ color: '#ff3b30', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <AlertCircle size={14} /> Error al guardar.
                        </span>
                    )}
                </div>
            </div>

            {/* PASO 2: CONECTAR */}
            <div className="glass-card" style={{
                padding: '2rem', marginBottom: '1.5rem',
                border: activeStep === 2 ? '2px solid var(--primary)' : '2px solid transparent',
                opacity: activeStep < 2 ? 0.5 : 1,
                transition: 'all 0.3s'
            }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', fontSize: '1.1rem', fontWeight: 700 }}>
                    <ShieldCheck size={18} color="var(--primary)" />
                    Paso 2 — Autorizar con tu cuenta de Google
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                    Al hacer clic en el botón, se abrirá una ventana de Google para que apruebes el acceso.
                    Selecciona la cuenta donde tienes tu calendario de citas.
                </p>
                <button
                    onClick={handleConnect}
                    disabled={activeStep < 2}
                    style={{
                        padding: '0.9rem 2rem', borderRadius: 99, fontWeight: 700,
                        border: 'none', cursor: activeStep >= 2 ? 'pointer' : 'not-allowed',
                        background: 'linear-gradient(135deg, #4285F4, #34A853)',
                        color: 'white', fontSize: '0.95rem',
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                        boxShadow: '0 10px 25px rgba(66,133,244,0.35)',
                        transition: 'all 0.3s',
                    }}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                        <path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.727 0-.788-.085-1.39-.189-1.989H12.24z"/>
                    </svg>
                    Conectar con Google
                    <ExternalLink size={16} />
                </button>
            </div>

            {/* PASO 3: CONECTADO */}
            {calendarStatus === 'connected' && (
                <div className="glass-card" style={{
                    padding: '2rem',
                    border: '2px solid #34c759',
                    background: 'rgba(52,199,89,0.04)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{
                                width: 56, height: 56, borderRadius: '50%',
                                background: 'rgba(52,199,89,0.12)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <CheckCircle size={32} color="#34c759" />
                            </div>
                            <div>
                                <h3 style={{ fontWeight: 800, color: '#34c759', fontSize: '1.2rem' }}>¡Google Calendar Conectado!</h3>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
                                    La IA tiene acceso a tu agenda y puede agendar citas automáticamente.
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleDisconnect}
                            style={{
                                padding: '0.6rem 1.25rem', borderRadius: 99,
                                border: '1px solid rgba(255,59,48,0.3)',
                                background: 'rgba(255,59,48,0.08)',
                                color: '#ff3b30', cursor: 'pointer', fontWeight: 600,
                                fontSize: '0.85rem'
                            }}
                        >
                            Desconectar
                        </button>
                    </div>

                    {/* Info sobre lo que hace la IA */}
                    <div style={{
                        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                        gap: '1rem', marginTop: '2rem'
                    }}>
                        {[
                            { icon: '📅', label: 'Consulta disponibilidad en tiempo real' },
                            { icon: '🤖', label: 'Agenda citas automáticamente via WhatsApp' },
                            { icon: '🚫', label: 'Evita empalmes de horarios' },
                            { icon: '📲', label: 'Envía confirmaciones al paciente' },
                        ].map((f, i) => (
                            <div key={i} style={{
                                padding: '1rem', borderRadius: 12,
                                background: 'var(--bg-app)',
                                display: 'flex', alignItems: 'center', gap: '0.75rem',
                                fontSize: '0.85rem', fontWeight: 500
                            }}>
                                <span style={{ fontSize: '1.25rem' }}>{f.icon}</span>
                                {f.label}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.4; }
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default GoogleCalendarConnect;

import { useState, useEffect, useCallback } from 'react';
import { Smartphone, CheckCircle, ShieldAlert, Activity } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const WhatsAppConnect = () => {
    const [status, setStatus] = useState<any>({ connected: false, qr: null, error: null });
    const [loading, setLoading] = useState(true);
    const [restarting, setRestarting] = useState(false);
    const { authFetch } = useAuth();
    const API_URL = '';

    const checkStatus = useCallback(async () => {
        try {
            const res = await authFetch(`${API_URL}/api/whatsapp/status`);
            if (!res.ok) throw new Error(`Error: ${res.status}`);
            const data = await res.json();
            setStatus(data);
        } catch (err) {
            setStatus((prev: any) => ({ ...prev, error: `No se pudo conectar con el servidor en: ${API_URL}` }));
        } finally {
            setLoading(false);
        }
    }, [authFetch]);

    const handleRestart = async () => {
        setRestarting(true);
        try {
            await authFetch(`${API_URL}/api/whatsapp/restart`, { method: 'POST' });
            setTimeout(checkStatus, 2000);
        } catch (err) {
            console.error(err);
        } finally {
            setTimeout(() => setRestarting(false), 3000);
        }
    };

    useEffect(() => {
        checkStatus();
        const interval = setInterval(checkStatus, 5000);
        return () => clearInterval(interval);
    }, []);

    // Generar URL del QR usando una API externa segura para evitar errores de librería
    const qrImageUrl = status.qr ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(status.qr)}` : null;

    return (
        <div className="whatsapp-connect-ios animate-ios" style={{ padding: '2rem' }}>
            <header style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <Smartphone style={{ color: 'var(--primary)' }} /> 
                        Vinculación de WhatsApp
                    </h1>
                    <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Configura el bot multiagente de tu clínica.</p>
                </div>
                <button 
                    onClick={handleRestart}
                    disabled={restarting}
                    className="glass-card"
                    style={{ 
                        display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem', 
                        borderRadius: '12px', cursor: 'pointer', color: 'var(--primary)',
                        border: '1px solid var(--primary-light)', background: 'rgba(52, 199, 89, 0.05)',
                        opacity: restarting ? 0.6 : 1
                    }}
                >
                    <Activity size={18} className={restarting ? "animate-spin" : ""} />
                    {restarting ? "Reiniciando..." : "Reiniciar Conexión"}
                </button>
            </header>

            {status.error && (
                <div style={{ background: 'rgba(255, 59, 48, 0.1)', color: '#ff3b30', padding: '1rem', borderRadius: '12px', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <ShieldAlert size={20} />
                    <span>{status.error}</span>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                <div className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                    {status.connected ? (
                        <>
                            <div style={{ width: '80px', height: '80px', background: 'rgba(52, 199, 89, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                                <CheckCircle size={48} style={{ color: 'var(--success)' }} />
                            </div>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--success)' }}>¡Conectado!</h2>
                            <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>Tu bot está respondiendo mensajes activamente.</p>
                        </>
                    ) : (
                        <>
                            <div style={{ width: '80px', height: '80px', background: 'rgba(255, 183, 0, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                                <ShieldAlert size={48} style={{ color: 'var(--warning)' }} />
                            </div>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--warning)' }}>Esperando Vinculación</h2>
                            <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>Escanea el código QR para activar el sistema.</p>
                            {(loading || !status.qr) && <Activity className="animate-spin" style={{ marginTop: '1.5rem', color: 'var(--primary)' }} />}
                        </>
                    )}
                </div>

                <div className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '350px' }}>
                    {!status.connected && qrImageUrl ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
                            {/* Mobile Warning */}
                            {/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) && (
                                <div style={{ background: 'rgba(255, 183, 0, 0.1)', color: 'var(--warning)', padding: '1rem', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.75rem', maxWidth: '300px', textAlign: 'left', border: '1px solid rgba(255,183,0,0.2)' }}>
                                    <Smartphone size={24} style={{ flexShrink: 0 }} />
                                    <span>Estás en móvil. Escanea este código usando <strong>otro dispositivo</strong> con WhatsApp.</span>
                                </div>
                            )}
                            <div style={{ background: 'white', padding: '1.5rem', borderRadius: '20px', boxShadow: 'var(--shadow-ios)' }}>
                                <img src={qrImageUrl} alt="WhatsApp QR" style={{ width: '250px', height: '250px' }} />
                            </div>
                        </div>
                    ) : !status.connected ? (
                        <div style={{ textAlign: 'center', padding: '3rem 0' }}>
                            <Activity className="animate-spin" size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                            <p style={{ color: 'var(--text-muted)' }}>Generando nuevo código...</p>
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '3rem 0', opacity: 0.3 }}>
                            <Smartphone size={120} />
                            <p style={{ marginTop: '1rem', fontWeight: 'bold' }}>Dispositivo Vinculado</p>
                        </div>
                    )}
                </div>
            </div>

            <section className="glass-card" style={{ marginTop: '3rem', padding: '2rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>Instrucciones</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {[
                        'Abre WhatsApp en tu teléfono.',
                        'Toca Menú o Configuración y selecciona Dispositivos vinculados.',
                        'Escanea este código QR.'
                    ].map((step, i) => (
                        <div key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <span style={{ width: '24px', height: '24px', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                {i + 1}
                            </span>
                            <span style={{ color: 'var(--text-secondary)' }}>{step}</span>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
};

export default WhatsAppConnect;

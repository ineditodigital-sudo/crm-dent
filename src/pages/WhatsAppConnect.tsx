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
        <div className="whatsapp-connect-ios animate-ios">
            <header className="conn-header">
                <div className="header-text">
                    <h1 className="page-title">
                        <Smartphone style={{ color: 'var(--primary)' }} /> 
                        Vinculación de WhatsApp
                    </h1>
                    <p className="page-subtitle">Configura el bot multiagente de tu clínica.</p>
                </div>
                <button 
                    onClick={handleRestart}
                    disabled={restarting}
                    className="restart-btn glass-card"
                >
                    <Activity size={18} className={restarting ? "spinning" : ""} />
                    {restarting ? "Reiniciando..." : "Reiniciar Conexión"}
                </button>
            </header>

            {status.error && (
                <div className="error-banner">
                    <ShieldAlert size={20} />
                    <span>{status.error}</span>
                </div>
            )}

            <div className="qr-grid">
                <div className="glass-card status-card">
                    {status.connected ? (
                        <>
                            <div className="status-icon success">
                                <CheckCircle size={48} />
                            </div>
                            <h2 className="status-title success">¡Conectado!</h2>
                            <p className="status-desc">Tu bot está respondiendo mensajes activamente.</p>
                        </>
                    ) : (
                        <>
                            <div className="status-icon warning">
                                <ShieldAlert size={48} />
                            </div>
                            <h2 className="status-title warning">Esperando Vinculación</h2>
                            <p className="status-desc">Escanea el código QR para activar el sistema.</p>
                            {(loading || !status.qr) && <Activity className="spinning" style={{ marginTop: '1.5rem', color: 'var(--primary)' }} />}
                        </>
                    )}
                </div>

                <div className="glass-card qr-card">
                    {!status.connected && qrImageUrl ? (
                        <div className="qr-container">
                            {/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) && (
                                <div className="mobile-warning">
                                    <Smartphone size={24} style={{ flexShrink: 0 }} />
                                    <span>Estás en móvil. Escanea este código usando <strong>otro dispositivo</strong> con WhatsApp.</span>
                                </div>
                            )}
                            <div className="qr-image-wrap">
                                <img src={qrImageUrl} alt="WhatsApp QR" />
                            </div>
                        </div>
                    ) : !status.connected ? (
                        <div className="qr-loading">
                            <Activity className="spinning" size={48} />
                            <p>Generando nuevo código...</p>
                        </div>
                    ) : (
                        <div className="qr-linked">
                            <Smartphone size={120} />
                            <p>Dispositivo Vinculado</p>
                        </div>
                    )}
                </div>
            </div>

            <section className="glass-card instructions-card">
                <h3>Instrucciones</h3>
                <div className="steps-list">
                    {[
                        'Abre WhatsApp en tu teléfono.',
                        'Toca Menú o Configuración y selecciona Dispositivos vinculados.',
                        'Escanea este código QR.'
                    ].map((step, i) => (
                        <div key={i} className="step-item">
                            <span className="step-num">{i + 1}</span>
                            <span className="step-text">{step}</span>
                        </div>
                    ))}
                </div>
            </section>

            <style>{`
                .whatsapp-connect-ios { padding: 2rem; }
                .conn-header { margin-bottom: 3rem; display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; }
                .page-title { font-size: 2rem; font-weight: 800; display: flex; align-items: center; gap: 1rem; }
                .page-subtitle { color: var(--text-muted); margin-top: 0.5rem; }
                
                .restart-btn { 
                    display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1.25rem; 
                    border-radius: 12px; cursor: pointer; color: var(--primary);
                    border: 1px solid var(--primary-light); background: rgba(52, 199, 89, 0.05);
                    transition: var(--transition);
                }
                .restart-btn:hover { background: rgba(52, 199, 89, 0.1); transform: translateY(-1px); }

                .error-banner { background: rgba(255, 59, 48, 0.1); color: #ff3b30; padding: 1rem; border-radius: 12px; marginBottom: 2rem; display: flex; align-items: center; gap: 1rem; }
                
                .qr-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem; }
                .status-card { padding: 3rem 2rem; display: flex; flex-direction: column; align-items: center; textAlign: center; }
                .status-icon { width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; marginBottom: 1.5rem; }
                .status-icon.success { background: rgba(52, 199, 89, 0.1); color: var(--success); }
                .status-icon.warning { background: rgba(255, 183, 0, 0.1); color: var(--warning); }
                .status-title { fontSize: 1.5rem; fontWeight: bold; }
                .status-title.success { color: var(--success); }
                .status-title.warning { color: var(--warning); }
                .status-desc { marginTop: 0.5rem; color: var(--text-muted); text-align: center; }

                .qr-card { padding: 2rem; display: flex; flex-direction: column; align-items: center; justify-content: center; minHeight: 350px; }
                .qr-container { display: flex; flex-direction: column; align-items: center; gap: 1.5rem; }
                .mobile-warning { background: rgba(255, 183, 0, 0.1); color: var(--warning); padding: 1rem; border-radius: 12px; fontSize: 0.85rem; fontWeight: 600; display: flex; align-items: center; gap: 0.75rem; maxWidth: 300px; textAlign: left; border: 1px solid rgba(255,183,0,0.2); }
                .qr-image-wrap { background: white; padding: 1.5rem; border-radius: 20px; boxShadow: var(--shadow-ios); }
                .qr-image-wrap img { width: 250px; height: 250px; display: block; }
                
                .qr-loading { textAlign: center; padding: 3rem 0; color: var(--text-muted); }
                .qr-linked { textAlign: center; padding: 3rem 0; opacity: 0.3; }
                .qr-linked p { marginTop: 1rem; fontWeight: bold; }

                .instructions-card { marginTop: 3rem; padding: 2.5rem; }
                .instructions-card h3 { fontSize: 1.25rem; fontWeight: bold; marginBottom: 1.5rem; }
                .steps-list { display: flex; flex-direction: column; gap: 1.25rem; }
                .step-item { display: flex; gap: 1rem; alignItems: center; }
                .step-num { width: 28px; height: 28px; background: var(--primary-light); color: var(--primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; fontSize: 0.85rem; fontWeight: bold; flex-shrink: 0; }
                .step-text { color: var(--text-secondary); line-height: 1.5; }

                @keyframes spinning { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .spinning { animation: spinning 1s linear infinite; }

                @media (max-width: 768px) {
                    .whatsapp-connect-ios { padding: 1rem; }
                    .conn-header { flex-direction: column; align-items: stretch; margin-bottom: 2rem; }
                    .page-title { font-size: 1.5rem; }
                    .restart-btn { width: 100%; justify-content: center; }
                    .qr-grid { grid-template-columns: 1fr; }
                    .status-card { padding: 2rem 1rem; }
                    .qr-card { min-height: auto; padding: 2rem 1rem; }
                    .qr-image-wrap { padding: 1rem; }
                    .qr-image-wrap img { width: 200px; height: 200px; }
                    .instructions-card { padding: 1.5rem; margin-top: 2rem; }
                }
            `}</style>
        </div>
    );
};

export default WhatsAppConnect;

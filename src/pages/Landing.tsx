import { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Stethoscope, 
  MessageCircle,
  ArrowRight,
  CheckCircle,
  Sparkles,
  Heart,
  Smile,
  Syringe,
  Activity,
  Award,
  ChevronDown,
  MapPin
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeToggle } from '../components/ThemeToggle';

const Landing = ({ previewSettings }: { previewSettings?: any }) => {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [settings, setSettings] = useState<any>(previewSettings || {
    brand: { name: 'Dra. Stephanie Ortega', niche: 'Clínica Dental Especializada', logo: '' },
    theme: { primary: '#007aff', accent: '#ff2d55', font: 'Inter' },
    images: { hero: 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?q=80&w=2070&auto=format&fit=crop', doctor: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=2070&auto=format&fit=crop' },
    hero: { title: 'Sonrisas sanas, vidas más felices.', subtitle: 'Brindamos atención odontológica integral con tecnología de vanguardia y un trato humano excepcional.' },
    services: { title: 'Tratamientos de Excelencia.' },
    contact: { phone: '', address: 'Av. Principal #123, Colonia Centro. Edificio Médico Integral, Piso 4.' }
  });

  useEffect(() => {
    if (previewSettings) {
      setSettings(previewSettings);
    } else {
      const API_URL = '';
      fetch(`${API_URL}/api/settings`)
        .then(res => res.json())
        .then(data => {
          setSettings({
            brand: data.brand || settings.brand,
            theme: data.theme || settings.theme,
            images: data.images || settings.images,
            hero: data.hero || settings.hero,
            services: data.services || settings.services,
            contact: data.contact || settings.contact
          });
        })
        .catch(err => console.error("Error fetching landing settings", err));
    }
  }, [previewSettings]);

  const faqs = [
    { q: '¿Qué incluye la consulta de valoración inicial?', a: 'Incluye revisión clínica completa, toma de fotografías intraorales, radiografías panorámicas (si son necesarias) y un plan de tratamiento detallado.' },
    { q: '¿Los tratamientos provocan mucho dolor?', a: 'No, utilizamos tecnología de vanguardia y anestesia localizada de alta precisión para garantizar que todos nuestros procedimientos sean 100% indoloros.' },
    { q: '¿Aceptan seguros de gastos médicos mayores?', a: 'Sí, trabajamos con la mayoría de las redes aseguradoras. Al agendar por WhatsApp, nuestro bot te pedirá tu póliza para verificar cobertura.' },
    { q: '¿Cuánto dura un tratamiento de Blanqueamiento?', a: 'Generalmente se realiza en una sola sesión de 45 a 60 minutos, con resultados inmediatos que blanquean hasta 4 tonos.' }
  ];

  return (
    <div className="landing-ios-premium" style={{ 
      minHeight: '100%', 
      position: 'relative',
      '--primary': settings.theme?.primary || '#007aff',
      '--accent': settings.theme?.accent || '#ff2d55',
      fontFamily: settings.theme?.font === 'Playfair' ? '"Playfair Display", serif' : '"Inter", sans-serif'
    } as any}>
      {/* Navigation */}
      <nav className="glass-nav landing-header-ios" style={{ position: previewSettings ? 'absolute' : 'fixed' }}>
        <div className="ios-container nav-flex">
          <div className="logo-ios">
            {settings.brand?.logo ? (
              <img src={settings.brand.logo} alt="Logo" style={{ height: '40px', borderRadius: '8px' }} />
            ) : (
              <div className="logo-sparkle" style={{ background: 'var(--primary)' }}><Sparkles size={18} /></div>
            )}
            <span>{settings.brand?.name || 'Dra. Stephanie Ortega'}</span>
          </div>
          <div className="nav-links-ios">
            <a href="#especialidades">Tratamientos</a>
            <a href="#doctora">La Especialista</a>
            <a href="#casos">Casos Clínicos</a>
            <a href="#agendar">Cómo Agendar</a>
            {!previewSettings && <ThemeToggle />}
            <button className="btn-ios-primary" style={{ background: 'var(--primary)' }}>Citas por WhatsApp</button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-ios ios-container" style={{ paddingTop: previewSettings ? '120px' : '180px' }}>
        <div className="hero-text-wrap">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="hero-pill glass-card"
          >
            <Smile size={14} className="text-primary" />
            <span>{settings.brand?.niche || 'Clínica Dental Especializada'}</span>
          </motion.div>
          <h1 className="display-text animate-ios">
            {settings.hero?.title}
          </h1>
          <p className="hero-sub animate-ios" style={{ animationDelay: '0.2s' }}>
            {settings.hero?.subtitle}
          </p>
          <div className="hero-actions-ios animate-ios" style={{ animationDelay: '0.4s' }}>
            <button className="btn-ios-large">
              Agenda tu Valoración <ArrowRight size={18} />
            </button>
          </div>
        </div>

        <div className="hero-visual-ios">
           <div className="visual-stack">
              <motion.div 
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="visual-card main-v glass-card"
              >
                <img src={settings.images?.hero || 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?q=80&w=2070&auto=format&fit=crop'} alt="Clínica" />
              </motion.div>
              <div className="visual-card float-1 glass-card">
                 <div className="v-header"><Heart size={14} className="text-danger" /> <span>Atención 24/7</span></div>
                 <p>Nuestro asistente WhatsApp te atiende al instante para agendar.</p>
              </div>
           </div>
        </div>
      </section>

      {/* Profile Section (Doctora) */}
      <section id="doctora" className="profile-section ios-container">
        <div className="profile-grid">
           <div className="profile-photo glass-card">
              <img src={settings.images?.doctor || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=2070&auto=format&fit=crop'} alt="La Especialista" className="doc-img" />
              <div className="doc-badge glass-card"><Award size={20} className="text-primary" /> Especialista Certificada</div>
           </div>
           <div className="profile-info">
              <span className="ios-label">Conoce a la Experta</span>
              <h2 className="display-text-sm">Odontología basada en detalle y empatía.</h2>
              <p className="doc-bio">Con más de 10 años de experiencia transformando sonrisas, la Dra. Stephanie Ortega lidera un equipo multidisciplinario enfocado en tratamientos indoloros y estéticamente perfectos. Egresada con honores y certificada en diseño de sonrisa avanzado, su filosofía es tratar a cada paciente con el mismo cuidado que le daría a su propia familia.</p>
              <ul className="doc-credentials">
                <li><CheckCircle size={16} className="text-primary" /> Especialidad en Ortodoncia Invisible</li>
                <li><CheckCircle size={16} className="text-primary" /> Miembro de la Asociación Odontológica Nacional</li>
                <li><CheckCircle size={16} className="text-primary" /> Cédula Profesional: 98765432</li>
              </ul>
           </div>
        </div>
      </section>

      {/* Services Grid */}
      <section id="especialidades" className="ios-container services-ios">
        <div className="section-head-ios">
          <h2 className="display-text-sm">{settings.services?.title}</h2>
          <p>Conoce nuestras cinco áreas de especialidad clínica.</p>
        </div>

        <div className="ios-grid-services">
          {[
            { 
              title: 'Odontología Preventiva y General', icon: <Stethoscope />, delay: 0.1,
              items: ['Valoración y Diagnóstico', 'Limpieza Dental (Profilaxis)', 'Aplicación de Flúor y Selladores'] 
            },
            { 
              title: 'Odontología Restaurativa', icon: <ShieldCheck />, delay: 0.2,
              items: ['Resinas (Empastes)', 'Endodoncia (Conductos)', 'Coronas y Puentes'] 
            },
            { 
              title: 'Estética Dental', icon: <Sparkles />, delay: 0.3,
              items: ['Blanqueamiento Dental', 'Carillas (Porcelana/Resina)', 'Diseño de Sonrisa'] 
            },
            { 
              title: 'Ortodoncia', icon: <Activity />, delay: 0.4,
              items: ['Ortodoncia Convencional', 'Ortodoncia Invisible (Alineadores)'] 
            },
            { 
              title: 'Cirugía Oral e Implantología', icon: <Syringe />, delay: 0.5,
              items: ['Extracciones Dentales', 'Cirugía de Terceros Molares', 'Implantes Dentales de Titanio'] 
            }
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: s.delay }} className="glass-card service-widget-premium">
              <div className="s-icon-ios">{s.icon}</div>
              <h3>{s.title}</h3>
              <ul className="service-sublist">
                {s.items.map((item, idx) => (
                  <li key={idx}><CheckCircle size={14} className="text-success" /> {item}</li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Casos Clínicos / Before & After */}
      <section id="casos" className="cases-section ios-container">
        <div className="section-head-ios">
          <span className="ios-label">Casos Reales</span>
          <h2 className="display-text-sm">Transformaciones que inspiran.</h2>
        </div>
        <div className="cases-slider">
          {[1, 2, 3].map((_, i) => (
             <div key={i} className="case-card glass-card">
               <div className="case-images">
                 <div className="img-wrap before"><span className="label">Antes</span><img src={`https://images.unsplash.com/photo-1606811841689-23dfddce3e95?q=80&w=400&auto=format&fit=crop&sep=${i}`} alt="Antes" /></div>
                 <div className="img-wrap after"><span className="label accent">Después</span><img src={`https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?q=80&w=400&auto=format&fit=crop&sep=${i}`} alt="Después" /></div>
               </div>
               <div className="case-info">
                 <h4>Diseño de Sonrisa Completo</h4>
                 <p>Tratamiento de Carillas y Blanqueamiento Profesional. Duración: 2 semanas.</p>
               </div>
             </div>
          ))}
        </div>
      </section>

      {/* WhatsApp Automation (Cómo Agendar) */}
      <section id="agendar" className="automation-ios glass-card">
         <div className="ios-container automation-wrapper">
            <div className="a-content">
               <span className="ios-label">Atención Inmediata</span>
               <h2 className="display-text-sm">Sin esperas en el teléfono.</h2>
               <p className="text-muted" style={{ marginTop: '1rem', marginBottom: '1.5rem' }}>
                 ¿Necesitas una cita? Nuestro asistente interactivo de WhatsApp te mostrará nuestra disponibilidad en tiempo real para que elijas el horario que mejor te acomode, cualquier día del año.
               </p>
               <ul className="ios-features">
                  <li><CheckCircle size={18} /> Menú interactivo con todos los tratamientos</li>
                  <li><CheckCircle size={18} /> Confirmación inmediata a tu celular</li>
                  <li><CheckCircle size={18} /> Recordatorios un día antes de tu visita</li>
               </ul>
               <button className="btn-ios-large" style={{ marginTop: '2.5rem' }}>
                 <MessageCircle size={20} /> Iniciar Chat para Agendar
               </button>
            </div>
            <div className="a-visual">
               <div className="phone-mockup glass-card">
                  <header><span>Clínica Dra. Stephanie</span></header>
                  <div className="mock-chat">
                     <div className="bubble b-bot">
                       ¡Hola! Bienvenido a la clínica. ¿En qué especialidad estás interesado? 👇<br/><br/>
                       1. Odontología General<br/>
                       2. Estética Dental<br/>
                       3. Ortodoncia
                     </div>
                     <div className="bubble b-user">2</div>
                     <div className="bubble b-bot">Excelente. Selecciona el horario que prefieras para tu cita de Valoración Estética 📅</div>
                  </div>
               </div>
            </div>
         </div>
      </section>

      {/* FAQ & Location Section */}
      <section className="faq-location-section ios-container">
        <div className="faq-wrap">
          <span className="ios-label">Dudas Comunes</span>
          <h2 className="display-text-sm" style={{marginBottom: '2rem'}}>Respuestas Rápidas</h2>
          <div className="accordion-list">
            {faqs.map((faq, idx) => (
              <div key={idx} className={`accordion-item glass-card ${activeFaq === idx ? 'open' : ''}`} onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}>
                <div className="acc-head">
                  <h4>{faq.q}</h4>
                  <ChevronDown className="acc-icon" />
                </div>
                <AnimatePresence>
                  {activeFaq === idx && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="acc-body">
                      <p>{faq.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>

        <div className="location-wrap glass-card">
           <MapPin size={32} className="text-primary" style={{marginBottom: '1rem'}} />
           <h3 style={{fontSize: '1.5rem', marginBottom: '0.5rem'}}>Visítanos en la Clínica</h3>
           <p className="text-muted" style={{marginBottom: '2rem'}}>{settings.contact?.address}</p>
           <p className="text-muted" style={{marginBottom: '2rem'}}><strong>Tel / WhatsApp:</strong> {settings.contact?.phone}</p>
           <div className="map-placeholder glass-card">
              <span className="text-muted">Mapa Interactivo (Integración de SDK Maps pendiente)</span>
           </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer-ios ios-container">
        <div className="footer-main">
          <div className="f-col">
            <h4 className="logo-ios">Dra. Stephanie Ortega</h4>
            <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
              Transformando salud y confianza a través de la odontología de precisión y trato humano.
            </p>
          </div>
          <div className="f-col">
            <span className="ios-label">Clínica</span>
            <a href="#especialidades">Tratamientos</a>
            <a href="#casos">Casos Clínicos</a>
          </div>
          <div className="f-col">
            <span className="ios-label">Contacto</span>
            <a href="#">WhatsApp Urgencias</a>
            <a href="#">Aviso de Privacidad</a>
          </div>
        </div>
        <div className="footer-bottom-ios">
          <span>&copy; 2026 Dra. Stephanie Ortega - Odontología Especializada. Consultorio con permiso COFEPRIS.</span>
        </div>
      </footer>

      {/* WhatsApp Widget */}
      <div className="wa-ios-widget">
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="wa-floating-bubble glass-card">
          Agenda tu cita en segundos
        </motion.div>
        <button className="wa-ios-btn"><MessageCircle size={32} /></button>
      </div>

      <style>{`
        .landing-ios-premium { background: var(--bg-app); min-height: 100vh; overflow-x: hidden; }
        
        /* Headers & Nav */
        .landing-header-ios { height: 80px; display: flex; align-items: center; width: 100%; position: fixed; top: 0; z-index: 1000; }
        .nav-flex { display: flex; justify-content: space-between; align-items: center; width: 100%; }
        .logo-ios { display: flex; align-items: center; gap: 0.75rem; font-weight: 800; font-size: 1.1rem; color: var(--text-primary); }
        .logo-sparkle { background: var(--primary); color: white; width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
        
        .nav-links-ios { display: flex; align-items: center; gap: 2rem; }
        .nav-links-ios a { text-decoration: none; color: var(--text-secondary); font-weight: 600; font-size: 0.9rem; transition: var(--transition); }
        .nav-links-ios a:hover { color: var(--primary); }
        .btn-ios-primary { background: var(--primary); color: white; padding: 0.6rem 1.25rem; border-radius: 12px; font-weight: 600; transition: var(--transition); }
        .btn-ios-primary:hover { transform: scale(1.05); box-shadow: var(--shadow-ios); }

        /* Hero */
        .hero-ios { padding-top: 180px; padding-bottom: 100px; display: grid; grid-template-columns: 1.2fr 1fr; gap: 4rem; align-items: center; }
        .hero-pill { display: inline-flex; align-items: center; gap: 0.75rem; padding: 0.5rem 1rem; border-radius: var(--radius-full); margin-bottom: 2rem; font-size: 0.8rem; font-weight: 700; color: var(--text-primary); }
        .hero-sub { font-size: 1.15rem; color: var(--text-muted); margin-top: 1.5rem; line-height: 1.6; max-width: 480px; }
        .hero-actions-ios { display: flex; gap: 1.5rem; margin-top: 2.5rem; }
        .btn-ios-large { background: var(--primary); color: white; padding: 1.25rem 2.5rem; border-radius: 16px; font-weight: 700; font-size: 1.1rem; display: flex; align-items: center; gap: 1rem; box-shadow: 0 15px 30px var(--primary-light); cursor: pointer; transition: var(--transition); }
        .btn-ios-large:hover { transform: translateY(-3px); }

        .hero-visual-ios { position: relative; }
        .visual-stack { position: relative; height: 500px; margin-left: 2rem; }
        .visual-card { position: absolute; box-shadow: var(--shadow-ios); overflow: hidden; }
        .main-v { width: 100%; height: 100%; border-radius: 30px; }
        .main-v img { width: 100%; height: 100%; object-fit: cover; }
        .float-1 { bottom: 40px; left: -40px; width: 280px; padding: 1.5rem; z-index: 5; }
        .v-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; color: var(--text-primary); font-weight: 800; font-size: 0.8rem; }

        /* Profile Doctora */
        .profile-section { padding: 80px 2rem; }
        .profile-grid { display: grid; grid-template-columns: 1fr 1.2fr; gap: 4rem; align-items: center; }
        .profile-photo { position: relative; border-radius: 30px; padding: 1rem; }
        .doc-img { width: 100%; height: auto; border-radius: 20px; aspect-ratio: 4/5; object-fit: cover; }
        .doc-badge { position: absolute; bottom: -20px; right: -20px; padding: 1rem 1.5rem; display: flex; align-items: center; gap: 1rem; font-weight: 700; font-size: 0.95rem; border-radius: 16px; }
        .doc-bio { font-size: 1.1rem; color: var(--text-secondary); line-height: 1.7; margin: 1.5rem 0 2.5rem; }
        .doc-credentials { list-style: none; display: flex; flex-direction: column; gap: 1rem; }
        .doc-credentials li { display: flex; align-items: center; gap: 1rem; font-size: 1rem; font-weight: 600; color: var(--text-primary); }

        /* Services */
        .services-ios { padding: 100px 2rem; }
        .section-head-ios { text-align: center; margin-bottom: 4rem; }
        .display-text-sm { font-size: 3.2rem; font-weight: 800; letter-spacing: -0.03em; line-height: 1.1; color: var(--text-primary); margin-top: 0.5rem; }
        .section-head-ios p { font-size: 1.1rem; color: var(--text-muted); margin-top: 1rem; }
        .ios-grid-services { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 2rem; }

        .service-widget-premium { padding: 2.5rem; display: flex; flex-direction: column; transition: var(--transition); cursor: default; }
        .service-widget-premium:hover { transform: translateY(-8px); border-color: var(--primary); }
        .s-icon-ios { width: 52px; height: 52px; background: var(--primary-light); color: var(--primary); border-radius: 14px; display: flex; align-items: center; justify-content: center; margin-bottom: 1.5rem; }
        .service-widget-premium h3 { font-size: 1.25rem; font-weight: 800; margin-bottom: 1.25rem; color: var(--text-primary); }
        .service-sublist { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.75rem; flex: 1; }
        .service-sublist li { display: flex; align-items: flex-start; gap: 0.75rem; font-size: 0.9rem; color: var(--text-secondary); line-height: 1.4; }

        /* Cases (Slider) */
        .cases-section { padding: 100px 2rem; }
        .cases-slider { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 2.5rem; margin-top: 4rem; }
        .case-card { overflow: hidden; padding: 1rem; display: flex; flex-direction: column; gap: 1.5rem; }
        .case-images { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; border-radius: 16px; overflow: hidden; }
        .img-wrap { position: relative; aspect-ratio: 1/1.2; }
        .img-wrap img { width: 100%; height: 100%; object-fit: cover; }
        .img-wrap .label { position: absolute; bottom: 10px; left: 10px; background: rgba(0,0,0,0.6); color: white; padding: 0.3rem 0.8rem; border-radius: 8px; font-size: 0.7rem; font-weight: 700; backdrop-filter: blur(4px); }
        .img-wrap .label.accent { background: var(--primary); }
        .case-info h4 { font-size: 1.1rem; margin-bottom: 0.5rem; color: var(--text-primary); }
        .case-info p { font-size: 0.85rem; color: var(--text-muted); line-height: 1.5; }

        /* Automation Bot */
        .automation-ios { border-radius: 40px; background: var(--bg-surface); margin: 4rem 2rem; overflow: hidden; position: relative; border: 1px solid var(--glass-border); box-shadow: var(--shadow-ios); }
        .automation-wrapper { display: grid; grid-template-columns: 1.2fr 1fr; gap: 4rem; padding: 6rem 2rem; }
        .ios-features { list-style: none; margin-top: 2rem; display: flex; flex-direction: column; gap: 1.5rem; }
        .ios-features li { display: flex; align-items: flex-start; gap: 1rem; color: var(--text-primary); font-weight: 600; font-size: 1rem; line-height: 1.4; }

        .phone-mockup { width: 320px; height: 580px; border-radius: 40px; margin: 0 auto; background: var(--bg-app); border: 8px solid var(--glass-border); padding: 1rem; display: flex; flex-direction: column; overflow: hidden; }
        .phone-mockup header { height: 40px; border-bottom: 1px solid var(--glass-border); display: flex; align-items: center; justify-content: center; color: var(--text-primary); font-size: 0.8rem; font-weight: 700; }
        .mock-chat { flex: 1; display: flex; flex-direction: column; gap: 1.25rem; padding: 1.5rem 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
        .bubble { padding: 1rem; border-radius: 16px; font-size: 0.85rem; max-width: 85%; line-height: 1.5; }
        .b-bot { background: var(--bg-surface); color: var(--text-primary); border-bottom-left-radius: 4px; border: 1px solid var(--glass-border); }
        .b-user { background: var(--primary); color: white; align-self: flex-end; border-bottom-right-radius: 4px; }

        /* FAQ & Location */
        .faq-location-section { padding: 80px 2rem; display: grid; grid-template-columns: 1fr 1fr; gap: 4rem; }
        .accordion-list { display: flex; flex-direction: column; gap: 1rem; }
        .accordion-item { padding: 1.5rem; border-radius: 16px; cursor: pointer; transition: var(--transition); border: 1px solid transparent; }
        .accordion-item:hover { background: var(--bg-surface); border-color: var(--glass-border); }
        .accordion-item.open { border-color: var(--primary); background: var(--primary-light); }
        .acc-head { display: flex; justify-content: space-between; align-items: center; }
        .acc-head h4 { font-size: 1.05rem; margin: 0; color: var(--text-primary); }
        .acc-icon { color: var(--text-muted); transition: var(--transition); }
        .accordion-item.open .acc-icon { transform: rotate(180deg); color: var(--primary); }
        .acc-body { overflow: hidden; }
        .acc-body p { margin-top: 1rem; margin-bottom: 0; font-size: 0.95rem; color: var(--text-secondary); line-height: 1.6; }

        .location-wrap { padding: 3rem; display: flex; flex-direction: column; }
        .map-placeholder { flex: 1; min-height: 250px; background: var(--bg-app); border-radius: 16px; display: flex; align-items: center; justify-content: center; text-align: center; padding: 2rem; }

        /* Footer */
        .footer-ios { padding: 6rem 0 3rem; border-top: 1px solid var(--glass-border); }
        .footer-main { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 4rem; }
        .f-col { display: flex; flex-direction: column; gap: 1rem; }
        .f-col a { text-decoration: none; color: var(--text-muted); font-size: 0.95rem; font-weight: 500; transition: var(--transition); }
        .f-col a:hover { color: var(--primary); }
        .footer-bottom-ios { margin-top: 4rem; text-align: center; color: var(--text-muted); font-size: 0.85rem; font-weight: 600; padding-top: 2rem; border-top: 1px solid var(--glass-border); }

        /* WhatsApp Widget */
        .wa-ios-widget { position: fixed; bottom: 32px; right: 32px; z-index: 2000; display: flex; flex-direction: column; align-items: flex-end; gap: 1rem; }
        .wa-floating-bubble { padding: 1rem 1.5rem; border-radius: 20px; font-weight: 700; font-size: 0.9rem; border-bottom-right-radius: 4px; border: 1px solid var(--glass-border); color: var(--text-primary); }
        .wa-ios-btn { width: 64px; height: 64px; background: #25d366; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 24px rgba(37, 211, 102, 0.4); }

        @media (max-width: 1024px) {
          .hero-ios, .profile-grid, .automation-wrapper, .faq-location-section, .footer-main { grid-template-columns: 1fr; gap: 4rem; }
          .hero-ios { padding-top: 140px; text-align: center; padding-bottom: 60px; }
          .hero-text-wrap { align-items: center; display: flex; flex-direction: column; }
          .hero-visual-ios { margin-top: 2rem; }
          .visual-stack { height: 400px; margin-left: 0; max-width: 500px; margin: 0 auto; }
          .float-1 { display: none; }
          .profile-photo { max-width: 400px; margin: 0 auto; }
          .doc-badge { right: 10px; bottom: 10px; }
          .display-text { font-size: 3.5rem; }
          .display-text-sm { font-size: 2.5rem; }
          .ios-features li { align-items: flex-start; text-align: left; }
          .automation-wrapper { padding: 4rem 1.5rem; }
          .footer-main { text-align: center; }
          .f-col { align-items: center; }
        }

        @media (max-width: 768px) {
          .landing-header-ios { height: 70px; }
          .nav-links-ios a { display: none; }
          .nav-links-ios { gap: 1rem; }
          .ios-grid-services { grid-template-columns: 1fr; }
          .hero-actions-ios { flex-direction: column; width: 100%; max-width: 320px; }
          .btn-ios-large { width: 100%; justify-content: center; padding: 1rem; font-size: 1rem; }
          .display-text { font-size: 2.8rem; }
          .hero-sub { font-size: 1rem; }
          .cases-slider { grid-template-columns: 1fr; }
          .automation-ios { margin: 2rem 1rem; border-radius: 24px; }
          .phone-mockup { width: 100%; max-width: 280px; height: 500px; }
          .faq-location-section { gap: 3rem; }
          .location-wrap { padding: 2rem 1.5rem; }
        }
      `}</style>
    </div>
  );
};

export default Landing;

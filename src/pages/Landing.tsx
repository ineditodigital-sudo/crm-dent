import { useState, useEffect } from 'react';
import { 
  MessageCircle,
  ArrowRight,
  Sparkles,
  MapPin,
  Camera,
  X,
  Menu,
  ChevronDown,
  Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeToggle } from '../components/ThemeToggle';
import { useTheme } from '../context/ThemeContext';

const Landing = ({ previewSettings }: { previewSettings?: any }) => {
  const { isDark } = useTheme();
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(isDark);
  const [settings, setSettings] = useState<any>(previewSettings || {
    brand: { clinic_name: 'Dra. Stephanie Ortega', giro: 'Clínica Dental Especializada', logo_url: '' },
    theme: { primary: '#007aff', accent: '#ff2d55', font: 'Inter' },
    images: { hero: 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?q=80&w=2070&auto=format&fit=crop', doctor: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=2070&auto=format&fit=crop' },
    hero: { title: 'Sonrisas sanas, vidas más felices.', subtitle: 'Brindamos atención odontológica integral con tecnología de vanguardia y un trato humano excepcional.' },
    services: { title: 'Tratamientos de Excelencia.', subtitle: 'Conoce nuestras áreas de especialidad clínica.' },
    contact: { phone: '', address: 'Av. Principal #123, Colonia Centro.' },
    professional: { show: 'yes', bio: 'Con más de 10 años de experiencia transformando sonrisas...' },
    faq: { q1: '¿Qué incluye la consulta?', a1: 'Incluye revisión clínica completa...', q2: '¿Duele el tratamiento?', a2: 'No, usamos tecnología indolora.' },
    services_list: []
  });

  useEffect(() => {
    setIsDarkMode(isDark);
  }, [isDark]);

  useEffect(() => {
    if (previewSettings) {
      setSettings(previewSettings);
    } else {
      fetch(`/api/public/settings`)
        .then(res => res.json())
        .then(data => {
          setSettings({
            ...data,
            brand: data.brand || settings.brand,
            theme: data.theme || settings.theme,
            images: data.images || settings.images,
            hero: data.hero || settings.hero,
            services: data.services || settings.services,
            contact: data.contact || settings.contact,
            faq: data.faq || settings.faq,
            professional: data.professional || settings.professional,
            services_list: data.services_list || []
          });

          // --- SEO Injection ---
          const seo = data.seo || {};
          if (seo.title) document.title = seo.title;
          
          const upsertMeta = (name: string, content: string | undefined, attr = 'name') => {
            if (!content) return;
            let el = document.querySelector(`meta[${attr}="${name}"]`);
            if (!el) {
              el = document.createElement('meta');
              el.setAttribute(attr, name);
              document.head.appendChild(el);
            }
            el.setAttribute('content', content);
          };

          upsertMeta('description', seo.description);
          upsertMeta('keywords', seo.keywords);
          upsertMeta('robots', seo.robots);
          upsertMeta('og:title', seo.og_title || seo.title, 'property');
          upsertMeta('og:description', seo.og_description || seo.description, 'property');
          upsertMeta('og:image', seo.og_image, 'property');
          upsertMeta('og:url', seo.canonical_url || window.location.href, 'property');
          upsertMeta('og:type', 'website', 'property');
          upsertMeta('twitter:card', 'summary_large_image');
          upsertMeta('twitter:title', seo.og_title || seo.title);
          upsertMeta('twitter:description', seo.og_description || seo.description);
          upsertMeta('twitter:image', seo.og_image);

          if (seo.canonical_url) {
            let canEl = document.querySelector('link[rel="canonical"]');
            if (!canEl) {
              canEl = document.createElement('link');
              canEl.setAttribute('rel', 'canonical');
              document.head.appendChild(canEl);
            }
            canEl.setAttribute('href', seo.canonical_url);
          }

          if (seo.json_ld) {
            let scriptEl = document.getElementById('json-ld-seo') as HTMLScriptElement;
            if (!scriptEl) {
              scriptEl = document.createElement('script');
              scriptEl.id = 'json-ld-seo';
              scriptEl.type = 'application/ld+json';
              document.head.appendChild(scriptEl);
            }
            scriptEl.textContent = seo.json_ld;
          }
        })
        .catch(err => console.error("Error fetching landing settings", err));
    }
  }, [previewSettings]);

  const faqs = [];
  for(let i=1; i<=4; i++) {
    if (settings.faq?.[`q${i}`]) {
      faqs.push({ q: settings.faq[`q${i}`], a: settings.faq[`a${i}`] });
    }
  }

  const currentLogo = isDarkMode 
    ? (settings.brand?.logo_dark_url || settings.brand?.logo_url) 
    : (settings.brand?.logo_url || settings.brand?.logo_dark_url);

  const logoStyle: any = { 
    height: '44px', 
    width: 'auto', 
    objectFit: 'contain',
    filter: isDarkMode && !settings.brand?.logo_dark_url && settings.brand?.logo_url
      ? 'brightness(0) invert(1)' 
      : !isDarkMode && !settings.brand?.logo_dark_url && settings.brand?.logo_url
      ? 'brightness(0)'
      : 'none'
  };

  const whatsappPhone = settings.contact?.phone?.replace(/\D/g, '') || '';
  const waLink = `https://wa.me/${whatsappPhone}`;

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Gallery images from settings
  const galleryImages = [];
  for(let i=1; i<=6; i++) {
    if (settings.images?.[`gallery_${i}`]) galleryImages.push(settings.images[`gallery_${i}`]);
  }

  return (
    <div className="landing-ios-premium" style={{ 
      minHeight: '100%', 
      position: 'relative',
      '--primary': settings.theme?.primary || '#007aff',
      '--primary-glow': (settings.theme?.primary || '#007aff') + '44',
      '--accent': settings.theme?.accent || '#ff2d55',
      fontFamily: settings.theme?.font === 'Playfair' ? '"Playfair Display", serif' : '"Inter", sans-serif'
    } as any}>
      
      {/* --- Lightbox --- */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="lightbox-overlay"
            onClick={() => setSelectedImage(null)}
          >
            <motion.img 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              src={selectedImage} alt="Fullscreen" className="lightbox-img" 
            />
            <button className="close-lightbox" onClick={() => setSelectedImage(null)}><X size={32} /></button>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Navigation */}
      <nav className="glass-nav landing-header-ios" style={{ position: previewSettings ? 'absolute' : 'fixed' }}>
        <div className="ios-container nav-flex">
          <div className="logo-ios" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} style={{ cursor: 'pointer' }}>
            {currentLogo ? (
              <img src={currentLogo} alt="Logo" style={logoStyle} />
            ) : (
              <div className="logo-sparkle" style={{ background: 'var(--primary)' }}><Sparkles size={18} /></div>
            )}
          </div>
          
          <div className="nav-links-ios">
            <a href="#inicio">Inicio</a>
            <a href="#especialidades">Servicios</a>
            <a href="#doctora">Información</a>
            <a href="#contacto">Contacto</a>
            {!previewSettings && <ThemeToggle />}
            <a href={waLink} target="_blank" rel="noreferrer" className="btn-ios-pill">
              <MessageCircle size={18} fill="currentColor" /> WhatsApp
            </a>
          </div>

          <div className="nav-actions-mobile">
             {!previewSettings && <div className="mobile-theme-wrap"><ThemeToggle /></div>}
             <button className="mobile-menu-btn" onClick={() => setIsMenuOpen(true)}>
               <Menu size={24} />
             </button>
          </div>
        </div>
      </nav>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="drawer-overlay"
            />
            <motion.div 
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="mobile-drawer-ios glass-card"
            >
              <div className="drawer-header">
                <span className="ios-label">Navegación</span>
                <button onClick={() => setIsMenuOpen(false)} className="close-drawer">
                   <X size={24} />
                </button>
              </div>
              <div className="drawer-links">
                <a href="#inicio" onClick={() => setIsMenuOpen(false)}>Inicio</a>
                <a href="#especialidades" onClick={() => setIsMenuOpen(false)}>Servicios</a>
                <a href="#doctora" onClick={() => setIsMenuOpen(false)}>Información</a>
                <a href="#contacto" onClick={() => setIsMenuOpen(false)}>Contacto</a>
                <div style={{ marginTop: 'auto', paddingTop: '2rem' }}>
                   <a href={waLink} target="_blank" rel="noreferrer" className="btn-ios-pill large" style={{ width: '100%', justifyContent: 'center' }}>
                     <MessageCircle size={22} fill="currentColor" /> Agendar Cita
                   </a>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Hero Section */}
      <div className="desktop-hero-container">
        <section className="hero-ios ios-container" style={{ paddingTop: previewSettings ? '120px' : '180px' }}>
          <div className="hero-text-wrap">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="hero-pill glass-card">
              <Sparkles size={14} style={{ color: 'var(--primary)' }} />
              <span>{settings.brand?.giro || 'Servicios Profesionales'}</span>
            </motion.div>
            <h1 className="display-text animate-ios">{settings.hero?.title}</h1>
            <p className="hero-sub animate-ios" style={{ animationDelay: '0.2s' }}>{settings.hero?.subtitle}</p>
            <div className="hero-actions-ios animate-ios" style={{ animationDelay: '0.4s' }}>
              <a href={waLink} target="_blank" rel="noreferrer" className="btn-ios-large" style={{ textDecoration: 'none' }}>
                Agendar Cita <ArrowRight size={18} />
              </a>
            </div>
          </div>
          <div className="hero-visual-ios">
             <div className="visual-stack">
                <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} className="visual-card main-v glass-card">
                  <img src={settings.images?.hero || 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?q=80&w=2070&auto=format&fit=crop'} alt="Hero" />
                </motion.div>
             </div>
          </div>
        </section>
      </div>

      {/* Mobile Hero Section */}
      <div className="mobile-hero-container">
        <section className="hero-mobile">
          <div className="hero-mobile-visual">
            <img src={settings.images?.hero || 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?q=80&w=2070&auto=format&fit=crop'} alt="Hero Mobile" />
            <div className="hero-mobile-gradient"></div>
            
            {/* Floating Trust Elements */}
            <motion.div 
              initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.5 }}
              className="mobile-floating-card glass-card"
              style={{ bottom: '20%', right: '5%' }}
            >
              <div className="m-f-icon"><Award size={16} /></div>
              <div className="m-f-text">
                <strong>Servicio Premium</strong>
                <span>Calidad Garantizada</span>
              </div>
            </motion.div>

            <motion.div 
              initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.7 }}
              className="mobile-floating-card glass-card"
              style={{ bottom: '35%', left: '5%' }}
            >
              <div className="m-f-icon" style={{ background: 'rgba(37, 211, 102, 0.2)', color: '#25D366' }}><MessageCircle size={16} /></div>
              <div className="m-f-text">
                <strong>Atención 24/7</strong>
                <span>Vía WhatsApp</span>
              </div>
            </motion.div>
          </div>

          <div className="hero-mobile-content ios-container">
            <motion.div 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="hero-pill"
            >
              <Sparkles size={14} />
              <span>{settings.brand?.giro || 'Servicios Profesionales'}</span>
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="display-text"
            >
              {settings.hero?.title}
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="hero-sub"
            >
              {settings.hero?.subtitle}
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}
              className="hero-actions-ios"
              style={{ width: '100%' }}
            >
              <a href={waLink} target="_blank" rel="noreferrer" className="btn-ios-large" style={{ textDecoration: 'none', width: '100%', justifyContent: 'center' }}>
                Agendar Cita <ArrowRight size={18} />
              </a>
              <div className="trust-badges-mobile">
                <span>⭐ 4.9/5 valoración</span>
                <span className="dot">•</span>
                <span>+500 clientes felices</span>
              </div>
            </motion.div>
          </div>
        </section>
      </div>

      {/* Profile Section (Doctora) */}
      {settings.professional?.show !== 'no' && (
        <section id="doctora" className="profile-section ios-container">
          <div className="profile-grid">
             <div className="profile-photo glass-card">
                <img src={settings.images?.doctor || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=2070&auto=format&fit=crop'} alt="Especialista" className="doc-img" />
                <div className="doc-badge glass-card"><Award size={20} className="text-primary" /> {settings.brand?.doctor_name || 'Especialista'}</div>
             </div>
             <div className="profile-info">
                <span className="ios-label">Conoce a la Experta</span>
                <h2 className="display-text-sm">Atención basada en detalle y empatía.</h2>
                <p className="doc-bio">{settings.professional?.bio}</p>
             </div>
          </div>
        </section>
      )}

      {/* Services Grid */}
      <section id="especialidades" className="ios-container services-ios">
        <div className="section-head-ios">
          <h2 className="display-text-sm">{settings.services?.title}</h2>
          <p>{settings.services?.subtitle}</p>
        </div>
        <div className="ios-grid-services bento-grid">
          {settings.services_list?.length > 0 ? settings.services_list.map((s: any, i: number) => {
            // Lógica de Bento: El primero y el cuarto son más grandes
            const isFeatured = i === 0 || i === 3;
            const isWide = i === 4;
            
            return (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, y: 20 }} 
                whileInView={{ opacity: 1, y: 0 }} 
                transition={{ delay: i * 0.1 }} 
                className={`glass-card service-widget-premium bento-item ${isFeatured ? 'bento-featured' : ''} ${isWide ? 'bento-wide' : ''} ${s.image_url ? 'has-image' : ''}`}
                style={{ 
                  background: isFeatured ? 'rgba(var(--primary-rgb), 0.03)' : 'var(--glass-bg)',
                  borderColor: isFeatured ? 'var(--primary)' : 'var(--glass-border)'
                }}
              >
                {s.image_url && (
                  <div className="bento-image-wrap">
                    <img src={s.image_url} alt={s.name} />
                  </div>
                )}
                
                <div className="bento-header-info">
                  <div className="s-icon-ios" style={{ 
                    background: isFeatured ? 'var(--primary)' : 'var(--primary-light)',
                    color: isFeatured ? 'white' : 'var(--primary)'
                  }}>
                    {isFeatured ? <Award size={24} /> : <Sparkles size={20} />}
                  </div>
                  <div className="bento-content">
                    <h3 style={{ fontSize: isFeatured ? '1.5rem' : '1.15rem' }}>{s.name}</h3>
                    <p style={{ 
                      fontSize: '0.85rem', 
                      color: 'var(--text-muted)', 
                      lineHeight: 1.6,
                      display: '-webkit-box',
                      WebkitLineClamp: isFeatured ? 4 : 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {s.description}
                    </p>
                    {s.price && (
                      <div className="bento-price" style={{ 
                        marginTop: 'auto', 
                        paddingTop: '1.5rem', 
                        fontWeight: 800, 
                        color: 'var(--primary)',
                        fontSize: isFeatured ? '1.1rem' : '0.9rem'
                      }}>
                        Desde ${s.price}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          }) : (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', opacity: 0.5 }}>Cargando servicios...</div>
          )}
        </div>
      </section>

      {/* Casos Clínicos / Gallery */}
      {settings.gallery?.show !== 'no' && galleryImages.length > 0 && (
        <section id="casos" className="cases-section ios-container">
          <div className="section-head-ios">
            <span className="ios-label">Galería</span>
            <h2 className="display-text-sm">Casos y Resultados</h2>
          </div>
          <div className="gallery-grid">
            {galleryImages.map((img, i) => (
              <motion.div 
                key={i} 
                whileHover={{ scale: 1.02 }} 
                className="gallery-item glass-card"
                onClick={() => setSelectedImage(img)}
              >
                <img src={img} alt={`Galería ${i}`} />
                <div className="gallery-overlay"><Camera size={24} /></div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* FAQ Section */}
      {faqs.length > 0 && (
        <section className="faq-section ios-container">
          <div className="section-head-ios">
            <span className="ios-label">Dudas Comunes</span>
            <h2 className="display-text-sm">Preguntas Frecuentes</h2>
          </div>
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
        </section>
      )}

      {/* Map Section */}
      <section id="contacto" className="location-section ios-container">
        <div className="section-head-ios" style={{ textAlign: 'left', marginBottom: '2.5rem' }}>
          <span className="ios-label">Ubicación</span>
          <h2 className="display-text-sm">¿Cómo llegar?</h2>
        </div>
        <div className="location-grid glass-card">
           <div className="loc-info">
             <MapPin size={32} className="text-primary" />
             <h3 style={{fontSize: '1.5rem', margin: '1rem 0 0.5rem'}}>Dirección</h3>
             <p className="text-muted">{settings.contact?.address}</p>
             <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.contact?.address || '')}`} target="_blank" rel="noreferrer" className="btn-ios-pill" style={{ marginTop: '2rem', display: 'inline-flex', width: 'fit-content' }}>
               Abrir en Google Maps
             </a>
           </div>
           <div className="loc-map">
              <iframe 
                width="100%" height="100%" frameBorder="0" style={{ border: 0 }}
                src={`https://www.google.com/maps?q=${encodeURIComponent(settings.contact?.address || '')}&output=embed`}
                allowFullScreen
              />
           </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer-ios ios-container">
        <div className="footer-main">
          <div className="f-col">
            <h4 className="logo-ios">{settings.brand?.clinic_name}</h4>
            <p className="text-muted" style={{ fontSize: '0.85rem' }}>{settings.brand?.giro}</p>
          </div>
          <div className="f-col">
            <span className="ios-label">Enlaces</span>
            <a href="#inicio">Inicio</a>
            <a href="#especialidades">Servicios</a>
            <a href="#doctora">Información</a>
            <a href="#contacto">Contacto</a>
          </div>
          <div className="f-col">
            <span className="ios-label">Atención</span>
            <span className="text-muted" style={{ fontSize: '0.9rem' }}>{settings.contact?.phone}</span>
          </div>
        </div>
        <div className="footer-bottom-ios">
          <span>&copy; 2026 {settings.brand?.clinic_name}. Todos los derechos reservados.</span>
        </div>
      </footer>

      {/* WhatsApp Floating */}
      <a href={waLink} target="_blank" rel="noreferrer" className="wa-ios-widget" style={{ textDecoration: 'none' }}>
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="wa-floating-bubble glass-card">
          ¡Hola! Agenda aquí 👇
        </motion.div>
        <div className="wa-ios-btn">
          <img src="/whatsapp.png" alt="WA" className="wa-img-white" />
        </div>
      </a>

      <style>{`
        .landing-ios-premium { background: var(--bg-app); color: var(--text-primary); }
        .ios-container { max-width: 1200px; margin: 0 auto; padding: 0 2rem; }
        .glass-nav { height: 80px; display: flex; align-items: center; width: 100%; top: 0; z-index: 1000; background: rgba(var(--bg-app-rgb), 0.7); backdrop-filter: blur(20px); border-bottom: 1px solid var(--glass-border); }
        .nav-flex { display: flex; justify-content: space-between; align-items: center; width: 100%; }
        .nav-links-ios { display: flex; align-items: center; gap: 2rem; }
        .nav-links-ios a { text-decoration: none; color: var(--text-secondary); font-weight: 600; font-size: 0.9rem; }
        .nav-actions-mobile { display: none; align-items: center; gap: 0.5rem; }
        .mobile-menu-btn { display: flex; background: var(--glass-bg); color: var(--text-primary); border: 1px solid var(--glass-border); padding: 0.5rem; border-radius: 12px; cursor: pointer; align-items: center; justify-content: center; width: 44px; height: 44px; }
        .drawer-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.3); backdrop-filter: blur(8px); z-index: 1999; }
        .mobile-drawer-ios { position: fixed; top: 0; right: 0; width: 85%; height: 100vh; z-index: 2000; padding: 2.5rem; display: flex; flex-direction: column; border-radius: 0; border-left: 1px solid var(--glass-border); background: var(--bg-app); }
        .drawer-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 3.5rem; }
        .close-drawer { background: var(--bg-app); border: 1px solid var(--glass-border); width: 44px; height: 44px; border-radius: 50%; color: var(--text-primary); cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .drawer-links { display: flex; flex-direction: column; gap: 1.75rem; flex: 1; }
        .drawer-links a { text-decoration: none; color: var(--text-primary); font-size: 1.75rem; font-weight: 800; letter-spacing: -0.02em; }

        .hero-ios { display: grid; grid-template-columns: 1fr 1fr; gap: 4rem; align-items: center; min-height: 80vh; }
        .hero-pill { 
          display: inline-flex; 
          align-items: center; 
          gap: 0.75rem; 
          padding: 0.6rem 1.25rem; 
          border-radius: 100px; 
          font-size: 0.85rem; 
          font-weight: 700; 
          margin-bottom: 2.5rem; 
          color: var(--primary);
          background: var(--primary-light);
          border: 1px solid var(--primary);
        }
        .display-text { font-size: 4.2rem; font-weight: 900; line-height: 1.05; letter-spacing: -0.04em; }
        .hero-sub { font-size: 1.15rem; color: var(--text-muted); margin: 1.5rem 0 2.5rem; line-height: 1.5; max-width: 600px; }
        
        .btn-ios-pill { 
          background: var(--primary); 
          color: white; 
          padding: 0.7rem 1.4rem; 
          border-radius: 100px; 
          font-weight: 700; 
          font-size: 0.85rem; 
          display: inline-flex; 
          align-items: center; 
          gap: 0.5rem; 
          border: none; 
          text-decoration: none;
          transition: 0.3s;
          box-shadow: 0 4px 12px var(--primary-glow);
        }
        .btn-ios-pill:hover { transform: translateY(-2px); box-shadow: 0 8px 20px var(--primary-glow); }
        .btn-ios-pill.large { padding: 1rem 2.2rem; font-size: 1.05rem; }

        .main-v { border-radius: 40px; overflow: hidden; aspect-ratio: 4/3; box-shadow: 0 30px 60px rgba(0,0,0,0.1); }
        .main-v img { width: 100%; height: 100%; object-fit: cover; }

        .profile-section { padding: 100px 0; }
        .profile-grid { display: grid; grid-template-columns: 1fr 1.2fr; gap: 4rem; align-items: center; }
        .profile-photo { padding: 0.8rem; border-radius: 32px; position: relative; }
        .doc-img { width: 100%; border-radius: 24px; }
        .doc-badge { position: absolute; bottom: -8px; right: -8px; padding: 1rem 1.75rem; border-radius: 18px; font-weight: 700; display: flex; align-items: center; gap: 0.6rem; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }

        .services-ios { padding: 100px 0; }
        .section-head-ios { text-align: center; margin-bottom: 4rem; }
        .display-text-sm { font-size: 3.2rem; font-weight: 800; letter-spacing: -0.03em; line-height: 1.1; }
        
        .bento-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          grid-auto-rows: 1fr;
          gap: 1.25rem;
        }
        .bento-item {
          display: flex;
          flex-direction: column;
          padding: 2.25rem;
          border-radius: 28px;
          height: 100%;
          transition: 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .bento-featured {
          grid-column: span 2;
          grid-row: span 1;
        }
        .bento-wide {
          grid-column: span 2;
        }

        .bento-item.has-image {
          padding: 0;
          overflow: hidden;
        }
        .bento-image-wrap {
          height: 170px;
          width: 100%;
          overflow: hidden;
          position: relative;
        }
        .bento-featured .bento-image-wrap {
          height: 200px;
        }
        .bento-image-wrap img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: 0.6s;
        }
        .bento-item:hover .bento-image-wrap img {
          transform: scale(1.05);
        }
        .bento-header-info {
          padding: 2.25rem;
          display: flex;
          flex-direction: column;
          flex: 1;
        }
        .desktop-hero-container { display: block; }
        .mobile-hero-container { display: none; }
        
        .service-widget-premium:hover { transform: translateY(-12px); box-shadow: 0 30px 60px rgba(0,0,0,0.08); }
        .s-icon-ios { width: 56px; height: 56px; background: var(--primary-light); color: var(--primary); border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; }

        .gallery-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 2rem; }
        .gallery-item { border-radius: 28px; overflow: hidden; position: relative; aspect-ratio: 1; cursor: pointer; box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
        .gallery-item img { width: 100%; height: 100%; object-fit: cover; transition: 0.6s; }
        .gallery-item:hover img { scale: 1.1; }
        .gallery-overlay { position: absolute; inset: 0; background: rgba(var(--primary-rgb), 0.2); backdrop-filter: blur(4px); opacity: 0; display: flex; align-items: center; justify-content: center; color: white; transition: 0.3s; }
        .gallery-item:hover .gallery-overlay { opacity: 1; }

        .accordion-list { max-width: 900px; margin: 4rem auto; display: flex; flex-direction: column; gap: 1.5rem; }
        .accordion-item { padding: 1.75rem 2rem; border-radius: 24px; cursor: pointer; transition: 0.3s; border: 1px solid var(--glass-border); }
        .accordion-item:hover { background: rgba(var(--bg-app-rgb), 0.5); }
        .acc-head { display: flex; justify-content: space-between; align-items: center; }
        .acc-head h4 { font-size: 1.15rem; font-weight: 700; }
        .acc-icon { transition: 0.4s cubic-bezier(0.4, 0, 0.2, 1); color: var(--primary); }
        .accordion-item.open { border-color: var(--primary); box-shadow: 0 10px 30px var(--primary-glow); }
        .accordion-item.open .acc-icon { transform: rotate(180deg); }
        .acc-body { padding-top: 1.25rem; color: var(--text-muted); line-height: 1.6; }

        .location-grid { display: grid; grid-template-columns: 1fr 1.5fr; min-height: 500px; border-radius: 40px; overflow: hidden; box-shadow: 0 40px 80px rgba(0,0,0,0.1); border: 1px solid var(--glass-border); }
        .loc-info { padding: 4rem; display: flex; flex-direction: column; justify-content: center; }
        .loc-map { background: #eee; }

        .footer-ios { padding: 6rem 0 3rem; border-top: 1px solid var(--glass-border); }
        .footer-main { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 4rem; }
        .f-col { display: flex; flex-direction: column; gap: 1rem; }
        .f-col a { text-decoration: none; color: var(--text-muted); }
        .footer-bottom-ios { margin-top: 4rem; text-align: center; color: var(--text-muted); font-size: 0.8rem; border-top: 1px solid var(--glass-border); padding-top: 2rem; }

        .wa-ios-widget { position: fixed; bottom: 30px; right: 30px; z-index: 1000; display: flex; flex-direction: column; align-items: flex-end; gap: 1rem; }
        .wa-floating-bubble { padding: 1rem 1.5rem; border-radius: 20px; font-weight: 700; border-bottom-right-radius: 4px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
        .wa-ios-btn { width: 64px; height: 64px; background: #25d366; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 15px 35px rgba(37,211,102,0.5); transition: 0.3s; }
        .wa-ios-btn:hover { transform: scale(1.1) rotate(5deg); }
        .wa-img-white { width: 34px; height: 34px; filter: brightness(0) invert(1); }

        .ios-label { 
          display: block; 
          text-transform: uppercase; 
          letter-spacing: 0.15em; 
          font-size: 0.75rem; 
          font-weight: 800; 
          color: var(--primary); 
          margin-bottom: 1rem; 
        }

        @media (max-width: 1024px) {
          .bento-grid { grid-template-columns: repeat(2, 1fr); }
          .bento-featured, .bento-wide { grid-column: span 2; }
          .display-text { font-size: 3.5rem; }
          .display-text-sm { font-size: 2.8rem; }
        }
        @media (max-width: 768px) {
          .desktop-hero-container { display: none; }
          .mobile-hero-container { display: block; }
          .hero-mobile { position: relative; padding-top: 60px; padding-bottom: 2.5rem; }
          .hero-mobile-visual { position: relative; width: 100%; height: 50vh; max-height: 450px; border-bottom-left-radius: 50px; border-bottom-right-radius: 50px; overflow: hidden; box-shadow: 0 15px 30px rgba(0,0,0,0.1); }
          .hero-mobile-visual img { width: 100%; height: 100%; object-fit: cover; }
          .hero-mobile-gradient { position: absolute; bottom: 0; left: 0; width: 100%; height: 75%; background: linear-gradient(to top, var(--bg-app), transparent); }
          
          .mobile-floating-card { position: absolute; display: flex; align-items: center; gap: 8px; padding: 0.6rem 0.9rem; border-radius: 16px; z-index: 5; backdrop-filter: blur(12px); border: 1px solid var(--glass-border); background: rgba(var(--bg-app-rgb), 0.5); box-shadow: 0 8px 20px rgba(0,0,0,0.1); }
          .m-f-icon { width: 28px; height: 28px; border-radius: 50%; background: var(--primary-light); color: var(--primary); display: flex; align-items: center; justify-content: center; }
          .m-f-text { display: flex; flex-direction: column; line-height: 1.1; }
          .m-f-text strong { font-size: 0.7rem; font-weight: 800; color: var(--text-primary); }
          .m-f-text span { font-size: 0.6rem; color: var(--text-muted); }

          .hero-mobile-content { position: relative; z-index: 10; margin-top: -4.5rem; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 1rem; padding-bottom: 1.5rem; }
          .hero-mobile-content .hero-pill { border-radius: 100px; background: var(--primary-light); border: 1px solid var(--primary); color: var(--primary); padding: 0.4rem 0.9rem; font-size: 0.7rem; font-weight: 700; margin-bottom: 0.25rem; display: flex; align-items: center; gap: 6px; }
          .hero-mobile-content .display-text { font-size: 2.25rem; margin: 0; line-height: 1.1; letter-spacing: -0.02em; }
          .hero-mobile-content .hero-sub { margin-top: 0; margin-bottom: 0.75rem; font-size: 0.95rem; color: var(--text-muted); padding: 0 0.5rem; line-height: 1.5; }
          
          .trust-badges-mobile { display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 1rem; font-size: 0.75rem; font-weight: 600; color: var(--text-muted); }
          .trust-badges-mobile .dot { color: var(--primary); font-size: 1rem; }

          .bento-grid { grid-template-columns: 1fr; gap: 1rem; }
          .bento-item { padding: 1.5rem; min-height: auto; }
          .bento-item h3 { font-size: 1.5rem; margin-bottom: 0.75rem; }
          .display-text { font-size: 2.25rem; }
        }

        .btn-ios-large { 
          background: linear-gradient(135deg, var(--primary), var(--accent)); 
          color: white; 
          padding: 1.4rem 3.5rem; 
          border-radius: 24px; 
          font-weight: 800; 
          font-size: 1.2rem; 
          display: inline-flex; 
          align-items: center; 
          gap: 1rem; 
          box-shadow: 0 20px 40px var(--primary-glow); 
          transition: 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); 
        }
        .btn-ios-large:hover { 
          transform: translateY(-6px) scale(1.03); 
          box-shadow: 0 30px 60px var(--primary-glow); 
        }

        /* Lightbox & Gallery */
        .lightbox-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.9); backdrop-filter: blur(10px); z-index: 3000; display: flex; align-items: center; justify-content: center; padding: 2rem; cursor: zoom-out; }
        .lightbox-img { max-width: 100%; max-height: 90vh; border-radius: 20px; box-shadow: 0 0 50px rgba(0,0,0,0.5); }
        .close-lightbox { position: absolute; top: 2rem; right: 2rem; background: rgba(255,255,255,0.1); border: none; color: white; cursor: pointer; width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }

        @media (max-width: 1024px) {
          .hero-ios, .profile-grid, .location-grid, .footer-main { grid-template-columns: 1fr; gap: 3rem; }
          .display-text { font-size: 3.5rem; }
          .hero-ios { text-align: center; gap: 3rem; }
          .hero-sub { margin: 1.5rem auto 2.5rem; }
          .hero-text-wrap { display: flex; flex-direction: column; align-items: center; }
          .loc-map { height: 350px; }
          .loc-info { padding: 3rem 1.5rem; text-align: center; align-items: center; }
        }

        @media (max-width: 768px) {
          .nav-links-ios { display: none; }
          .nav-actions-mobile { display: flex; align-items: center; gap: 0.75rem; }
          .logo-ios { flex: 1; min-width: 0; }
          .logo-ios img { max-width: 180px; height: 36px !important; object-fit: contain; }
          .display-text { font-size: 2.75rem; letter-spacing: -0.03em; }
          .display-text-sm { font-size: 2.25rem; }
          .ios-container { padding: 0 1.25rem; }
          .hero-ios { padding-top: 100px; padding-bottom: 4rem; }
          .btn-ios-large { width: 100%; padding: 1.25rem 2rem; font-size: 1.1rem; justify-content: center; }
          .profile-section, .services-ios, .cases-section, .faq-section { padding: 4rem 0; }
          .section-head-ios { margin-bottom: 3rem; }
          .bento-grid { grid-template-columns: 1fr; gap: 1rem; }
          .bento-item { padding: 1.5rem; }
          .bento-header-info { padding: 1.5rem; }
          .gallery-grid { grid-template-columns: repeat(2, 1fr); gap: 0.75rem; }
          .accordion-item { padding: 1.25rem 1.5rem; }
          .footer-main { gap: 2.5rem; }
          .wa-ios-widget { bottom: 20px; right: 20px; }
          .wa-floating-bubble { display: none; }
          .mobile-theme-wrap { display: flex; }
        }
        @media (max-width: 480px) {
          .display-text { font-size: 2.25rem; }
          .gallery-grid { grid-template-columns: 1fr; }
          .doc-badge { padding: 1rem; font-size: 0.8rem; }
        }
      `}</style>
    </div>
  );
};

export default Landing;

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  MessageCircle, 
  Calendar, 
  Globe, 
  CheckCircle, 
  ChevronRight, 
  X,
  Users
} from 'lucide-react';

const STEPS = [
  {
    title: '¡Bienvenida a tu CRM!',
    description: 'Hemos diseñado este espacio para que gestiones tu negocio de forma sencilla y profesional. Olvida lo técnico, nosotros nos encargamos.',
    icon: <Sparkles size={48} className="text-primary" />,
    color: 'blue'
  },
  {
    title: 'Chat con IA',
    description: 'Tus clientes te escribirán por WhatsApp y nuestra IA les responderá automáticamente. Puedes intervenir en cualquier momento.',
    icon: <MessageCircle size={48} style={{ color: '#25D366' }} />,
    color: 'green',
    targetSelector: 'a[href="/admin/conversations"]'
  },
  {
    title: 'Agenda Inteligente',
    description: 'Visualiza tus citas o pedidos del día. La IA agendará automáticamente a quienes lo soliciten por chat.',
    icon: <Calendar size={48} style={{ color: '#5856D6' }} />,
    color: 'purple',
    targetSelector: 'a[href="/admin/calendar"]'
  },
  {
    title: 'Contactos y Leads',
    description: 'Aquí verás a todos tus clientes potenciales en un tablero Kanban. Arrastra y suelta para organizar tu pipeline de ventas.',
    icon: <Users size={48} style={{ color: '#FF9500' }} />,
    color: 'orange',
    targetSelector: 'a[href="/admin/contacts"]'
  },
  {
    title: 'Tu Propia Web',
    description: 'En el Editor Web puedes personalizar tu página de aterrizaje en segundos. Cambia textos, fotos y colores con un par de clics.',
    icon: <Globe size={48} style={{ color: '#007AFF' }} />,
    color: 'blue',
    targetSelector: 'a[href="/admin/web-editor"]'
  },
  {
    title: 'Todo Listo',
    description: 'Estás lista para transformar la atención de tu negocio.',
    icon: <CheckCircle size={48} style={{ color: '#34C759' }} />,
    color: 'green'
  }
];

export const Onboarding = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const hasSeen = localStorage.getItem('onboarding_v2');
    if (!hasSeen) {
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    // Limpiar highlights previos
    document.querySelectorAll('.onboarding-highlight').forEach(el => {
      el.classList.remove('onboarding-highlight');
    });

    if (isVisible) {
      const step = STEPS[currentStep];
      if (step.targetSelector) {
        const el = document.querySelector(step.targetSelector);
        if (el) {
          el.classList.add('onboarding-highlight');
        }
      }
    }

    return () => {
      document.querySelectorAll('.onboarding-highlight').forEach(el => {
        el.classList.remove('onboarding-highlight');
      });
    };
  }, [currentStep, isVisible]);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem('onboarding_v2', 'true');
  };

  if (!isVisible) return null;

  const step = STEPS[currentStep];

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="onboarding-overlay">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="onboarding-card glass-card"
          >
            <button className="close-onboarding" onClick={handleClose}>
              <X size={20} />
            </button>

            <div className="onboarding-content">
              <motion.div 
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="step-visual"
              >
                <div className={`icon-wrapper ${step.color}`}>
                  {step.icon}
                </div>
              </motion.div>

              <div className="step-text">
                <h2 className="step-title">{step.title}</h2>
                <p className="step-desc">{step.description}</p>
              </div>

              <div className="onboarding-footer">
                <div className="step-indicators">
                  {STEPS.map((_, i) => (
                    <div 
                      key={i} 
                      className={`dot ${i === currentStep ? 'active' : ''}`} 
                    />
                  ))}
                </div>
                
                <button className="btn-next-step" onClick={handleNext}>
                  {currentStep === STEPS.length - 1 ? 'Empezar ahora' : 'Siguiente'}
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </motion.div>

          <style>{`
            .onboarding-overlay {
              position: fixed;
              inset: 0;
              background: rgba(0, 0, 0, 0.4);
              backdrop-filter: blur(8px);
              z-index: 9999;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 2rem;
            }
            .onboarding-card {
              width: 100%;
              max-width: 480px;
              background: var(--bg-app);
              border-radius: 32px;
              padding: 3rem 2rem 2rem;
              position: relative;
              box-shadow: 0 30px 60px rgba(0,0,0,0.2);
              border: 1px solid var(--glass-border);
            }
            .close-onboarding {
              position: absolute;
              top: 1.5rem;
              right: 1.5rem;
              background: var(--bg-surface);
              border: 1px solid var(--glass-border);
              color: var(--text-muted);
              width: 36px;
              height: 36px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
              transition: 0.2s;
            }
            .close-onboarding:hover {
              background: var(--primary-light);
              color: var(--primary);
              transform: rotate(90deg);
            }
            .onboarding-content {
              display: flex;
              flex-direction: column;
              align-items: center;
              text-align: center;
            }
            .icon-wrapper {
              width: 100px;
              height: 100px;
              border-radius: 30px;
              display: flex;
              align-items: center;
              justify-content: center;
              margin-bottom: 2rem;
              background: var(--bg-surface);
              box-shadow: inset 0 0 20px rgba(0,0,0,0.05);
            }
            .icon-wrapper.blue { background: rgba(0, 122, 255, 0.1); }
            .icon-wrapper.green { background: rgba(52, 199, 89, 0.1); }
            .icon-wrapper.purple { background: rgba(88, 86, 214, 0.1); }

            .step-title {
              font-size: 1.75rem;
              font-weight: 800;
              margin-bottom: 1rem;
              letter-spacing: -0.5px;
            }
            .step-desc {
              font-size: 1rem;
              line-height: 1.6;
              color: var(--text-secondary);
              margin-bottom: 2.5rem;
              padding: 0 1rem;
            }
            .onboarding-footer {
              width: 100%;
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 1.5rem;
            }
            .step-indicators {
              display: flex;
              gap: 0.5rem;
            }
            .dot {
              width: 8px;
              height: 8px;
              border-radius: 4px;
              background: var(--glass-border);
              transition: 0.3s;
            }
            .dot.active {
              width: 24px;
              background: var(--primary);
            }
            .btn-next-step {
              width: 100%;
              padding: 1rem;
              border-radius: 16px;
              background: var(--primary);
              color: white;
              font-weight: 700;
              font-size: 1rem;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 0.5rem;
              border: none;
              cursor: pointer;
              transition: 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
              box-shadow: 0 10px 20px var(--primary-glow);
            }
            .btn-next-step:hover {
              transform: translateY(-2px);
              box-shadow: 0 15px 30px var(--primary-glow);
            }
            @media (max-width: 480px) {
              .onboarding-card { padding: 2.5rem 1.5rem 1.5rem; border-radius: 24px; }
              .step-title { font-size: 1.5rem; }
            }

            /* GLOBAL HIGHLIGHT CLASS */
            :global(.onboarding-highlight) {
              position: relative !important;
              z-index: 10000 !important;
              box-shadow: 0 0 0 4px var(--primary) !important;
              background: var(--bg-surface) !important;
              border-radius: 12px;
              transition: all 0.3s ease;
              pointer-events: none;
            }
          `}</style>
        </div>
      )}
    </AnimatePresence>
  );
};

import React, { useState, useEffect, useCallback } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  X,
  ExternalLink,
  Bot,
  User,
  CalendarCheck,
  Trash2,
  RefreshCw,
  Clock
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = '';
const getToken = () => localStorage.getItem('crm_token') || '';

const CalendarPage = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    patient_name: '',
    appointment_date: '',
    appointment_time: '09:00',
    description: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/appointments`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (!res.ok) throw new Error('Error al obtener citas');
      const data = await res.json();
      // Normalizar fechas
      const normalized = data.map((a: any) => ({
        ...a,
        date: new Date(a.appointment_date || a.date),
        time: a.time || new Date(a.appointment_date).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true }),
        patient: a.patient || a.patient_name || 'Sin nombre',
        type: a.type || a.description || 'Cita',
      }));
      setAppointments(normalized);
    } catch (err: any) {
      console.error('Error cargando citas:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patient_name || !form.appointment_date) {
      setError('Nombre y fecha son requeridos');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const isoDate = `${form.appointment_date}T${form.appointment_time}:00`;
      const res = await fetch(`${API_BASE}/api/appointments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          patient_name: form.patient_name,
          appointment_date: isoDate,
          description: form.description || `Cita: ${form.patient_name}`,
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar');
      setShowModal(false);
      setForm({ patient_name: '', appointment_date: '', appointment_time: '09:00', description: '' });
      fetchAppointments();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string | number) => {
    if (String(id).startsWith('gcal_')) {
      alert('Este evento es de Google Calendar. Elimínalo directamente desde Google Calendar.');
      return;
    }
    if (!confirm('¿Cancelar esta cita? Se eliminará también de Google Calendar.')) return;
    setDeletingId(String(id));
    try {
      await fetch(`${API_BASE}/api/appointments/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      fetchAppointments();
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const selectedApps = appointments.filter(a => isSameDay(a.date, selectedDay));

  const sourceIcon = (source: string) => {
    if (source === 'bot') return <Bot size={14} className="cal-source-icon bot" />;
    if (source === 'google') return <CalendarCheck size={14} className="cal-source-icon google" />;
    return <User size={14} className="cal-source-icon manual" />;
  };

  const sourceLabel = (source: string) => {
    if (source === 'bot') return 'Bot IA';
    if (source === 'google') return 'Google Calendar';
    return 'Manual';
  };

  return (
    <div className="calendar-ios animate-ios">
      {/* HEADER */}
      <header className="calendar-controls-ios">
        <div className="c-left">
          <div className="date-display">
            <h1 className="month-name">{format(currentDate, 'MMMM', { locale: es })}</h1>
            <span className="year-name">{format(currentDate, 'yyyy')}</span>
          </div>
          <div className="nav-arrows glass-card">
            <button onClick={() => setCurrentDate(subMonths(currentDate, 1))}><ChevronLeft size={18} /></button>
            <div className="divider" />
            <button onClick={() => setCurrentDate(addMonths(currentDate, 1))}><ChevronRight size={18} /></button>
          </div>
        </div>
        <div className="c-right">
          <button className="refresh-btn" onClick={fetchAppointments} title="Sincronizar">
            <RefreshCw size={16} className={loading ? 'spinning' : ''} />
          </button>
          <button className="add-event-btn" onClick={() => setShowModal(true)}>
            <Plus size={20} />
            <span>Nueva Cita</span>
          </button>
        </div>
      </header>

      {/* LEYENDA */}
      <div className="cal-legend">
        <span className="legend-item"><span className="dot bot" />Bot IA</span>
        <span className="legend-item"><span className="dot manual" />Manual</span>
        <span className="legend-item"><span className="dot google" />Google Calendar</span>
      </div>

      {/* GRID + SIDEBAR */}
      <main className="calendar-grid-layout">
        <div className="calendar-main-container glass-card">
          <div className="grid-header-ios">
            {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
              <div key={d} className="ios-label day-label">{d}</div>
            ))}
          </div>
          <div className="grid-body-ios">
            {days.map(day => {
              const dayApps = appointments.filter(a => isSameDay(a.date, day));
              const isSelected = isSameDay(day, selectedDay);
              const isToday = isSameDay(day, new Date());
              const isDiffMonth = !isSameMonth(day, monthStart);
              return (
                <div
                  key={day.toString()}
                  onClick={() => setSelectedDay(day)}
                  className={`grid-cell ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''} ${isDiffMonth ? 'diff-month' : ''}`}
                >
                  <span className="cell-number">{format(day, 'd')}</span>
                  <div className="cell-events">
                    {dayApps.slice(0, 3).map((app, i) => (
                      <div key={i} className={`event-dot ${app.source}`} title={app.patient} />
                    ))}
                    {dayApps.length > 3 && <div className="event-dot-more">+{dayApps.length - 3}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* PANEL LATERAL */}
        <aside className="calendar-details-ios">
          <div className="details-header">
            <h3>Eventos del Día</h3>
            <span className="ios-label">{format(selectedDay, "d 'de' MMMM", { locale: es })}</span>
          </div>

          <div className="events-list-ios">
            <AnimatePresence>
              {selectedApps.length > 0 ? (
                selectedApps.map((app, idx) => (
                  <motion.div
                    key={app.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ delay: idx * 0.06 }}
                    className={`event-card-ios glass-card source-${app.source}`}
                  >
                    <div className="e-time">
                      <Clock size={11} />
                      {app.time}
                    </div>
                    <div className="e-info">
                      <strong>{app.patient}</strong>
                      <span>{app.type}</span>
                      <div className="e-source-badge">
                        {sourceIcon(app.source)}
                        {sourceLabel(app.source)}
                      </div>
                    </div>
                    <div className="e-actions">
                      {app.google_event_url && (
                        <a href={app.google_event_url} target="_blank" rel="noopener noreferrer" className="e-action-btn link" title="Ver en Google Calendar">
                          <ExternalLink size={14} />
                        </a>
                      )}
                      <button
                        className="e-action-btn delete"
                        onClick={() => handleDelete(app.id)}
                        disabled={deletingId === String(app.id)}
                        title="Cancelar cita"
                      >
                        {deletingId === String(app.id) ? <RefreshCw size={14} className="spinning" /> : <Trash2 size={14} />}
                      </button>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="empty-events">
                  <CalendarCheck size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                  <p>Sin citas para este día</p>
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Estadística rápida */}
          <div className="cal-stats glass-card">
            <div className="stat-item">
              <span className="stat-num">{appointments.filter(a => isSameDay(a.date, new Date())).length}</span>
              <span className="stat-label">Hoy</span>
            </div>
            <div className="stat-item">
              <span className="stat-num">{appointments.filter(a => a.source === 'bot').length}</span>
              <span className="stat-label">Por Bot</span>
            </div>
            <div className="stat-item">
              <span className="stat-num">{appointments.length}</span>
              <span className="stat-label">Total</span>
            </div>
          </div>
        </aside>
      </main>

      {/* MODAL NUEVA CITA */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
          >
            <motion.div
              className="modal-box glass-card"
              initial={{ scale: 0.9, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 40 }}
            >
              <div className="modal-header">
                <h3><Plus size={18} /> Nueva Cita</h3>
                <button className="modal-close" onClick={() => setShowModal(false)}><X size={20} /></button>
              </div>
              <form onSubmit={handleCreate} className="modal-form">
                <label>
                  Nombre del Paciente *
                  <input
                    type="text"
                    placeholder="Ej: Juan García"
                    value={form.patient_name}
                    onChange={e => setForm(f => ({ ...f, patient_name: e.target.value }))}
                    required
                  />
                </label>
                <div className="form-row">
                  <label>
                    Fecha *
                    <input
                      type="date"
                      value={form.appointment_date}
                      onChange={e => setForm(f => ({ ...f, appointment_date: e.target.value }))}
                      required
                    />
                  </label>
                  <label>
                    Hora *
                    <input
                      type="time"
                      value={form.appointment_time}
                      onChange={e => setForm(f => ({ ...f, appointment_time: e.target.value }))}
                    />
                  </label>
                </div>
                <label>
                  Descripción / Servicio
                  <input
                    type="text"
                    placeholder="Ej: Limpieza dental, Ortodoncia..."
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  />
                </label>
                {error && <div className="form-error">{error}</div>}
                <div className="modal-note">
                  <CalendarCheck size={14} />
                  La cita se creará automáticamente en Google Calendar si está conectado.
                </div>
                <button type="submit" className="add-event-btn" disabled={saving} style={{ width: '100%', justifyContent: 'center' }}>
                  {saving ? <RefreshCw size={16} className="spinning" /> : <Plus size={16} />}
                  {saving ? 'Guardando...' : 'Crear Cita'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .calendar-ios { display: flex; flex-direction: column; gap: 1.5rem; }
        .calendar-controls-ios { display: flex; justify-content: space-between; align-items: center; }
        .c-left { display: flex; align-items: center; gap: 2rem; }
        .date-display { display: flex; flex-direction: column; }
        .month-name { font-size: 2.2rem; font-weight: 800; text-transform: capitalize; line-height: 1; }
        .year-name { font-size: 1.1rem; font-weight: 600; color: var(--text-muted); }
        .nav-arrows { display: flex; align-items: center; padding: 0.5rem; }
        .nav-arrows button { padding: 0.5rem; border-radius: 8px; color: var(--text-primary); }
        .nav-arrows button:hover { background: var(--bg-app); }
        .nav-arrows .divider { width: 1px; height: 20px; background: var(--glass-border); margin: 0 0.5rem; }
        .c-right { display: flex; align-items: center; gap: 1rem; }
        .refresh-btn { padding: 0.7rem; border-radius: 50%; color: var(--text-secondary); background: var(--glass); transition: var(--transition); }
        .refresh-btn:hover { color: var(--text-primary); background: var(--bg-app); }
        .add-event-btn { background: var(--primary); color: white; padding: 0.75rem 1.5rem; border-radius: var(--radius-full); font-weight: 700; display: flex; align-items: center; gap: 0.75rem; box-shadow: 0 8px 16px var(--primary-light); }

        .cal-legend { display: flex; gap: 1.5rem; align-items: center; font-size: 0.8rem; color: var(--text-muted); }
        .legend-item { display: flex; align-items: center; gap: 0.4rem; }
        .dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
        .dot.bot { background: var(--primary); }
        .dot.manual { background: var(--accent, #34c759); }
        .dot.google { background: #ea4335; }

        .calendar-grid-layout { display: grid; grid-template-columns: 1fr 340px; gap: 1.5rem; height: calc(100vh - 240px); }
        .calendar-main-container { display: flex; flex-direction: column; overflow: hidden; }
        .grid-header-ios { display: grid; grid-template-columns: repeat(7, 1fr); border-bottom: 1px solid var(--glass-border); }
        .day-label { padding: 1rem; text-align: center; font-size: 0.75rem; }
        .grid-body-ios { flex: 1; display: grid; grid-template-columns: repeat(7, 1fr); auto-rows: 1fr; overflow-y: auto; }
        .grid-cell { border-right: 1px solid var(--glass-border); border-bottom: 1px solid var(--glass-border); padding: 0.75rem; cursor: pointer; transition: var(--transition); display: flex; flex-direction: column; align-items: center; gap: 0.25rem; }
        .grid-cell:hover { background: var(--bg-app); }
        .grid-cell.diff-month { opacity: 0.25; }
        .grid-cell.selected { background: color-mix(in srgb, var(--primary) 12%, transparent); }
        .grid-cell.today .cell-number { background: var(--primary); color: white; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: 50%; }
        .cell-number { font-size: 0.85rem; font-weight: 700; }
        .cell-events { display: flex; gap: 3px; flex-wrap: wrap; justify-content: center; }
        .event-dot { width: 6px; height: 6px; border-radius: 50%; }
        .event-dot.bot { background: var(--primary); }
        .event-dot.manual { background: var(--accent, #34c759); }
        .event-dot.google { background: #ea4335; }
        .event-dot-more { font-size: 0.55rem; color: var(--text-muted); font-weight: 700; }

        .calendar-details-ios { display: flex; flex-direction: column; gap: 1rem; overflow: hidden; }
        .details-header { display: flex; flex-direction: column; gap: 0.15rem; }
        .details-header h3 { font-size: 1.15rem; font-weight: 700; }
        .events-list-ios { display: flex; flex-direction: column; gap: 0.6rem; flex: 1; overflow-y: auto; padding-right: 4px; }
        
        .event-card-ios { padding: 1rem; display: flex; align-items: flex-start; gap: 0.75rem; border-left: 3px solid transparent; }
        .event-card-ios.source-bot { border-left-color: var(--primary); }
        .event-card-ios.source-manual { border-left-color: var(--accent, #34c759); }
        .event-card-ios.source-google { border-left-color: #ea4335; }
        
        .e-time { font-size: 0.7rem; font-weight: 800; color: var(--primary); width: 60px; display: flex; flex-direction: column; align-items: center; gap: 2px; padding-top: 2px; }
        .e-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
        .e-info strong { font-size: 0.85rem; }
        .e-info span { font-size: 0.72rem; color: var(--text-muted); }
        .e-source-badge { display: flex; align-items: center; gap: 4px; font-size: 0.65rem; color: var(--text-muted); margin-top: 4px; }
        .e-actions { display: flex; flex-direction: column; gap: 4px; }
        .e-action-btn { padding: 0.35rem; border-radius: 8px; color: var(--text-muted); transition: var(--transition); display: flex; }
        .e-action-btn.link:hover { color: var(--primary); background: var(--glass); }
        .e-action-btn.delete:hover { color: #ff3b30; background: rgba(255,59,48,0.1); }
        
        .cal-source-icon.bot { color: var(--primary); }
        .cal-source-icon.google { color: #ea4335; }
        .cal-source-icon.manual { color: var(--accent, #34c759); }

        .empty-events { color: var(--text-muted); font-size: 0.85rem; text-align: center; padding: 2rem 1rem; display: flex; flex-direction: column; align-items: center; }
        
        .cal-stats { padding: 1rem 1.5rem; display: flex; justify-content: space-around; }
        .stat-item { display: flex; flex-direction: column; align-items: center; gap: 2px; }
        .stat-num { font-size: 1.5rem; font-weight: 800; color: var(--text-primary); }
        .stat-label { font-size: 0.65rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }

        /* MODAL */
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .modal-box { width: 480px; max-width: 95vw; border-radius: 24px; padding: 2rem; }
        .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
        .modal-header h3 { display: flex; align-items: center; gap: 0.5rem; font-size: 1.1rem; font-weight: 700; }
        .modal-close { padding: 0.4rem; border-radius: 50%; color: var(--text-muted); }
        .modal-close:hover { background: var(--glass); color: var(--text-primary); }
        .modal-form { display: flex; flex-direction: column; gap: 1rem; }
        .modal-form label { display: flex; flex-direction: column; gap: 0.4rem; font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); }
        .modal-form input { padding: 0.75rem 1rem; border-radius: 12px; border: 1px solid var(--glass-border); background: var(--bg-surface); font-size: 0.9rem; color: var(--text-primary); }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .form-error { color: #ff3b30; font-size: 0.8rem; padding: 0.5rem; background: rgba(255,59,48,0.1); border-radius: 8px; }
        .modal-note { display: flex; align-items: center; gap: 0.5rem; font-size: 0.75rem; color: var(--text-muted); background: var(--glass); padding: 0.6rem 0.9rem; border-radius: 10px; }

        @keyframes spin { to { transform: rotate(360deg); } }
        .spinning { animation: spin 0.8s linear infinite; }

        @media (max-width: 1024px) {
          .calendar-grid-layout { grid-template-columns: 1fr; height: auto; }
          .calendar-details-ios { min-height: 300px; }
        }
        @media (max-width: 768px) {
          .calendar-controls-ios { flex-direction: column; gap: 1rem; align-items: stretch; }
          .c-left { justify-content: space-between; }
          .month-name { font-size: 1.8rem; }
          .grid-cell { padding: 0.25rem; min-height: 70px; }
          .cell-number { font-size: 0.75rem; }
          .event-dot { width: 5px; height: 5px; }
          .grid-header-ios .day-label { padding: 0.5rem 0.2rem; font-size: 0.65rem; }
          .add-event-btn span { display: none; }
          .add-event-btn { padding: 0.75rem; border-radius: 50%; width: 44px; height: 44px; justify-content: center; }
          .cal-legend { flex-wrap: wrap; gap: 0.75rem; }
        }
      `}</style>
    </div>
  );
};

export default CalendarPage;

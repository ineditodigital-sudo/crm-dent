import React, { useState } from 'react';
import { Search, Filter, Send, User, Bot, ShieldAlert, ShieldHalf, MessageSquare, Trash2, ChevronDown, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const STATUSES = ['Lead', 'Prospecto', 'Cliente Nuevo', 'Cliente Frecuente', 'Especial'];
const STATUS_COLORS: Record<string, string> = {
  'Lead': '#8e8e93',
  'Prospecto': '#ff9f0a',
  'Cliente Nuevo': '#007aff',
  'Cliente Frecuente': '#30d158',
  'Especial': '#bf5af2',
};

const Conversations = () => {
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusMenu, setStatusMenu] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const { authFetch } = useAuth();
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const fetchChats = React.useCallback(() => {
    authFetch('/api/conversations')
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        // Sort by last message time, most recent first
        const sorted = (Array.isArray(data) ? data : []).sort((a: any, b: any) =>
          new Date(b.last_message_time || b.created_at || 0).getTime() -
          new Date(a.last_message_time || a.created_at || 0).getTime()
        );
        setChats(sorted);
        setLoading(false);
      })
      .catch(() => { setChats([]); setLoading(false); });
  }, [authFetch]);

  const fetchMessages = React.useCallback((patientId: number) => {
    authFetch(`/api/conversations/${patientId}/messages`)
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        setMessages(data);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      })
      .catch(() => {});
  }, [authFetch]);

  React.useEffect(() => { fetchChats(); const t = setInterval(fetchChats, 5000); return () => clearInterval(t); }, [fetchChats]);
  React.useEffect(() => {
    if (selectedChat) { fetchMessages(selectedChat.id); const t = setInterval(() => fetchMessages(selectedChat.id), 3000); return () => clearInterval(t); }
  }, [selectedChat, fetchMessages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat) return;
    try {
      await authFetch(`/api/conversations/${selectedChat.id}/send`, { method: 'POST', body: JSON.stringify({ content: newMessage }) });
      setNewMessage('');
      fetchMessages(selectedChat.id);
    } catch {}
  };

  const toggleManual = async (manual: boolean) => {
    if (!selectedChat) return;
    await authFetch(`/api/patients/${selectedChat.id}/toggle-manual`, { method: 'POST', body: JSON.stringify({ manual_mode: manual }) });
    setSelectedChat((c: any) => ({ ...c, manual_mode: manual }));
    fetchChats();
  };

  const handleDelete = async (id: number) => {
    await authFetch(`/api/conversations/${id}`, { method: 'DELETE' });
    if (selectedChat?.id === id) setSelectedChat(null);
    setConfirmDelete(null);
    fetchChats();
  };

  const handleStatusChange = async (id: number, status: string) => {
    await authFetch(`/api/conversations/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
    setStatusMenu(null);
    fetchChats();
    if (selectedChat?.id === id) setSelectedChat((c: any) => ({ ...c, status }));
  };

  const formatTime = (t: any) => {
    try {
      const d = new Date(t);
      if (isNaN(d.getTime())) return '';
      const now = new Date();
      const diff = now.getTime() - d.getTime();
      if (diff < 60000) return 'Ahora';
      if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
      if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
    } catch { return ''; }
  };

  const filtered = chats.filter(c =>
    !search || (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || '').includes(search)
  );

  return (
    <div className={`conv-wrap animate-ios ${selectedChat ? 'is-chat-open' : ''}`}>
      {/* ── Chat List ── */}
      <div className="conv-list glass-card">
        <div className="conv-list-header">
          <div className="conv-search">
            <Search size={15} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." />
            {search && <button onClick={() => setSearch('')}><X size={14} /></button>}
          </div>
          <button className="icon-btn"><Filter size={16} /></button>
        </div>

        <div className="conv-list-body">
          <span className="ios-label" style={{ padding: '0 1rem' }}>
            {filtered.length} conversación{filtered.length !== 1 ? 'es' : ''}
          </span>

          {loading && <div className="conv-empty">Cargando...</div>}
          {!loading && filtered.length === 0 && <div className="conv-empty">Sin conversaciones</div>}

          {filtered.map(chat => (
            <div key={chat.id} className={`conv-row ${selectedChat?.id === chat.id ? 'active' : ''}`}>
              <div className="conv-row-main" onClick={() => setSelectedChat(chat)}>
                <div className="conv-avatar">
                  {chat.name?.charAt(0)?.toUpperCase() || 'P'}
                  <span className={`conv-dot ${chat.manual_mode ? 'dot-red' : 'dot-green'}`} />
                </div>
                <div className="conv-row-info">
                  <div className="conv-row-top">
                    <strong>{chat.name || 'Sin nombre'}</strong>
                    <span className="conv-time">{formatTime(chat.last_message_time)}</span>
                  </div>
                  <div className="conv-row-bottom">
                    <span className="conv-preview">{chat.last_message || '...'}</span>
                    <span className="conv-status-badge" style={{ background: STATUS_COLORS[chat.status] || '#8e8e93' }}>
                      {chat.status || 'Lead'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Row actions */}
              <div className="conv-row-actions">
                <div className="status-dropdown-wrap">
                  <button className="icon-btn small" onClick={e => { e.stopPropagation(); setStatusMenu(statusMenu === chat.id ? null : chat.id); }}>
                    <ChevronDown size={14} />
                  </button>
                  <AnimatePresence>
                    {statusMenu === chat.id && (
                      <motion.div className="status-dropdown" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                        {STATUSES.map(s => (
                          <button key={s} onClick={() => handleStatusChange(chat.id, s)}
                            style={{ borderLeft: `3px solid ${STATUS_COLORS[s]}` }}
                            className={chat.status === s ? 'active' : ''}>
                            {s}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <button className="icon-btn small danger" onClick={e => { e.stopPropagation(); setConfirmDelete(chat.id); }}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Chat Area ── */}
      <div className="conv-chat glass-card">
        {selectedChat ? (
          <>
            <header className="chat-head">
              <div className="chat-head-info">
                {/* Back button only on mobile */}
                <button className="mobile-back-btn" onClick={() => setSelectedChat(null)}>
                  <X size={20} />
                </button>
                <div className="conv-avatar" style={{ width: 40, height: 40, fontSize: '0.9rem' }}>
                  {selectedChat.name?.charAt(0)?.toUpperCase() || 'P'}
                </div>
                <div>
                  <h3>{selectedChat.name || 'Paciente'}</h3>
                  <span className="chat-head-status" style={{ color: selectedChat.manual_mode ? '#ff3b30' : '#30d158' }}>
                    {selectedChat.manual_mode ? <><ShieldAlert size={12} /> Control Humano</> : <><Bot size={12} /> IA Respondiendo</>}
                  </span>
                </div>
              </div>
              <div className="chat-head-actions">
                <button className="icon-btn" title={selectedChat.manual_mode ? 'Activar bot' : 'Tomar control'} onClick={() => toggleManual(!selectedChat.manual_mode)}>
                  {selectedChat.manual_mode ? <Bot size={20} /> : <ShieldHalf size={20} />}
                </button>
                <button className="icon-btn danger" onClick={() => setConfirmDelete(selectedChat.id)}>
                  <Trash2 size={18} />
                </button>
              </div>
            </header>

            <div className="chat-messages">
              {messages.map((msg, i) => (
                <div key={i} className={`msg-bubble ${msg.sender}`}>
                  {msg.sender !== 'patient' && (
                    <div className="msg-chip">
                      {msg.sender === 'bot' ? <Bot size={11} /> : <User size={11} />}
                      {msg.sender === 'bot' ? 'IA' : 'Agente'}
                    </div>
                  )}
                  <p>{msg.content}</p>
                  <span className="msg-time">{formatTime(msg.timestamp)}</span>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <footer className="chat-foot">
              {!selectedChat.manual_mode ? (
                <div className="bot-active-bar">
                  <span><Bot size={16} /> El bot está atendiendo</span>
                  <button onClick={() => toggleManual(true)}>Tomar Control</button>
                </div>
              ) : (
                <div className="manual-bar">
                  <div className="manual-label">
                    <ShieldHalf size={14} /> Modo Manual
                    <button className="link-btn" onClick={() => toggleManual(false)}>Dejar al bot</button>
                  </div>
                  <form className="send-form" onSubmit={handleSend}>
                    <input
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      placeholder="Escribe un mensaje..."
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSend(e); } }}
                    />
                    <button type="submit" className="send-btn" disabled={!newMessage.trim()}>
                      <Send size={17} />
                    </button>
                  </form>
                </div>
              )}
            </footer>
          </>
        ) : (
          <div className="chat-empty">
            <MessageSquare size={48} />
            <h3>Consola Multiagente</h3>
            <p>Selecciona una conversación para comenzar</p>
          </div>
        )}
      </div>

      {/* ── Confirm Delete Modal ── */}
      <AnimatePresence>
        {confirmDelete !== null && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setConfirmDelete(null)}>
            <motion.div className="confirm-modal glass-card" initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
              onClick={e => e.stopPropagation()}>
              <Trash2 size={32} color="#ff3b30" />
              <h3>¿Eliminar conversación?</h3>
              <p>Se eliminarán todos los mensajes y datos de este paciente. Esta acción no se puede deshacer.</p>
              <div className="confirm-actions">
                <button className="cancel-btn" onClick={() => setConfirmDelete(null)}>Cancelar</button>
                <button className="delete-btn" onClick={() => handleDelete(confirmDelete!)}>Eliminar</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .conv-wrap { display: flex; gap: 1.25rem; height: calc(100vh - 120px); position: relative; }

        /* ── List ── */
        .conv-list { width: 340px; min-width: 300px; display: flex; flex-direction: column; overflow: hidden; }
        .conv-list-header { padding: 1rem; display: flex; gap: 0.5rem; border-bottom: 1px solid var(--glass-border); }
        .conv-search { flex: 1; display: flex; align-items: center; gap: 0.5rem; background: var(--bg-app); padding: 0.55rem 0.85rem; border-radius: 12px; }
        .conv-search input { flex: 1; border: none; background: none; font-size: 0.85rem; color: var(--text-primary); outline: none; }
        .conv-list-body { flex: 1; overflow-y: auto; padding: 0.75rem 0; display: flex; flex-direction: column; gap: 0.15rem; }
        .conv-empty { text-align: center; color: var(--text-muted); padding: 2rem; font-size: 0.85rem; }

        .conv-row { display: flex; align-items: center; gap: 0.5rem; padding: 0.6rem 0.75rem 0.6rem 0.75rem; border-radius: 14px; margin: 0 0.5rem; transition: var(--transition); }
        .conv-row:hover { background: var(--bg-app); }
        .conv-row.active { background: var(--primary); color: white; }
        .conv-row-main { flex: 1; display: flex; align-items: center; gap: 0.85rem; cursor: pointer; min-width: 0; }
        .conv-row-actions { display: flex; gap: 0.25rem; flex-shrink: 0; opacity: 0; transition: opacity 0.2s; }
        .conv-row:hover .conv-row-actions { opacity: 1; }

        .conv-avatar { width: 44px; height: 44px; background: var(--bg-surface); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1rem; position: relative; flex-shrink: 0; color: var(--text-primary); }
        .conv-row.active .conv-avatar { background: rgba(255,255,255,0.2); color: white; }
        .conv-dot { position: absolute; bottom: 1px; right: 1px; width: 11px; height: 11px; border-radius: 50%; border: 2px solid var(--bg-card); }
        .dot-green { background: #30d158; }
        .dot-red { background: #ff3b30; }

        .conv-row-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.2rem; }
        .conv-row-top { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; }
        .conv-row-top strong { font-size: 0.88rem; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .conv-time { font-size: 0.68rem; opacity: 0.65; flex-shrink: 0; }
        .conv-row-bottom { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
        .conv-preview { font-size: 0.77rem; opacity: 0.7; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; }
        .conv-status-badge { font-size: 0.6rem; font-weight: 700; padding: 0.15rem 0.5rem; border-radius: 20px; color: white; flex-shrink: 0; white-space: nowrap; }

        /* Status dropdown */
        .status-dropdown-wrap { position: relative; }
        .status-dropdown { position: absolute; right: 0; top: 110%; background: var(--bg-card); border: 1px solid var(--glass-border); border-radius: 12px; overflow: hidden; z-index: 200; min-width: 160px; box-shadow: 0 8px 32px rgba(0,0,0,0.25); }
        .status-dropdown button { display: block; width: 100%; padding: 0.6rem 1rem; text-align: left; font-size: 0.82rem; font-weight: 600; color: var(--text-primary); background: none; border: none; cursor: pointer; transition: background 0.15s; }
        .status-dropdown button:hover, .status-dropdown button.active { background: var(--bg-app); }

        .icon-btn { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 8px; background: var(--glass); border: none; color: var(--text-muted); cursor: pointer; transition: var(--transition); }
        .icon-btn:hover { background: var(--bg-app); color: var(--text-primary); }
        .icon-btn.small { width: 26px; height: 26px; border-radius: 6px; }
        .icon-btn.danger:hover { background: rgba(255,59,48,0.1); color: #ff3b30; }

        /* ── Chat Area ── */
        .conv-chat { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0; }
        .chat-head { padding: 1rem 1.5rem; border-bottom: 1px solid var(--glass-border); display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; }
        .chat-head-info { display: flex; align-items: center; gap: 0.85rem; }
        .chat-head-info h3 { font-size: 1rem; font-weight: 700; margin: 0; }
        .chat-head-status { display: flex; align-items: center; gap: 0.35rem; font-size: 0.75rem; font-weight: 600; margin-top: 0.15rem; }
        .chat-head-actions { display: flex; gap: 0.5rem; }

        .chat-messages { flex: 1; padding: 1.25rem 1.5rem; overflow-y: auto; display: flex; flex-direction: column; gap: 0.65rem; background: var(--bg-app); }

        .msg-bubble { max-width: 70%; padding: 0.8rem 1rem; border-radius: 18px; display: flex; flex-direction: column; gap: 0.25rem; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
        .msg-bubble.bot, .msg-bubble.agent, .msg-bubble.admin { align-self: flex-end; background: var(--primary); color: white; border-bottom-right-radius: 4px; }
        .msg-bubble.patient { align-self: flex-start; background: var(--bg-surface); color: var(--text-primary); border-bottom-left-radius: 4px; }
        .msg-chip { font-size: 0.62rem; font-weight: 800; display: flex; align-items: center; gap: 0.3rem; opacity: 0.8; margin-bottom: 0.1rem; }
        .msg-bubble p { margin: 0; font-size: 0.9rem; line-height: 1.45; word-break: break-word; }
        .msg-time { font-size: 0.58rem; opacity: 0.55; align-self: flex-end; }

        .chat-foot { padding: 1rem 1.5rem; border-top: 1px solid var(--glass-border); background: var(--bg-surface); flex-shrink: 0; }
        .bot-active-bar { display: flex; justify-content: space-between; align-items: center; background: var(--bg-app); padding: 0.65rem 1rem; border-radius: 14px; }
        .bot-active-bar span { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; color: var(--text-muted); font-weight: 600; }
        .bot-active-bar button { background: var(--primary); color: white; padding: 0.55rem 1.25rem; border-radius: 20px; font-weight: 700; font-size: 0.82rem; border: none; cursor: pointer; }
        .manual-bar { display: flex; flex-direction: column; gap: 0.65rem; }
        .manual-label { display: flex; align-items: center; gap: 0.5rem; font-size: 0.78rem; color: var(--text-muted); font-weight: 600; }
        .link-btn { background: none; border: none; color: var(--primary); font-weight: 700; cursor: pointer; font-size: 0.78rem; margin-left: auto; }
        .send-form { display: flex; gap: 0.75rem; align-items: center; }
        .send-form input { flex: 1; background: var(--bg-app); border: none; padding: 0.75rem 1.25rem; border-radius: 24px; font-size: 0.9rem; color: var(--text-primary); outline: none; }
        .send-btn { width: 42px; height: 42px; background: var(--primary); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: none; cursor: pointer; transform: rotate(-20deg); box-shadow: 0 4px 12px var(--primary-light); transition: var(--transition); }
        .send-btn:disabled { opacity: 0.3; transform: none; cursor: not-allowed; }

        .chat-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem; opacity: 0.4; color: var(--text-muted); text-align: center; }

        /* ── Confirm Modal ── */
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 1rem; }
        .confirm-modal { padding: 2rem; border-radius: 20px; max-width: 380px; width: 100%; display: flex; flex-direction: column; align-items: center; gap: 1rem; text-align: center; }
        .confirm-modal h3 { font-size: 1.1rem; font-weight: 800; }
        .confirm-modal p { font-size: 0.85rem; color: var(--text-muted); line-height: 1.5; }
        .confirm-actions { display: flex; gap: 0.75rem; width: 100%; }
        .cancel-btn { flex: 1; padding: 0.8rem; border-radius: 12px; background: var(--bg-app); border: 1px solid var(--glass-border); font-weight: 700; cursor: pointer; color: var(--text-primary); }
        .delete-btn { flex: 1; padding: 0.8rem; border-radius: 12px; background: #ff3b30; color: white; font-weight: 700; cursor: pointer; border: none; }

        .mobile-back-btn { display: none; background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 0.5rem; margin-left: -0.5rem; }
        
        @media (max-width: 900px) {
          .conv-wrap { flex-direction: row; height: calc(100dvh - 140px); overflow: hidden; position: relative; }
          .conv-list { 
            position: absolute; inset: 0; width: 100%; z-index: 10; 
            transform: translateX(0);
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .conv-wrap.is-chat-open .conv-list { transform: translateX(-100%); }
          .conv-chat { 
            position: absolute; inset: 0; width: 100%; z-index: 5;
            transform: translateX(100%);
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .conv-wrap.is-chat-open .conv-chat { transform: translateX(0); }
          .mobile-back-btn { display: flex; align-items: center; justify-content: center; }
          .chat-head { padding: 0.75rem 1rem; }
          .chat-messages { padding: 1rem; }
          .msg-bubble { max-width: 85%; }
          .chat-foot { padding: 0.75rem 1rem; }
          .conv-row-actions { opacity: 1; }
        }
        @media (max-width: 600px) {
          .conv-row-actions { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default Conversations;

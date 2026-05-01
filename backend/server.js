const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');
const crypto = require('crypto');
const multer = require('multer');

// Módulos con carga opcional
let google, pino;
try { google = require('googleapis').google; } catch (e) { console.error('googleapis no disponible'); }
try { pino = require('pino'); } catch (e) { }

let helmet, rateLimit;
try { helmet = require('helmet'); } catch (e) { }
try { rateLimit = require('express-rate-limit'); } catch (e) { }

dotenv.config({ path: path.resolve(__dirname, '.env') });
if (!process.env.ADMIN_USER) dotenv.config({ path: path.resolve(__dirname, '../.env') });
console.log('📂 Configuración cargada. DB_HOST:', process.env.DB_HOST || 'No definido', 'GEMINI_KEY present:', !!process.env.GEMINI_API_KEY);

let GoogleGenerativeAI;
let makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers;
let socket = null;
let lastQR = "";
let lastError = null;
let connectionState = 'close';
const logs = [];
const sseClients = new Set(); // SSE clients for real-time notifications

function broadcastSSE(event, data) {
    const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    sseClients.forEach(client => {
        try { client.write(msg); } catch (e) { sseClients.delete(client); }
    });
}

const sanitizeMsg = (msg) => String(msg).replace(/AIzaSy[\w-]+/g, 'AIzaSy***').replace(/GOCSPX-[\w-]+/g, 'GOCSPX-***');
const logHandler = (type, args) => {
    const msg = sanitizeMsg(args.map(a => a instanceof Error ? a.message : String(a)).join(' '));
    logs.unshift({ type, time: new Date().toISOString(), msg });
    if (logs.length > 100) logs.pop();
};
console.log = (...args) => { logHandler('info', args); process.stdout.write(args.join(' ') + '\n'); };
console.error = (...args) => { logHandler('error', args); process.stderr.write(args.join(' ') + '\n'); };

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || crypto.createHash('sha256').update(process.env.ADMIN_PASS || 'admin123').digest('hex');
console.log('📂 Directorio de ejecución (CWD):', process.cwd());
const distDir = '/home/inedito/public_html/crm-dent.inedito.digital';
const uploadDir = path.join(distDir, 'uploads');

try {
    if (!fs.existsSync(uploadDir)) {
        console.log('📂 Directorio de uploads no existe. Creando en:', uploadDir);
        fs.mkdirSync(uploadDir, { recursive: true, mode: 0o755 });
    }
    fs.chmodSync(uploadDir, 0o755);
    const htaccessPath = path.join(uploadDir, '.htaccess');
    const htaccessContent = 'Options +FollowSymLinks\nRewriteEngine Off\n';
    if (!fs.existsSync(htaccessPath)) {
        fs.writeFileSync(htaccessPath, htaccessContent);
        console.log('✅ Archivo .htaccess creado en uploads para acceso directo');
    }
} catch (err) {
    console.error('❌ Error configurando directorio de uploads:', err.message);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const name = Date.now() + '-' + Math.round(Math.random() * 1E9) + ext;
        cb(null, name);
    }
});
const upload = multer({ storage });

const app = express();
if (helmet) app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(express.json({ limit: '5mb' }));

app.use('/uploads', express.static(uploadDir, {
    setHeaders: (res) => res.set('Cross-Origin-Resource-Policy', 'cross-origin')
}));
if (fs.existsSync(distDir)) app.use(express.static(distDir));

// Helper: llama a Gemini
async function callGemini(genAI, prompt, retries = 2) {
    const apiKey = genAI.apiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('No se encontró API Key para Gemini');
    const modelsToTry = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro'];
    let lastError = null;

    for (const modelName of modelsToTry) {
        try {
            console.log(`🤖 Intentando (Direct v1) con modelo: ${modelName}...`);
            const url = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${apiKey}`;
            for (let i = 0; i < retries; i++) {
                try {
                    const response = await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
                    });
                    const data = await response.json();
                    if (!response.ok) throw new Error(data.error?.message || `Error ${response.status}`);
                    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) throw new Error('Respuesta de IA vacía');
                    const text = data.candidates[0].content.parts[0].text;
                    console.log(`✅ Éxito con modelo: ${modelName}`);
                    return text;
                } catch (err) {
                    if (err.message && err.message.includes('429') && i < retries - 1) {
                        await new Promise(r => setTimeout(r, (i + 1) * 5000));
                    } else throw err;
                }
            }
        } catch (err) {
            lastError = err;
            if (err.message.includes('404') || err.message.includes('not found') || err.message.includes('503')) continue;
            throw err;
        }
    }
    throw lastError || new Error('Fallo conexión con Gemini');
}

const requireAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token || token !== ADMIN_TOKEN) return res.status(401).json({ error: 'No autorizado' });
    next();
};

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    charset: 'utf8mb4'
});

async function initDB() {
    try {
        console.log('📦 Inicializando base de datos...');
        await db.execute(`CREATE TABLE IF NOT EXISTS contacts (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255), phone VARCHAR(50) UNIQUE, email VARCHAR(255), service_interested VARCHAR(255), status VARCHAR(50) DEFAULT 'lead', last_interaction TIMESTAMP NULL, manual_mode TINYINT(1) DEFAULT 0) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        await db.execute(`CREATE TABLE IF NOT EXISTS messages (id INT AUTO_INCREMENT PRIMARY KEY, contact_id INT, content TEXT, sender ENUM('contact', 'bot', 'admin', 'agent') DEFAULT 'contact', timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (contact_id) REFERENCES contacts(id)) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        await db.execute(`CREATE TABLE IF NOT EXISTS appointments (id INT AUTO_INCREMENT PRIMARY KEY, contact_id INT, contact_name VARCHAR(255), appointment_date DATETIME, end_date DATETIME, description TEXT, source ENUM('bot', 'manual') DEFAULT 'manual', google_event_id VARCHAR(255), google_event_url TEXT, status VARCHAR(50) DEFAULT 'pendiente', reminder_sent TINYINT(1) DEFAULT 0, FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        await db.execute(`CREATE TABLE IF NOT EXISTS crm_settings (id INT AUTO_INCREMENT PRIMARY KEY, section VARCHAR(50), key_name VARCHAR(100), content TEXT) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);

        try {
            await db.execute(`DELETE t1 FROM crm_settings t1 INNER JOIN crm_settings t2 WHERE t1.id < t2.id AND t1.section = t2.section AND t1.key_name = t2.key_name`);
            await db.execute('ALTER TABLE crm_settings ADD UNIQUE KEY section_key (section, key_name)');
            console.log('✅ Clave única añadida a crm_settings');
        } catch (e) {}

        await db.execute(`CREATE TABLE IF NOT EXISTS google_tokens (id INT AUTO_INCREMENT PRIMARY KEY, access_token TEXT, refresh_token TEXT, expiry_date BIGINT)`);
        await db.execute(`CREATE TABLE IF NOT EXISTS brand_settings (key_name VARCHAR(100) PRIMARY KEY, value TEXT) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        await db.execute(`CREATE TABLE IF NOT EXISTS services (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255) NOT NULL, description TEXT, price DECIMAL(10,2), duration_minutes INT DEFAULT 60, active TINYINT(1) DEFAULT 1) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);

        const migrations = [
            `ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reminder_sent TINYINT(1) DEFAULT 0`,
            `ALTER TABLE appointments ADD COLUMN IF NOT EXISTS contact_name VARCHAR(255)`,
            `ALTER TABLE appointments ADD COLUMN IF NOT EXISTS end_date DATETIME`,
            `ALTER TABLE appointments ADD COLUMN IF NOT EXISTS description TEXT`,
            `ALTER TABLE appointments ADD COLUMN IF NOT EXISTS source ENUM('bot','manual') DEFAULT 'manual'`,
            `ALTER TABLE appointments ADD COLUMN IF NOT EXISTS google_event_url TEXT`,
            `ALTER TABLE appointments MODIFY COLUMN status VARCHAR(100) DEFAULT 'pendiente'`,
            `ALTER TABLE contacts ADD COLUMN IF NOT EXISTS service_interested VARCHAR(255)`,
            `ALTER TABLE contacts ADD COLUMN IF NOT EXISTS manual_mode TINYINT(1) DEFAULT 0`,
            `ALTER TABLE services ADD COLUMN IF NOT EXISTS image_url TEXT`,
        ];
        for (const m of migrations) { try { await db.execute(m); } catch (e) {} }
        console.log('✅ Base de datos lista y migrada.');
    } catch (err) { console.error('❌ Error Init DB:', err); }
}

// --- AUTH ---
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    if (username === (process.env.ADMIN_USER || 'admin') && password === (process.env.ADMIN_PASS || 'admin123')) {
        return res.json({ success: true, token: ADMIN_TOKEN });
    }
    res.status(401).json({ error: 'Credenciales incorrectas' });
});

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));
app.get('/api/logs', requireAuth, (req, res) => res.json(logs));

// --- SETTINGS ---
app.get('/api/public/settings', async (req, res) => {
    try {
        const publicSections = ['hero', 'services', 'contact', 'images', 'theme', 'ai_context', 'faq', 'professional', 'seo'];
        const [crmRows] = await db.execute('SELECT section, key_name, content FROM crm_settings WHERE section IN (?, ?, ?, ?, ?, ?, ?, ?, ?)', publicSections);
        const [brandRows] = await db.execute('SELECT key_name, value FROM brand_settings');
        const [serviceRows] = await db.execute('SELECT name, description, price, image_url FROM services WHERE active = 1');
        const settings = crmRows.reduce((acc, r) => { if (!acc[r.section]) acc[r.section] = {}; acc[r.section][r.key_name] = r.content; return acc; }, {});
        settings.brand = brandRows.reduce((acc, r) => { acc[r.key_name] = r.value; return acc; }, {});
        settings.services_list = serviceRows;
        res.json(settings);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/settings', requireAuth, async (req, res) => {
    try {
        const [crmRows] = await db.execute('SELECT section, key_name, content FROM crm_settings');
        const [brandRows] = await db.execute('SELECT key_name, value FROM brand_settings');
        const settings = crmRows.reduce((acc, r) => { if (!acc[r.section]) acc[r.section] = {}; acc[r.section][r.key_name] = r.content; return acc; }, {});
        settings.brand = brandRows.reduce((acc, r) => { acc[r.key_name] = r.value; return acc; }, {});
        res.json(settings);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/settings/:section?', requireAuth, async (req, res) => {
    try {
        let section = req.params.section || req.body.section;
        const data = req.params.section ? req.body : { [req.body.key_name]: req.body.content };
        if (!section) return res.status(400).json({ error: 'Sección no especificada' });
        for (const [k, v] of Object.entries(data)) {
            if (k && v !== undefined && k !== 'section') {
                if (section === 'brand') {
                    await db.execute('INSERT INTO brand_settings (key_name, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = ?', [k, v, v]);
                } else {
                    await db.execute('DELETE FROM crm_settings WHERE section = ? AND key_name = ?', [section, k]);
                    await db.execute('INSERT INTO crm_settings (section, key_name, content) VALUES (?,?,?)', [section, k, v]);
                }
            }
        }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- GOOGLE API HELPERS ---
async function getAPIKeys() {
    try {
        const [rows] = await db.execute('SELECT key_name, content FROM crm_settings WHERE section = "api_keys"');
        const k = rows.reduce((acc, r) => { acc[r.key_name] = r.content; return acc; }, {});
        return {
            gemini: (k.gemini_key || k.gemini || process.env.GEMINI_API_KEY || '').trim(),
            google_id: (k.google_id || process.env.GOOGLE_CLIENT_ID || '').trim(),
            google_secret: (k.google_secret || process.env.GOOGLE_CLIENT_SECRET || '').trim()
        };
    } catch (e) { return { gemini: (process.env.GEMINI_API_KEY || '').trim() }; }
}

async function getCalendarClient() {
    if (!google) return null;
    const keys = await getAPIKeys();
    if (!keys.google_id || !keys.google_secret) return null;
    const oauth2Client = new google.auth.OAuth2(keys.google_id, keys.google_secret, `https://${process.env.DOMAIN || 'localhost'}/api/calendar/callback`);
    const [tokens] = await db.execute('SELECT * FROM google_tokens LIMIT 1');
    if (tokens.length === 0) return null;
    oauth2Client.setCredentials({ access_token: tokens[0].access_token, refresh_token: tokens[0].refresh_token, expiry_date: tokens[0].expiry_date });
    return google.calendar({ version: 'v3', auth: oauth2Client });
}

// --- CRM DATA ---
app.get('/api/contacts', requireAuth, async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT p.*, COUNT(m.id) as message_count 
            FROM contacts p 
            LEFT JOIN messages m ON m.contact_id = p.id 
            GROUP BY p.id 
            ORDER BY p.last_interaction DESC
        `);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/contacts/:id', requireAuth, async (req, res) => {
    try {
        const fields = [];
        const values = [];
        for (const [k, v] of Object.entries(req.body)) {
            if (['name', 'email', 'service_interested', 'status'].includes(k)) {
                fields.push(`${k} = ?`);
                values.push(v);
            }
        }
        if (fields.length > 0) {
            values.push(req.params.id);
            await db.execute(`UPDATE contacts SET ${fields.join(', ')} WHERE id = ?`, values);
        }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/contacts/:id/status', requireAuth, async (req, res) => {
    try {
        await db.execute('UPDATE contacts SET status = ? WHERE id = ?', [req.body.status, req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/contacts/:id/manual', requireAuth, async (req, res) => {
    try {
        await db.execute('UPDATE contacts SET manual_mode = ? WHERE id = ?', [req.body.manual ? 1 : 0, req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/contacts/:id', requireAuth, async (req, res) => {
    try {
        await db.execute('DELETE FROM contacts WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/contacts/merge-duplicates', requireAuth, async (req, res) => {
    try {
        res.json({ success: true, message: 'Deduplicación simulada con éxito' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/conversations', requireAuth, async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT p.id, p.name, p.phone, p.status, p.last_interaction, p.manual_mode,
                   COUNT(m.id) as message_count, MAX(m.timestamp) as last_message_time,
                   (SELECT content FROM messages WHERE contact_id = p.id ORDER BY id DESC LIMIT 1) as last_message
            FROM contacts p
            LEFT JOIN messages m ON m.contact_id = p.id
            GROUP BY p.id ORDER BY last_message_time DESC
        `);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/conversations/:id/messages', requireAuth, async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM messages WHERE contact_id = ? ORDER BY id ASC', [req.params.id]);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/conversations/:id/send', requireAuth, async (req, res) => {
    const { content, isNote } = req.body;
    const { id } = req.params;
    try {
        const [contact] = await db.execute('SELECT phone, status FROM contacts WHERE id = ?', [id]);
        if (contact.length === 0) return res.status(404).json({ error: 'Contacto no encontrado' });
        if (isNote) {
            await db.execute('INSERT INTO messages (contact_id, content, sender) VALUES (?, ?, ?)', [id, content, 'note']);
            res.json({ success: true });
        } else if (socket) {
            const jid = contact[0].phone.includes('@') ? contact[0].phone : `${contact[0].phone}@s.whatsapp.net`;
            await socket.sendMessage(jid, { text: content });
            await db.execute('INSERT INTO messages (contact_id, content, sender) VALUES (?, ?, ?)', [id, content, 'agent']);
            await db.execute('UPDATE contacts SET last_interaction = CURRENT_TIMESTAMP, manual_mode = 1 WHERE id = ?', [id]);
            res.json({ success: true });
        } else res.status(503).json({ error: 'WhatsApp no conectado' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- APPOINTMENTS ---
app.get('/api/appointments', requireAuth, async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT a.*, p.phone as contact_phone, p.name as contact_name_db
            FROM appointments a LEFT JOIN contacts p ON a.contact_id = p.id
            WHERE a.status != 'cancelada' ORDER BY a.appointment_date ASC
        `);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/appointments', requireAuth, async (req, res) => {
    const { contact_id, appointment_date, description } = req.body;
    try {
        const [p] = await db.execute('SELECT name, phone FROM contacts WHERE id = ?', [contact_id]);
        const pName = p[0]?.name || 'Contacto';
        const pPhone = p[0]?.phone;
        const start = new Date(appointment_date);
        const end = new Date(start.getTime() + 60 * 60 * 1000);
        let gId = null, gUrl = null;
        try {
            const cal = await getCalendarClient();
            if (cal) {
                const event = await cal.events.insert({ calendarId: 'primary', requestBody: { summary: `Cita: ${pName}`, description, start: { dateTime: start.toISOString() }, end: { dateTime: end.toISOString() } } });
                gId = event.data.id; gUrl = event.data.htmlLink;
            }
        } catch (e) {}
        const [resCita] = await db.execute('INSERT INTO appointments (contact_id, contact_name, appointment_date, end_date, description, google_event_id, google_event_url, source) VALUES (?,?,?,?,?,?,?,?)', [contact_id, pName, appointment_date, end.toISOString().slice(0, 19).replace('T', ' '), description || null, gId || null, gUrl || null, 'manual']);
        
        if (socket && pPhone) {
            try {
                const fecha = new Date(appointment_date);
                const fechaStr = fecha.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
                const horaStr = fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
                const msg = `✅ *¡Nueva Cita Agendada!*\n\nHola ${pName}, te confirmamos que hemos agendado tu cita para el *${fechaStr} a las ${horaStr}*.\n\nServicio: ${description || 'Consulta'}\n${gUrl ? `Calendario: ${gUrl}` : ''}\n\n¡Te esperamos!`;
                const jid = pPhone.includes('@') ? pPhone : `${pPhone}@s.whatsapp.net`;
                await socket.sendMessage(jid, { text: msg });
                await db.execute('INSERT INTO messages (contact_id, content, sender) VALUES (?, ?, ?)', [contact_id, msg, 'admin']);
            } catch (e) {}
        }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/appointments/:id/cancel', requireAuth, async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT google_event_id FROM appointments WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'No encontrada' });
        await db.execute('UPDATE appointments SET status = ? WHERE id = ?', ['cancelada', req.params.id]);
        if (rows[0]?.google_event_id) {
            try {
                const cal = await getCalendarClient();
                if (cal) await cal.events.delete({ calendarId: 'primary', eventId: rows[0].google_event_id });
            } catch (e) {}
        }
        broadcastSSE('appointment_cancelled', { id: req.params.id });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- SERVICES ---
app.get('/api/services', requireAuth, async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM services ORDER BY name ASC');
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/services', requireAuth, async (req, res) => {
    const { name, description, price, duration_minutes, active, image_url } = req.body;
    try {
        const [r] = await db.execute('INSERT INTO services (name, description, price, duration_minutes, active, image_url) VALUES (?,?,?,?,?,?)', [name, description, price || null, duration_minutes || 60, active !== undefined ? active : 1, image_url || null]);
        res.json({ success: true, id: r.insertId });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- WHATSAPP & IA ---
async function inicializarLibreriasYWhatsApp() {
    try {
        const genAIMod = await import('@google/generative-ai');
        GoogleGenerativeAI = genAIMod.GoogleGenerativeAI;
        const baileysMod = await import('@whiskeysockets/baileys');
        const main = baileysMod.default || baileysMod;
        makeWASocket = main.default || main;
        useMultiFileAuthState = baileysMod.useMultiFileAuthState || main.useMultiFileAuthState;
        DisconnectReason = baileysMod.DisconnectReason || main.DisconnectReason;
        Browsers = baileysMod.Browsers || main.Browsers;
        await connectToWhatsApp();
    } catch (e) { console.error('Error librerías:', e.message); }
}

async function connectToWhatsApp() {
    try {
        const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
        socket = makeWASocket({ auth: state, printQRInTerminal: true, browser: Browsers.appropriate('Chrome') });
        socket.ev.on('creds.update', saveCreds);
        socket.ev.on('connection.update', (u) => {
            if (u.connection) connectionState = u.connection;
            if (u.qr) lastQR = u.qr;
            if (u.connection === 'open') { lastQR = ""; lastError = null; console.log('✅ WhatsApp conectado'); }
            if (u.connection === 'close') {
                const code = u.lastDisconnect?.error?.output?.statusCode;
                if (code === DisconnectReason.loggedOut) {
                    if (fs.existsSync('auth_info_baileys')) fs.rmSync('auth_info_baileys', { recursive: true, force: true });
                    setTimeout(connectToWhatsApp, 2000);
                } else setTimeout(connectToWhatsApp, 3000);
            }
        });
        socket.ev.on('messages.upsert', async ({ messages }) => {
            const m = messages[0];
            if (!m.message || m.key.fromMe) return;
            const sender = m.key.remoteJid.replace('@s.whatsapp.net', '');
            if (sender.endsWith('@g.us')) return;
            const text = m.message.conversation || m.message.extendedTextMessage?.text || "";
            if (!text) return;

            console.log(`📥 RECIBIDO de ${sender}: ${text}`);
            let [rows] = await db.execute('SELECT * FROM contacts WHERE phone = ?', [sender]);
            let pId, pName, pManual;
            if (rows.length === 0) {
                const [res] = await db.execute('INSERT INTO contacts (name, phone, status) VALUES (?, ?, ?)', ['Nuevo Contacto', sender, 'lead']);
                pId = res.insertId; pName = 'Nuevo Contacto'; pManual = 0;
            } else { pId = rows[0].id; pName = rows[0].name; pManual = rows[0].manual_mode; }

            await db.execute('INSERT INTO messages (contact_id, content, sender) VALUES (?, ?, ?)', [pId, text, 'contact']);
            broadcastSSE('new_message', { contact_id: pId, contact_name: pName, phone: sender, text });

            const keys = await getAPIKeys();
            if (keys.gemini && GoogleGenerativeAI && pManual !== 1) {
                try {
                    const [history] = await db.execute('SELECT content, sender FROM messages WHERE contact_id = ? ORDER BY id DESC LIMIT 10', [pId]);
                    const conversationHistory = history.reverse().map(h => `${h.sender === 'contact' ? 'Cliente' : 'Asistente'}: ${h.content}`).join('\n');
                    const [dbServices] = await db.execute('SELECT name, description, price, duration_minutes FROM services WHERE active = 1');
                    const servicesList = dbServices.map(s => `- ${s.name}: ${s.description || ''}`).join('\n');
                    const [brandRows] = await db.execute('SELECT key_name, value FROM brand_settings');
                    const brandCfg = brandRows.reduce((acc, r) => { acc[r.key_name] = r.value; return acc; }, {});
                    const personality = brandCfg.bot_personality || `Eres el asistente de ${brandCfg.clinic_name || 'la clínica'}.`;
                    
                    const now = new Date();
                    const prompt = `${personality}\nHoy es: ${now.toLocaleDateString('es-MX')}. \nREGLAS: \n1. Datos necesarios: Nombre, Email, Teléfono. \n2. Formato: __CITA|fecha=YYYY-MM-DD HH:mm:ss|servicio=X__\nSERVICIOS:\n${servicesList}\nHISTORIAL:\n${conversationHistory}\nCliente: ${text}\nAsistente:`;
                    
                    const genAI = new GoogleGenerativeAI(keys.gemini, { apiVersion: 'v1' });
                    let botMsg = await callGemini(genAI, prompt);

                    const datosMatch = botMsg.match(/__DATOS\|nombre=(.*?)\|email=(.*?)\|telefono=(.*?)__/i);
                    if (datosMatch) {
                        const [, n, e, t] = datosMatch;
                        await db.execute('UPDATE contacts SET name = ?, email = ? WHERE id = ?', [n.trim(), e.trim(), pId]);
                        botMsg = botMsg.replace(datosMatch[0], '').trim();
                        pName = n.trim();
                    }

                    const citaMatch = botMsg.match(/__CITA\|fecha=([\d\-\:\s]+)\|servicio=(.*?)__/i);
                    if (citaMatch) {
                        const fechaStr = citaMatch[1].trim();
                        const serviceName = citaMatch[2].trim();
                        const fechaCita = new Date(fechaStr);
                        const duration = 60;
                        const endDate = new Date(fechaCita.getTime() + duration * 60000);
                        const [resCita] = await db.execute('INSERT INTO appointments (contact_id, contact_name, appointment_date, end_date, description, source) VALUES (?, ?, ?, ?, ?, ?)', [pId, pName, fechaStr, endDate.toISOString().slice(0, 19).replace('T', ' '), serviceName, 'bot']);
                        let gUrl = "";
                        try {
                            const cal = await getCalendarClient();
                            if (cal) {
                                const gEvent = await cal.events.insert({ calendarId: 'primary', resource: { summary: `Cita: ${pName}`, start: { dateTime: fechaCita.toISOString() }, end: { dateTime: endDate.toISOString() } } });
                                gUrl = gEvent.data.htmlLink;
                                await db.execute('UPDATE appointments SET google_event_id = ?, google_event_url = ? WHERE id = ?', [gEvent.data.id, gUrl, resCita.insertId]);
                            }
                        } catch (e) {}
                        botMsg = botMsg.replace(citaMatch[0], '').trim() + `\n\n📅 *¡Cita confirmada!* Aquí: ${gUrl || 'agendada en sistema'}`;
                    }

                    if (botMsg.trim()) {
                        await socket.sendMessage(m.key.remoteJid, { text: botMsg });
                        await db.execute('INSERT INTO messages (contact_id, content, sender) VALUES (?, ?, ?)', [pId, botMsg, 'bot']);
                    }
                } catch (e) { console.error('Error IA:', e.message); }
            }
        });
    } catch (e) { console.error('Error Socket:', e.message); }
}

// --- REMINDERS ---
async function checkAppointmentReminders() {
    try {
        const [appts] = await db.execute(`SELECT a.*, p.phone, p.name FROM appointments a JOIN contacts p ON a.contact_id = p.id WHERE a.reminder_sent = 0 AND a.status = 'pendiente' AND a.appointment_date BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 24 HOUR)`);
        for (const a of appts) {
            if (socket && a.phone) {
                const msg = `🔔 Recordatorio: Tienes una cita agendada para el ${a.appointment_date}.`;
                await socket.sendMessage(`${a.phone}@s.whatsapp.net`, { text: msg });
                await db.execute('UPDATE appointments SET reminder_sent = 1 WHERE id = ?', [a.id]);
            }
        }
    } catch (e) {}
}

app.get('/api/whatsapp/status', requireAuth, (req, res) => res.json({ connected: connectionState === 'open', qr: lastQR, error: lastError }));

app.post('/api/whatsapp/restart', requireAuth, async (req, res) => {
    try {
        console.log('🔄 Reiniciando conexión de WhatsApp...');
        if (socket) { try { socket.end(); } catch (e) { } socket = null; }
        lastQR = ""; setTimeout(connectToWhatsApp, 1000);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/whatsapp/logout', requireAuth, async (req, res) => {
    try {
        console.log('🚪 Forzando cierre de sesión...');
        if (socket) { try { await socket.logout(); } catch (e) { } socket = null; }
        if (fs.existsSync('auth_info_baileys')) fs.rmSync('auth_info_baileys', { recursive: true, force: true });
        lastQR = ""; setTimeout(connectToWhatsApp, 1000);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/stats', requireAuth, async (req, res) => {
    try {
        const [[p]] = await db.execute('SELECT COUNT(*) as total FROM contacts');
        const [[m]] = await db.execute('SELECT COUNT(*) as total FROM messages WHERE sender = "bot"');
        const [[a]] = await db.execute('SELECT COUNT(*) as total FROM appointments WHERE DATE(appointment_date) = CURDATE()');
        res.json({ totalLeads: p.total, botMessages: m.total, todayApps: a.total, connected: !!socket });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/brand/upload', requireAuth, (req, res) => {
    upload.single('image')(req, res, (err) => {
        if (err || !req.file) return res.status(500).json({ error: 'Error upload' });
        fs.chmodSync(req.file.path, 0o644);
        res.json({ success: true, url: `/uploads/${req.file.filename}` });
    });
});

app.get('/api/reports', requireAuth, async (req, res) => {
    try {
        const [totals] = await db.execute(`SELECT (SELECT COUNT(*) FROM contacts) as total_contacts, (SELECT COUNT(*) FROM appointments) as total_appointments`);
        const [byStatus] = await db.execute(`SELECT status, COUNT(*) as count FROM contacts GROUP BY status`);
        res.json({ totals: totals[0], byStatus });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/sitemap.xml', async (req, res) => {
    try {
        const [services] = await db.execute('SELECT name FROM services WHERE active = 1');
        const domain = `https://${req.get('host')}`;
        const lastMod = new Date().toISOString().split('T')[0];

        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${domain}/</loc>
    <lastmod>${lastMod}</lastmod>
    <priority>1.0</priority>
  </url>`;

        // A├▒adir servicios si se desea (aunque sean secciones anchor, ayuda a la indexaci├│n de keywords)
        services.forEach(s => {
            xml += `
  <url>
    <loc>${domain}/#servicios</loc>
    <lastmod>${lastMod}</lastmod>
    <priority>0.8</priority>
  </url>`;
        });

        xml += `\n</urlset>`;
        res.header('Content-Type', 'application/xml');
        res.send(xml);
    } catch (e) {
        res.status(500).send('Error generating sitemap');
    }
});

app.get('/robots.txt', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT content FROM crm_settings WHERE section = "seo" AND key_name = "robots_txt"');
        const customRobots = rows[0]?.content;
        const domain = `https://${req.get('host')}`;

        if (customRobots) {
            res.header('Content-Type', 'text/plain');
            return res.send(customRobots + `\n\nSitemap: ${domain}/sitemap.xml`);
        }

        const defaultRobots = `User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /auth_info_baileys/

Sitemap: ${domain}/sitemap.xml`;
        res.header('Content-Type', 'text/plain');
        res.send(defaultRobots);
    } catch (e) {
        res.send('User-agent: *\nAllow: /');
    }
});

// --- FAVICON DINAMICO ---
app.get('/api/brand-favicon', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT value FROM brand_settings WHERE key_name = "logo_url"');
        if (rows.length > 0 && rows[0].value) {
            return res.redirect(rows[0].value);
        }
        // Fallback al logo por defecto si no hay uno subido
        res.redirect('/logo.png');
    } catch (e) {
        res.redirect('/logo.png');
    }
});

// --- SETTINGS (General con Auth para el Editor) ---
app.get('/api/settings/keys-status', requireAuth, async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT key_name FROM crm_settings WHERE section = "api_keys" AND content IS NOT NULL AND content != ""');
        res.json({ configured: rows.map(r => r.key_name) });
    } catch (err) { res.status(500).json({ error: err.message }); }
});//('├â┬ó├é┬Ø├àÔÇÖ Error al guardar settings:', err.message);


// --- GOOGLE API HELPERS ---
async function getAPIKeys() {
    try {
        const [rows] = await db.execute('SELECT key_name, content FROM crm_settings WHERE section = "api_keys"');
        const k = rows.reduce((acc, r) => { acc[r.key_name] = r.content; return acc; }, {});
        return {
            gemini: (k.gemini_key || k.gemini || process.env.GEMINI_API_KEY || '').trim(),
            google_id: (k.google_id || process.env.GOOGLE_CLIENT_ID || '').trim(),
            google_secret: (k.google_secret || process.env.GOOGLE_CLIENT_SECRET || '').trim()
        };
    } catch (e) { return { gemini: (process.env.GEMINI_API_KEY || '').trim() }; }
}

async function getCalendarClient() {
    if (!google) return null;
    const keys = await getAPIKeys();
    if (!keys.google_id || !keys.google_secret) return null;
    const oauth2Client = new google.auth.OAuth2(keys.google_id, keys.google_secret, `https://${process.env.DOMAIN || 'localhost'}/api/calendar/callback`);
    const [tokens] = await db.execute('SELECT * FROM google_tokens LIMIT 1');
    if (tokens.length === 0) return null;
    oauth2Client.setCredentials({ access_token: tokens[0].access_token, refresh_token: tokens[0].refresh_token, expiry_date: tokens[0].expiry_date });
    return google.calendar({ version: 'v3', auth: oauth2Client });
}

app.get('/api/auth/google', requireAuth, async (req, res) => {
    const keys = await getAPIKeys();
    if (!keys.google_id || !keys.google_secret) return res.status(400).json({ error: 'Configura las API Keys primero' });
    const oauth2Client = new google.auth.OAuth2(keys.google_id, keys.google_secret, `https://${req.get('host')}/api/calendar/callback`);
    const url = oauth2Client.generateAuthUrl({ access_type: 'offline', scope: ['https://www.googleapis.com/auth/calendar'], prompt: 'consent' });
    res.json({ url });
});

app.get('/api/calendar/callback', async (req, res) => {
    const { code } = req.query;
    const keys = await getAPIKeys();
    const oauth2Client = new google.auth.OAuth2(keys.google_id, keys.google_secret, `https://${req.get('host')}/api/calendar/callback`);
    try {
        const { tokens } = await oauth2Client.getToken(code);
        await db.execute('DELETE FROM google_tokens');
        await db.execute('INSERT INTO google_tokens (access_token, refresh_token, expiry_date) VALUES (?,?,?)', [tokens.access_token, tokens.refresh_token, tokens.expiry_date]);
        res.send('<html><body style="font-family:sans-serif;text-align:center;padding:50px;"><h2>├â┬ó├àÔÇ£├óÔé¼┬ª Conectado con ├âãÆ├é┬®xito</h2><p>Ya puedes cerrar esta ventana.</p><script>window.close(); setTimeout(() => window.location.href="/connections", 2000);</script></body></html>');
    } catch (err) { res.status(500).send('Error al conectar: ' + err.message); }
});

app.get('/api/calendar/status', requireAuth, async (req, res) => {
    try {
        const [tokens] = await db.execute('SELECT id FROM google_tokens LIMIT 1');
        res.json({ connected: tokens.length > 0 });
    } catch (err) { res.json({ connected: false }); }
});

app.post('/api/calendar/disconnect', requireAuth, async (req, res) => {
    try {
        await db.execute('DELETE FROM google_tokens');
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- CRM DATA ---
app.get('/api/appointments/upcoming', requireAuth, async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT a.*, p.name as patient_name, p.phone as patient_phone
            FROM appointments a
            LEFT JOIN patients p ON a.patient_id = p.id
            WHERE a.appointment_date >= NOW()
              AND a.appointment_date <= DATE_ADD(NOW(), INTERVAL 7 DAY)
              AND a.status != 'cancelada'
            ORDER BY a.appointment_date ASC
            LIMIT 20
        `);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/notifications/stream', (req, res) => {
    // EventSource no soporta headers, aceptamos token por query param
    const token = req.query.token || req.headers['authorization']?.replace('Bearer ', '');
    if (!token || token !== ADMIN_TOKEN) {
        return res.status(401).end();
    }
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    const pingInterval = setInterval(() => {
        try { res.write('event: ping\ndata: {}\n\n'); } catch (e) { clearInterval(pingInterval); }
    }, 30000);
    sseClients.add(res);
    req.on('close', () => {
        clearInterval(pingInterval);
        sseClients.delete(res);
    });
});

// --- BRAND GENERATE PROMPT ---
app.post('/api/brand/generate-prompt', requireAuth, async (req, res) => {
    const { clinic_name, giro, tagline } = req.body;
    const keys = await getAPIKeys();
    if (!keys.gemini || !GoogleGenerativeAI) return res.status(503).json({ error: 'IA no configurada' });
    try {
        const genAI = new GoogleGenerativeAI(keys.gemini, { apiVersion: 'v1' });
        const [services] = await db.execute('SELECT name FROM services WHERE active = 1');
        const serviceList = services.map((s) => s.name).join(', ') || 'varios servicios';

        const negocio = clinic_name || 'Negocio';
        const giroNegocio = giro || 'Servicios';
        const eslogan = tagline || '';

        const prompt = `Genera un prompt de sistema (system prompt) profesional para un chatbot de WhatsApp de un negocio con las siguientes caracteristicas:
- Nombre: ${negocio}
- Giro: ${giroNegocio}
- Eslogan: ${eslogan}
- Servicios: ${serviceList}

El prompt debe:
1. Definir la personalidad del bot (amable, profesional, empatico)
2. Indicar el objetivo principal (agendar citas, responder dudas)
3. Especificar que debe responder en espa├▒ol
4. Incluir instrucciones para capturar el nombre del cliente
5. Ser conciso (maximo 200 palabras)
6. NO incluir etiquetas como __CITA__ o __DATOS__ (esas ya las maneja el sistema)

Responde SOLO con el prompt, sin explicaciones adicionales.`;

        const promptText = await callGemini(genAI, prompt);
        res.json({ prompt: promptText.trim() });
    } catch (err) {
        console.error('Error en generate-prompt:', err.message);
        res.status(500).json({ error: err.message });
    }
});
// --- IA STATUS ---
app.post('/api/brand/generate-landing', requireAuth, async (req, res) => {
    const { clinic_name, giro, tagline } = req.body;
    const keys = await getAPIKeys();
    if (!keys.gemini || !GoogleGenerativeAI) {
        console.error('ÔØî Error en generate-landing: Clave faltante o IA no cargada', { hasKey: !!keys.gemini, hasAI: !!GoogleGenerativeAI });
        return res.status(503).json({ error: 'IA no configurada' });
    }
    try {
        const genAI = new GoogleGenerativeAI(keys.gemini, { apiVersion: 'v1' });
        const [services] = await db.execute('SELECT name, description FROM services WHERE active = 1 LIMIT 8');
        const serviceList = services.map(s => `- ${s.name}${s.description ? ': ' + s.description : ''}`).join('\n') || '- Servicios profesionales';

        const negocio = clinic_name || 'Negocio';
        const giroNegocio = giro || 'Servicios';
        const eslogan = tagline || '';

        // Obtener datos adicionales de la marca para el prompt
        const [brandRows] = await db.execute('SELECT key_name, content FROM crm_settings WHERE section = "brand"');
        const rawDoctorName = brandRows.find(r => r.key_name === 'doctor_name')?.content;
        const specialistContext = rawDoctorName ? `Dr/Dra ${rawDoctorName}` : 'nuestro especialista';

        const prompt = `Eres un experto en marketing digital y copywriting para negocios de ${giroNegocio} en Mexico. 
Genera contenido persuasivo, moderno y atractivo para la landing page de este negocio:
- Nombre: ${negocio}
- Giro: ${giroNegocio}
- Eslogan actual: ${eslogan}
- Servicios ofrecidos:
${serviceList}

Genera el contenido estructurado EXACTAMENTE asi (sin asteriscos, sin markdown, solo el texto):

[HERO_TITULO]
Un titular poderoso, emocional e impactante de maximo 10 palabras.

[HERO_SUBTITULO]
Una promesa de transformacion en 2-3 oraciones. Habla de beneficios.

[SERVICIOS_TITULO]
Un titulo atractivo para la seccion de servicios (5-7 palabras).

[SERVICIOS_SUBTITULO]
Una descripcion persuasiva de la propuesta de valor en 1-2 oraciones.

[PROFESSIONAL_BIO]
Un parrafo de 3-4 oraciones que presente a ${specialistContext} resaltando la empatia, tecnologia y resultados.

[FAQ_Q1]
Pregunta 1 comun del giro.
[FAQ_A1]
Respuesta 1 profesional y tranquilizadora.

[FAQ_Q2]
Pregunta 2.
[FAQ_A2]
Respuesta 2.

[FAQ_Q3]
Pregunta 3.
[FAQ_A3]
Respuesta 3.

[FAQ_Q4]
Pregunta 4.
[FAQ_A4]
Respuesta 4.

Responde SOLO con las secciones indicadas, sin explicaciones adicionales.`;

        const text = await callGemini(genAI, prompt);

        // Parsear secciones
        const extract = (tag) => {
            const re = new RegExp(`\\[${tag}\\]\\s*([\\s\\S]*?)(?=\\[|$)`, 'i');
            const m = text.match(re);
            return m ? m[1].trim() : '';
        };

        const heroTitulo = extract('HERO_TITULO');
        const heroSubtitulo = extract('HERO_SUBTITULO');
        const servTitulo = extract('SERVICIOS_TITULO');
        const servSubtitulo = extract('SERVICIOS_SUBTITULO');
        const profBio = extract('PROFESSIONAL_BIO');

        // Guardar automaticamente en crm_settings
        const upsert = async (section, key_name, content) => {
            if (!content) return;
            await db.execute('DELETE FROM crm_settings WHERE section = ? AND key_name = ?', [section, key_name]);
            await db.execute('INSERT INTO crm_settings (section, key_name, content) VALUES (?, ?, ?)', [section, key_name, content]);
        };

        if (heroTitulo) await upsert('hero', 'title', heroTitulo);
        if (heroSubtitulo) await upsert('hero', 'subtitle', heroSubtitulo);
        if (servTitulo) await upsert('services', 'title', servTitulo);
        if (servSubtitulo) await upsert('services', 'subtitle', servSubtitulo);
        if (profBio) await upsert('professional', 'bio', profBio);

        // FAQs
        for(let i=1; i<=4; i++) {
            const q = extract(`FAQ_Q${i}`);
            const a = extract(`FAQ_A${i}`);
            if(q) await upsert('faq', `q${i}`, q);
            if(a) await upsert('faq', `a${i}`, a);
        }

        res.json({
            success: true,
            applied: { heroTitulo, heroSubtitulo, servTitulo, servSubtitulo, profBio }
        });
    } catch (err) {
        console.error('ÔØî Error en generate-landing:', err);
        res.status(500).json({ error: err.message });
    }
});



app.put('/api/services/:id', requireAuth, async (req, res) => {
    const { name, description, price, duration_minutes, active, image_url } = req.body;
    try {
        const fields = [];
        const params = [];
        if (name !== undefined) { fields.push('name = ?'); params.push(name); }
        if (description !== undefined) { fields.push('description = ?'); params.push(description); }
        if (price !== undefined) { fields.push('price = ?'); params.push(price); }
        if (duration_minutes !== undefined) { fields.push('duration_minutes = ?'); params.push(duration_minutes); }
        if (active !== undefined) { fields.push('active = ?'); params.push(active); }
        if (image_url !== undefined) { fields.push('image_url = ?'); params.push(image_url); }

        if (fields.length === 0) return res.json({ success: true });

        params.push(req.params.id);
        await db.execute(`UPDATE services SET ${fields.join(', ')} WHERE id = ?`, params);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/services/:id', requireAuth, async (req, res) => {
    try {
        await db.execute('DELETE FROM services WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
    if (fs.existsSync(path.join(distDir, 'index.html'))) res.sendFile(path.join(distDir, 'index.html'));
    else res.status(404).send('Not build');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', async () => {
    console.log(`🚀 Servidor en puerto ${PORT}`);
    await initDB();
    inicializarLibreriasYWhatsApp();
    setInterval(checkAppointmentReminders, 3600000);
});

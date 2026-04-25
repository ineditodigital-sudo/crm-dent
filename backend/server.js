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

let GoogleGenerativeAI;
let makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers;
let socket = null;
let lastQR = "";
let lastError = null;
const logs = [];

const sanitizeMsg = (msg) => String(msg).replace(/AIzaSy[\w-]+/g, 'AIzaSy***').replace(/GOCSPX-[\w-]+/g, 'GOCSPX-***');
const logHandler = (type, args) => {
    const msg = sanitizeMsg(args.map(a => a instanceof Error ? a.message : String(a)).join(' '));
    logs.unshift({ type, time: new Date().toISOString(), msg });
    if (logs.length > 100) logs.pop();
};
console.log = (...args) => { logHandler('info', args); process.stdout.write(args.join(' ') + '\n'); };
console.error = (...args) => { logHandler('error', args); process.stderr.write(args.join(' ') + '\n'); };

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || crypto.createHash('sha256').update(process.env.ADMIN_PASS || 'admin123').digest('hex');
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

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
const distDir = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distDir)) app.use(express.static(distDir));

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
        await db.execute(`CREATE TABLE IF NOT EXISTS patients (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255), phone VARCHAR(50) UNIQUE, email VARCHAR(255), service_interested VARCHAR(255), status VARCHAR(50) DEFAULT 'Lead', last_interaction TIMESTAMP NULL, manual_mode TINYINT(1) DEFAULT 0) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        await db.execute(`CREATE TABLE IF NOT EXISTS messages (id INT AUTO_INCREMENT PRIMARY KEY, patient_id INT, content TEXT, sender ENUM('patient', 'bot', 'admin', 'agent') DEFAULT 'patient', timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (patient_id) REFERENCES patients(id)) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        await db.execute(`CREATE TABLE IF NOT EXISTS appointments (id INT AUTO_INCREMENT PRIMARY KEY, patient_id INT, patient_name VARCHAR(255), appointment_date DATETIME, end_date DATETIME, description TEXT, source ENUM('bot', 'manual') DEFAULT 'manual', google_event_id VARCHAR(255), google_event_url TEXT, status VARCHAR(50) DEFAULT 'Pendiente', reminder_sent TINYINT(1) DEFAULT 0, FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        await db.execute(`CREATE TABLE IF NOT EXISTS crm_settings (id INT AUTO_INCREMENT PRIMARY KEY, section VARCHAR(50), key_name VARCHAR(100), content TEXT) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        
        // Limpiar duplicados antes de poner la clave única
        try {
            await db.execute(`
                DELETE t1 FROM crm_settings t1
                INNER JOIN crm_settings t2 
                WHERE t1.id < t2.id AND t1.section = t2.section AND t1.key_name = t2.key_name
            `);
            await db.execute('ALTER TABLE crm_settings ADD UNIQUE KEY section_key (section, key_name)');
            console.log('✅ Clave única añadida a crm_settings');
        } catch (e) { 
            console.log('ℹ️ Nota: La clave única ya existía o no se pudo crear (pero se intentó limpiar)');
        }
        
        await db.execute(`CREATE TABLE IF NOT EXISTS google_tokens (id INT AUTO_INCREMENT PRIMARY KEY, access_token TEXT, refresh_token TEXT, expiry_date BIGINT)`);
        await db.execute(`CREATE TABLE IF NOT EXISTS brand_settings (key_name VARCHAR(100) PRIMARY KEY, value TEXT) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        console.log('✅ Base de datos lista.');
    } catch (err) { console.error('❌ Error Init DB:', err.message); }
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
app.get('/api/settings/keys-status', requireAuth, async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT key_name FROM crm_settings WHERE section = "api_keys" AND content IS NOT NULL AND content != ""');
        res.json({ configured: rows.map(r => r.key_name) });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/settings/:section', requireAuth, async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT key_name, content FROM crm_settings WHERE section = ?', [req.params.section]);
        res.json(rows.reduce((acc, r) => { acc[r.key_name] = r.content; return acc; }, {}));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/settings/:section?', requireAuth, async (req, res) => {
    try {
        let section = req.params.section || req.body.section;
        const data = req.params.section ? req.body : { [req.body.key_name]: req.body.content };
        
        if (!section) return res.status(400).json({ error: 'Sección no especificada' });
        
        console.log(`💾 Guardando configuración para sección: ${section}`, Object.keys(data));
        
        for (const [k, v] of Object.entries(data)) {
            if (k && v !== undefined && k !== 'section') {
                await db.execute('DELETE FROM crm_settings WHERE section = ? AND key_name = ?', [section, k]);
                await db.execute(
                    'INSERT INTO crm_settings (section, key_name, content) VALUES (?,?,?)',
                    [section, k, v]
                );
            }
        }
        res.json({ success: true });
    } catch (err) {
        console.error('❌ Error al guardar settings:', err.message);
        res.status(500).json({ error: 'Fallo al guardar: ' + err.message });
    }
});

// --- GOOGLE API HELPERS ---
async function getAPIKeys() {
    try {
        const [rows] = await db.execute('SELECT key_name, content FROM crm_settings WHERE section = "api_keys"');
        const k = rows.reduce((acc, r) => { acc[r.key_name] = r.content; return acc; }, {});
        return { 
            gemini: k.gemini_key || process.env.GEMINI_API_KEY, 
            google_id: k.google_id || process.env.GOOGLE_CLIENT_ID, 
            google_secret: k.google_secret || process.env.GOOGLE_CLIENT_SECRET 
        };
    } catch (e) { return { gemini: process.env.GEMINI_API_KEY }; }
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
        res.send('<html><body style="font-family:sans-serif;text-align:center;padding:50px;"><h2>✅ Conectado con éxito</h2><p>Ya puedes cerrar esta ventana.</p><script>window.close(); setTimeout(() => window.location.href="/connections", 2000);</script></body></html>');
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
app.get('/api/stats', requireAuth, async (req, res) => {
    try {
        const [[p]] = await db.execute('SELECT COUNT(*) as total FROM patients');
        const [[m]] = await db.execute('SELECT COUNT(*) as total FROM messages WHERE sender = "bot"');
        const [[a]] = await db.execute('SELECT COUNT(*) as total FROM appointments WHERE DATE(appointment_date) = CURDATE()');
        res.json({ totalLeads: p.total, botMessages: m.total, todayApps: a.total, conversion: "0%", connected: !!socket });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/conversations', requireAuth, async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT p.id, p.name, p.phone, p.status, p.last_interaction, p.manual_mode,
                   COUNT(m.id) as message_count, MAX(m.timestamp) as last_message_time,
                   (SELECT content FROM messages WHERE patient_id = p.id ORDER BY id DESC LIMIT 1) as last_message
            FROM patients p
            LEFT JOIN messages m ON m.patient_id = p.id
            GROUP BY p.id ORDER BY last_message_time DESC
        `);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/conversations/:id/messages', requireAuth, async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM messages WHERE patient_id = ? ORDER BY id ASC', [req.params.id]);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/conversations/:id', requireAuth, async (req, res) => {
    try {
        await db.execute('DELETE FROM messages WHERE patient_id = ?', [req.params.id]);
        await db.execute('UPDATE patients SET last_interaction = NULL WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/conversations/:id/status', requireAuth, async (req, res) => {
    try {
        await db.execute('UPDATE patients SET status = ? WHERE id = ?', [req.body.status, req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/patients', requireAuth, async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM patients ORDER BY last_interaction DESC');
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/patients/:id', requireAuth, async (req, res) => {
    try {
        await db.execute('DELETE FROM messages WHERE patient_id = ?', [req.params.id]);
        await db.execute('DELETE FROM appointments WHERE patient_id = ?', [req.params.id]);
        await db.execute('DELETE FROM patients WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/patients/:id/toggle-manual', requireAuth, async (req, res) => {
    try {
        await db.execute('UPDATE patients SET manual_mode = ? WHERE id = ?', [req.body.manual_mode ? 1 : 0, req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- APPOINTMENTS ---
app.get('/api/appointments', requireAuth, async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM appointments ORDER BY appointment_date ASC');
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/appointments', requireAuth, async (req, res) => {
    const { patient_id, appointment_date, description } = req.body;
    try {
        const [p] = await db.execute('SELECT name FROM patients WHERE id = ?', [patient_id]);
        const pName = p[0]?.name || 'Paciente';
        const start = new Date(appointment_date);
        const end = new Date(start.getTime() + 60 * 60 * 1000);
        let gId = null, gUrl = null;
        try {
            const cal = await getCalendarClient();
            if (cal) {
                const event = await cal.events.insert({ calendarId: 'primary', requestBody: { summary: `Cita: ${pName}`, description, start: { dateTime: start.toISOString() }, end: { dateTime: end.toISOString() } } });
                gId = event.data.id; gUrl = event.data.htmlLink;
            }
        } catch (e) { console.error('Error GCal:', e.message); }
        await db.execute('INSERT INTO appointments (patient_id, patient_name, appointment_date, end_date, description, google_event_id, google_event_url) VALUES (?,?,?,?,?,?,?)', [patient_id, pName, appointment_date, end.toISOString().slice(0, 19).replace('T', ' '), description, gId, gUrl]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- BRANDING ---
app.get('/api/brand', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM brand_settings');
        res.json(rows.reduce((acc, r) => { acc[r.key_name] = r.value; return acc; }, {}));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/brand', requireAuth, async (req, res) => {
    try {
        for (const [k, v] of Object.entries(req.body)) {
            await db.execute('INSERT INTO brand_settings (key_name, value) VALUES (?,?) ON DUPLICATE KEY UPDATE value = ?', [k, v, v]);
        }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/brand/upload', requireAuth, upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No se subió ningún archivo' });
    const url = `/uploads/${req.file.filename}`;
    res.json({ success: true, url });
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
            if (u.qr) lastQR = u.qr;
            if (u.connection === 'open') { lastQR = ""; lastError = null; console.log('✅ WhatsApp conectado'); }
            if (u.connection === 'close') {
                const code = u.lastDisconnect?.error?.output?.statusCode;
                if (code !== DisconnectReason.loggedOut) setTimeout(connectToWhatsApp, 3000);
            }
        });
        socket.ev.on('messages.upsert', async ({ messages }) => {
            const m = messages[0];
            if (!m.message || m.key.fromMe) return;
            const sender = m.key.remoteJid.replace('@s.whatsapp.net', '');
            const text = m.message.conversation || 
                         m.message.extendedTextMessage?.text || 
                         m.message.imageMessage?.caption || 
                         m.message.videoMessage?.caption || 
                         m.message.buttonsResponseMessage?.selectedButtonId || 
                         m.message.listResponseMessage?.title || '';
            
            console.log(`📩 Recibido de ${sender}: ${text}`);

            let [rows] = await db.execute('SELECT * FROM patients WHERE phone = ?', [sender]);
            let pId, pName, pManual;
            if (rows.length === 0) {
                console.log(`🆕 Creando nuevo paciente para ${sender}`);
                const [res] = await db.execute('INSERT INTO patients (name, phone) VALUES (?, ?)', ['Nuevo Paciente', sender]);
                pId = res.insertId; pName = 'Nuevo Paciente'; pManual = 0;
            } else { 
                pId = rows[0].id; pName = rows[0].name; pManual = rows[0].manual_mode;
            }

            console.log(`💾 Guardando mensaje en DB para paciente ${pId}`);
            await db.execute('INSERT INTO messages (patient_id, content, sender) VALUES (?, ?, ?)', [pId, text, 'patient']);
            await db.execute('UPDATE patients SET last_interaction = CURRENT_TIMESTAMP WHERE id = ?', [pId]);

            const keys = await getAPIKeys();
            if (keys.gemini && GoogleGenerativeAI && pManual !== 1) {
                try {
                    console.log(`🤖 Generando respuesta para ${sender}...`);
                    
                    const [settings] = await db.execute('SELECT key_name, content FROM crm_settings WHERE section IN ("ai_context", "api_keys")');
                    const config = settings.reduce((acc, r) => { acc[r.key_name] = r.content; return acc; }, {});
                    
                    const personality = config.personality || 'Eres un asistente dental amable.';
                    const services = config.services || 'Limpieza, Blanqueamiento, Ortodoncia.';
                    
                    const genAI = new GoogleGenerativeAI(keys.gemini);
                    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
                    
                    const hasName = pName && !pName.toLowerCase().includes('nuevo paciente');
                    const prompt = `${personality}
                    
SERVICIOS: ${services}

REGLAS:
1. Si no sabes el nombre del paciente, pídeselo amablemente.
2. Si te dice su nombre, responde con: __DATOS|nombre=NombreRecibido__
3. Sé breve y profesional.

Estado: ${hasName ? `Nombre: ${pName}` : 'Nombre desconocido'}
Paciente: ${text}
Asistente:`;

                    const result = await model.generateContent(prompt);
                    let botMsg = result.response.text();

                    const nameMatch = botMsg.match(/__DATOS\|nombre=(.*?)__/);
                    if (nameMatch) {
                        const newName = nameMatch[1].trim();
                        await db.execute('UPDATE patients SET name = ? WHERE id = ?', [newName, pId]);
                        botMsg = botMsg.replace(nameMatch[0], '').trim();
                        console.log(`👤 Nombre capturado: ${newName}`);
                    }

                    await socket.sendMessage(m.key.remoteJid, { text: botMsg });
                    await db.execute('INSERT INTO messages (patient_id, content, sender) VALUES (?, ?, ?)', [pId, botMsg, 'bot']);
                    console.log(`✅ Respuesta enviada.`);
                } catch (e) { console.error('❌ Error Gemini:', e.message); }
            } else {
                console.log(`⚠️ Bot omitido. Gemini: ${!!keys.gemini}, AI: ${!!GoogleGenerativeAI}, Manual: ${pManual}`);
            }
        });
    } catch (e) { console.error('❌ Error Socket:', e.message); }
}

app.get('/api/whatsapp/status', requireAuth, (req, res) => res.json({ connected: !!(socket?.user), qr: lastQR, error: lastError }));

// --- START ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', async () => {
    console.log(`🚀 Servidor en puerto ${PORT}`);
    await initDB();
    inicializarLibreriasYWhatsApp();
});

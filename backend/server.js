const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');
const crypto = require('crypto');
const multer = require('multer');

// MÃƒÂ³dulos con carga opcional
let google, pino;
try { google = require('googleapis').google; } catch (e) { console.error('googleapis no disponible'); }
try { pino = require('pino'); } catch (e) { }

let helmet, rateLimit;
try { helmet = require('helmet'); } catch (e) { }
try { rateLimit = require('express-rate-limit'); } catch (e) { }

dotenv.config({ path: path.resolve(__dirname, '.env') });
if (!process.env.ADMIN_USER) dotenv.config({ path: path.resolve(__dirname, '../.env') });
console.log('📝 Configuración cargada. DB_HOST:', process.env.DB_HOST || 'No definido', 'GEMINI_KEY present:', !!process.env.GEMINI_API_KEY);

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
console.log('📂 Carpeta dist detectada en:', distDir);
console.log('📂 Carpeta de uploads configurada en:', uploadDir);
try {
    if (!fs.existsSync(uploadDir)) {
        console.log('📂 Directorio de uploads no existe. Creando en:', uploadDir);
        fs.mkdirSync(uploadDir, { recursive: true, mode: 0o755 });
    } else {
        console.log('📂 Directorio de uploads detectado en:', uploadDir);
    }
    // Asegurar permisos en cada inicio por si acaso
    fs.chmodSync(uploadDir, 0o755);

    // Crear .htaccess para permitir acceso directo a archivos y evitar redirecciones SPA
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
// Debug para archivos no encontrados en /uploads
app.use('/uploads', (req, res) => {
    console.error(`⚠️ Archivo no encontrado en uploads: ${req.url} (Buscando en: ${path.join(uploadDir, req.url)})`);
    res.status(404).send('Archivo no encontrado');
});
if (fs.existsSync(distDir)) app.use(express.static(distDir));

// Helper: llama a Gemini con retry automático y fallback de modelos (vía Fetch directo a V1)
async function callGemini(genAI, prompt, retries = 2) {
    const apiKey = genAI.apiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('No se encontró API Key para Gemini');

    const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro'];
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
                        body: JSON.stringify({
                            contents: [{ parts: [{ text: prompt }] }]
                        })
                    });

                    const data = await response.json();
                    
                    if (!response.ok) {
                        const errorMsg = data.error?.message || `Error ${response.status}`;
                        throw new Error(errorMsg);
                    }

                    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
                        throw new Error('Respuesta de IA vacía o malformada');
                    }

                    const text = data.candidates[0].content.parts[0].text;
                    console.log(`✅ Éxito con modelo: ${modelName}`);
                    return text;
                } catch (err) {
                    if (err.message && err.message.includes('429') && i < retries - 1) {
                        const wait = (i + 1) * 10000;
                        console.log(`⏳ Rate limit (429) en ${modelName}, reintentando en ${wait / 1000}s...`);
                        await new Promise(r => setTimeout(r, wait));
                    } else {
                        throw err;
                    }
                }
            }
        } catch (err) {
            lastError = err;
            console.error(`⚠️ Falló modelo ${modelName}:`, err.message);
            // Si es 404 o el modelo no existe en V1, probamos el siguiente
            if (err.message.includes('404') || err.message.includes('not found') || err.message.includes('503')) continue;
            throw err;
        }
    }
    throw lastError || new Error('No se pudo conectar con ningún modelo de Gemini');
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
        console.log('Ã°Å¸â€œÂ¦ Inicializando base de datos...');
        await db.execute(`CREATE TABLE IF NOT EXISTS patients (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255), phone VARCHAR(50) UNIQUE, email VARCHAR(255), service_interested VARCHAR(255), status VARCHAR(50) DEFAULT 'lead', last_interaction TIMESTAMP NULL, manual_mode TINYINT(1) DEFAULT 0) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        await db.execute(`CREATE TABLE IF NOT EXISTS messages (id INT AUTO_INCREMENT PRIMARY KEY, patient_id INT, content TEXT, sender ENUM('patient', 'bot', 'admin', 'agent') DEFAULT 'patient', timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (patient_id) REFERENCES patients(id)) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        await db.execute(`CREATE TABLE IF NOT EXISTS appointments (id INT AUTO_INCREMENT PRIMARY KEY, patient_id INT, patient_name VARCHAR(255), appointment_date DATETIME, end_date DATETIME, description TEXT, source ENUM('bot', 'manual') DEFAULT 'manual', google_event_id VARCHAR(255), google_event_url TEXT, status VARCHAR(50) DEFAULT 'pendiente', reminder_sent TINYINT(1) DEFAULT 0, FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        await db.execute(`CREATE TABLE IF NOT EXISTS crm_settings (id INT AUTO_INCREMENT PRIMARY KEY, section VARCHAR(50), key_name VARCHAR(100), content TEXT) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);

        // Limpiar duplicados antes de poner la clave ÃƒÂºnica
        try {
            await db.execute(`
                DELETE t1 FROM crm_settings t1
                INNER JOIN crm_settings t2 
                WHERE t1.id < t2.id AND t1.section = t2.section AND t1.key_name = t2.key_name
            `);
            await db.execute('ALTER TABLE crm_settings ADD UNIQUE KEY section_key (section, key_name)');
            console.log('Ã¢Å“â€¦ Clave ÃƒÂºnica aÃƒÂ±adida a crm_settings');
        } catch (e) {
            console.log('Ã¢â€žÂ¹Ã¯Â¸Â Nota: La clave ÃƒÂºnica ya existÃƒÂ­a o no se pudo crear (pero se intentÃƒÂ³ limpiar)');
        }

        await db.execute(`CREATE TABLE IF NOT EXISTS google_tokens (id INT AUTO_INCREMENT PRIMARY KEY, access_token TEXT, refresh_token TEXT, expiry_date BIGINT)`);
        await db.execute(`CREATE TABLE IF NOT EXISTS brand_settings (key_name VARCHAR(100) PRIMARY KEY, value TEXT) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        await db.execute(`CREATE TABLE IF NOT EXISTS services (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255) NOT NULL, description TEXT, price DECIMAL(10,2), duration_minutes INT DEFAULT 60, active TINYINT(1) DEFAULT 1) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);

        // --- MIGRACIONES AUTOMÃƒÂTICAS (para tablas ya existentes) ---
        const migrations = [
            `ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reminder_sent TINYINT(1) DEFAULT 0`,
            `ALTER TABLE appointments ADD COLUMN IF NOT EXISTS patient_name VARCHAR(255)`,
            `ALTER TABLE appointments ADD COLUMN IF NOT EXISTS end_date DATETIME`,
            `ALTER TABLE appointments ADD COLUMN IF NOT EXISTS description TEXT`,
            `ALTER TABLE appointments ADD COLUMN IF NOT EXISTS source ENUM('bot','manual') DEFAULT 'manual'`,
            `ALTER TABLE appointments ADD COLUMN IF NOT EXISTS google_event_url TEXT`,
            `ALTER TABLE patients ADD COLUMN IF NOT EXISTS service_interested VARCHAR(255)`,
            `ALTER TABLE patients ADD COLUMN IF NOT EXISTS manual_mode TINYINT(1) DEFAULT 0`,
            `ALTER TABLE services ADD COLUMN IF NOT EXISTS image_url TEXT`,
        ];
        for (const m of migrations) {
            try { await db.execute(m); } catch (e) { /* columna ya existe */ }
        }
        console.log('Ã¢Å“â€¦ Base de datos lista y migrada.');
    } catch (err) { console.error('? Error Init DB:', err); }


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

// --- SETTINGS (Public para la Landing) ---
app.get('/api/public/settings', async (req, res) => {
    try {
        const publicSections = ['hero', 'services', 'contact', 'images', 'theme', 'ai_context', 'faq', 'professional', 'seo'];
        const [crmRows] = await db.execute('SELECT section, key_name, content FROM crm_settings WHERE section IN (?, ?, ?, ?, ?, ?, ?, ?, ?)', publicSections);
        const [brandRows] = await db.execute('SELECT key_name, value FROM brand_settings');
        const [serviceRows] = await db.execute('SELECT name, description, price, image_url FROM services WHERE active = 1');

        const settings = crmRows.reduce((acc, r) => {
            if (!acc[r.section]) acc[r.section] = {};
            acc[r.section][r.key_name] = r.content;
            return acc;
        }, {});

        settings.brand = brandRows.reduce((acc, r) => {
            acc[r.key_name] = r.value;
            return acc;
        }, {});

        settings.services_list = serviceRows;

        res.json(settings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- SEO DYNAMICS (Sitemap & Robots) ---
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

        // Añadir servicios si se desea (aunque sean secciones anchor, ayuda a la indexación de keywords)
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
app.get('/api/settings', requireAuth, async (req, res) => {
    try {
        const [crmRows] = await db.execute('SELECT section, key_name, content FROM crm_settings');
        const [brandRows] = await db.execute('SELECT key_name, value FROM brand_settings');

        const settings = crmRows.reduce((acc, r) => {
            if (!acc[r.section]) acc[r.section] = {};
            acc[r.section][r.key_name] = r.content;
            return acc;
        }, {});

        settings.brand = brandRows.reduce((acc, r) => {
            acc[r.key_name] = r.value;
            return acc;
        }, {});

        res.json(settings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
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
                if (section === 'brand') {
                    await db.execute('INSERT INTO brand_settings (key_name, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = ?', [k, v, v]);
                } else {
                    await db.execute('DELETE FROM crm_settings WHERE section = ? AND key_name = ?', [section, k]);
                    await db.execute(
                        'INSERT INTO crm_settings (section, key_name, content) VALUES (?,?,?)',
                        [section, k, v]
                    );
                }
            }
        }
        res.json({ success: true });
    } catch (err) {
        console.error('❌ Error al guardar settings:', err.message);
        res.status(500).json({ error: 'Fallo al guardar: ' + err.message });
    }
});

app.get('/api/settings/keys-status', requireAuth, async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT key_name FROM crm_settings WHERE section = "api_keys" AND content IS NOT NULL AND content != ""');
        res.json({ configured: rows.map(r => r.key_name) });
    } catch (err) { res.status(500).json({ error: err.message }); }
});//('Ã¢ÂÅ’ Error al guardar settings:', err.message);


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
        res.send('<html><body style="font-family:sans-serif;text-align:center;padding:50px;"><h2>Ã¢Å“â€¦ Conectado con ÃƒÂ©xito</h2><p>Ya puedes cerrar esta ventana.</p><script>window.close(); setTimeout(() => window.location.href="/connections", 2000);</script></body></html>');
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

app.post('/api/conversations/:id/send', requireAuth, async (req, res) => {
    const { content } = req.body;
    const { id } = req.params;
    try {
        const [patient] = await db.execute('SELECT phone, status FROM patients WHERE id = ?', [id]);
        if (patient.length === 0) return res.status(404).json({ error: 'Paciente no encontrado' });

        if (socket) {
            const jid = patient[0].phone.includes('@') ? patient[0].phone : `${patient[0].phone}@s.whatsapp.net`;
            await socket.sendMessage(jid, { text: content });
            await db.execute('INSERT INTO messages (patient_id, content, sender) VALUES (?, ?, ?)', [id, content, 'agent']);
            await db.execute('UPDATE patients SET last_interaction = CURRENT_TIMESTAMP WHERE id = ?', [id]);
            // Si era lead y el humano contacta, pasa a prospecto
            if (patient[0].status === 'lead') {
                await db.execute('UPDATE patients SET status = ? WHERE id = ?', ['prospecto', id]);
            }
            res.json({ success: true });
        } else {
            res.status(503).json({ error: 'WhatsApp no conectado' });
        }
    } catch (err) {
        console.error('Ã¢ÂÅ’ Error enviando mensaje:', err.message);
        res.status(500).json({ error: err.message });
    }
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

app.patch('/api/patients/:id/status', requireAuth, async (req, res) => {
    const { status } = req.body;
    const allowed = ['lead', 'nuevo', 'prospecto', 'frecuente', 'especial'];
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Estado no vÃƒÂ¡lido' });
    try {
        await db.execute('UPDATE patients SET status = ? WHERE id = ?', [status, req.params.id]);
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
        await db.execute('INSERT INTO appointments (patient_id, patient_name, appointment_date, end_date, description, google_event_id, google_event_url) VALUES (?,?,?,?,?,?,?)', [patient_id, pName, appointment_date, end.toISOString().slice(0, 19).replace('T', ' '), description || null, gId || null, gUrl || null]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

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

app.patch('/api/appointments/:id/cancel', requireAuth, async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT google_event_id FROM appointments WHERE id = ?', [req.params.id]);
        await db.execute('UPDATE appointments SET status = ? WHERE id = ?', ['cancelada', req.params.id]);
        if (rows[0]?.google_event_id) {
            try {
                const calendar = await getCalendarClient();
                if (calendar) await calendar.events.delete({ calendarId: 'primary', eventId: rows[0].google_event_id });
            } catch (e) { console.error('Ã¢Å¡Â Ã¯Â¸Â No se pudo borrar de GCal:', e.message); }
        }
        broadcastSSE('appointment_cancelled', { id: req.params.id });
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

app.post('/api/brand/upload', requireAuth, (req, res, next) => {
    upload.single('image')(req, res, (err) => {
        if (err) {
            console.error('❌ Error de Multer:', err.message);
            return res.status(500).json({ error: 'Error en el servidor al procesar la imagen: ' + err.message });
        }
        if (!req.file) {
            console.error('❌ No se recibió ningún archivo en req.file');
            return res.status(400).json({ error: 'No se subió ningún archivo' });
        }
        console.log('✅ Archivo subido con éxito:', req.file.filename);
        console.log('📍 Guardado en:', path.join(uploadDir, req.file.filename));
        const url = `/uploads/${req.file.filename}`;

        // Forzar permisos de lectura 644 para que Apache pueda servirlos
        try {
            fs.chmodSync(req.file.path, 0o644);
            if (fs.existsSync(req.file.path)) {
                console.log('✅ Archivo verificado físicamente en el disco:', req.file.path);
            } else {
                console.error('❌ El archivo NO se encuentra donde debería tras guardarse:', req.file.path);
            }
        } catch (chmodErr) {
            console.error('⚠️ No se pudieron aplicar permisos 644:', chmodErr.message);
        }

        res.json({ success: true, url });
    });
});

app.post('/api/brand/upload-logo', requireAuth, (req, res) => {
    upload.single('logo')(req, res, async (err) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!req.file) return res.status(400).json({ error: 'No se subió ningún archivo' });
        const url = `/uploads/${req.file.filename}`;
        try {
            fs.chmodSync(req.file.path, 0o644);
            await db.execute('INSERT INTO brand_settings (key_name, value) VALUES (?,?) ON DUPLICATE KEY UPDATE value = ?', ['logo_url', url, url]);
            res.json({ success: true, url });
        } catch (err) { res.status(500).json({ error: err.message }); }
    });
});

app.post('/api/brand/upload-favicon', requireAuth, (req, res) => {
    upload.single('favicon')(req, res, async (err) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!req.file) return res.status(400).json({ error: 'No se subió ningún archivo' });
        const url = `/uploads/${req.file.filename}`;
        try {
            fs.chmodSync(req.file.path, 0o644);
            await db.execute('INSERT INTO brand_settings (key_name, value) VALUES (?,?) ON DUPLICATE KEY UPDATE value = ?', ['favicon_url', url, url]);
            res.json({ success: true, url });
        } catch (err) { res.status(500).json({ error: err.message }); }
    });
});

app.get('/api/brand', requireAuth, async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT key_name, value FROM brand_settings');
        const brand = rows.reduce((acc, r) => {
            acc[r.key_name] = r.value;
            return acc;
        }, {});
        res.json(brand);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Alias para Web Editor
app.post('/api/upload', requireAuth, (req, res) => {
    upload.single('image')(req, res, (err) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!req.file) return res.status(400).json({ error: 'No se subió ningún archivo' });
        try {
            fs.chmodSync(req.file.path, 0o644);
            res.json({ success: true, url: `/uploads/${req.file.filename}` });
        } catch (chmodErr) {
            res.status(500).json({ error: chmodErr.message });
        }
    });
});

// SSE Ã¢â‚¬â€ Notificaciones en tiempo real
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
3. Especificar que debe responder en español
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
app.get('/api/ia-status', requireAuth, async (req, res) => {
    const keys = await getAPIKeys();
    res.json({
        gemini_configured: !!keys.gemini,
        gemini_library_loaded: !!GoogleGenerativeAI,
        node_version: process.version,
        env_key_present: !!process.env.GEMINI_API_KEY
    });
});
// --- BRAND GENERATE LANDING ---
app.post('/api/brand/generate-landing', requireAuth, async (req, res) => {
    const { clinic_name, giro, tagline } = req.body;
    const keys = await getAPIKeys();
    if (!keys.gemini || !GoogleGenerativeAI) {
        console.error('❌ Error en generate-landing: Clave faltante o IA no cargada', { hasKey: !!keys.gemini, hasAI: !!GoogleGenerativeAI });
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
        console.error('❌ Error en generate-landing:', err);
        res.status(500).json({ error: err.message });
    }
});

// --- REPORTS ---

app.get('/api/reports', requireAuth, async (req, res) => {
    try {
        const [[t]] = await db.execute(`
            SELECT 
                (SELECT COUNT(*) FROM patients) as total_patients,
                (SELECT COUNT(*) FROM patients WHERE status = 'lead') as total_leads,
                (SELECT COUNT(*) FROM patients WHERE status IN ('nuevo', 'prospecto', 'frecuente', 'especial', 'Paciente', 'Interesado')) as total_converted,
                (SELECT COUNT(*) FROM appointments WHERE status != 'cancelada') as total_appointments,
                (SELECT COUNT(*) FROM appointments WHERE source = 'bot' AND status != 'cancelada') as bot_appointments,
                (SELECT COUNT(*) FROM messages WHERE sender = 'bot') as bot_messages
        `);

        const [byService] = await db.execute(`
            SELECT service_interested as service, COUNT(*) as count 
            FROM patients WHERE service_interested IS NOT NULL AND service_interested != ''
            GROUP BY service_interested ORDER BY count DESC LIMIT 5
        `);

        const [byStatus] = await db.execute(`
            SELECT status, COUNT(*) as count 
            FROM patients GROUP BY status ORDER BY count DESC
        `);

        const [recentApps] = await db.execute(`
            SELECT * FROM appointments 
            WHERE status != 'cancelada' 
            ORDER BY appointment_date DESC LIMIT 5
        `);

        res.json({ totals: t, byService, byStatus, recentApps });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/reports/ai', requireAuth, async (req, res) => {
    const keys = await getAPIKeys();
    if (!keys.gemini || !GoogleGenerativeAI) return res.status(503).json({ error: 'IA no configurada' });

    try {
        const genAI = new GoogleGenerativeAI(keys.gemini, { apiVersion: 'v1' });

        // Recopilar datos bÃƒÂ¡sicos para que la IA los analice
        const [[t]] = await db.execute(`
            SELECT 
                (SELECT COUNT(*) FROM patients) as total_patients,
                (SELECT COUNT(*) FROM appointments WHERE source = 'bot') as bot_appointments
        `);

        const prompt = `ActÃƒÂºa como un consultor de negocios y analiza estas mÃƒÂ©tricas de una clÃƒÂ­nica:
- Total de pacientes registrados: ${t.total_patients}
- Citas generadas automÃƒÂ¡ticamente por el bot: ${t.bot_appointments}

Escribe un reporte MUY BREVE (mÃƒÂ¡ximo 3 pÃƒÂ¡rrafos cortos) con:
1. Una observaciÃƒÂ³n sobre el desempeÃƒÂ±o actual.
2. Una recomendaciÃƒÂ³n clara para mejorar la retenciÃƒÂ³n o las ventas.
3. Un tono motivador y profesional.
Escribe en texto plano, sin negritas ni markdown, usando viÃƒÂ±etas simples (Ã¢â‚¬Â¢) si es necesario.`;

        const reportText = await callGemini(genAI, prompt);
        res.json({ report: reportText });
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
        const [res_db] = await db.execute(
            'INSERT INTO services (name, description, price, duration_minutes, active, image_url) VALUES (?,?,?,?,?,?)',
            [name, description, price || null, duration_minutes || 60, active !== undefined ? active : 1, image_url || null]
        );
        res.json({ success: true, id: res_db.insertId });
    } catch (err) { res.status(500).json({ error: err.message }); }
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

// --- REPORTS ---
app.get('/api/reports', requireAuth, async (req, res) => {
    try {
        const [totals] = await db.execute(`
            SELECT 
                (SELECT COUNT(*) FROM patients) as total_patients,
                (SELECT COUNT(*) FROM patients WHERE status = 'Lead' OR status = 'Interesado') as total_leads,
                (SELECT COUNT(*) FROM patients WHERE status = 'Paciente') as total_converted,
                (SELECT COUNT(*) FROM appointments) as total_appointments,
                (SELECT COUNT(*) FROM appointments WHERE source = 'bot') as bot_appointments,
                (SELECT COUNT(*) FROM messages WHERE sender = 'bot') as bot_messages
        `);

        const [byService] = await db.execute(`
            SELECT service_interested as service, COUNT(*) as count 
            FROM patients 
            WHERE service_interested IS NOT NULL AND service_interested != ''
            GROUP BY service_interested 
            ORDER BY count DESC
        `);

        const [byStatus] = await db.execute(`
            SELECT status, COUNT(*) as count 
            FROM patients 
            GROUP BY status
        `);

        const [recentApps] = await db.execute(`
            SELECT a.*, p.name as patient_name 
            FROM appointments a 
            LEFT JOIN patients p ON a.patient_id = p.id 
            ORDER BY a.appointment_date DESC LIMIT 5
        `);

        res.json({
            totals: totals[0],
            byService,
            byStatus,
            recentApps
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/reports/ai', requireAuth, async (req, res) => {
    try {
        const [totals] = await db.execute(`
            SELECT 
                (SELECT COUNT(*) FROM patients) as patients,
                (SELECT COUNT(*) FROM appointments) as apps,
                (SELECT COUNT(*) FROM appointments WHERE source = 'bot') as bot_apps,
                (SELECT COUNT(*) FROM messages WHERE sender = 'bot') as bot_msgs
        `);
        const stats = totals[0];
        const keys = await getAPIKeys();

        if (keys.gemini && GoogleGenerativeAI) {
            const genAI = new GoogleGenerativeAI(keys.gemini, { apiVersion: 'v1' });
            const prompt = `Analiza estas mÃƒÂ©tricas de una clÃƒÂ­nica dental y da un resumen estratÃƒÂ©gico breve (3 pÃƒÂ¡rrafos):
            - Total pacientes: ${stats.patients}
            - Citas totales: ${stats.apps}
            - Citas agendadas por el bot: ${stats.bot_apps}
            - Mensajes enviados por el bot: ${stats.bot_msgs}
            
            EnfÃƒÂ³cate en la eficiencia del bot y sugerencias para mejorar la conversiÃƒÂ³n.`;

            const reportText = await callGemini(genAI, prompt);
            res.json({ report: reportText });
        } else {
            res.status(503).json({ error: 'IA no configurada' });
        }
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
    } catch (e) { console.error('Error librerÃƒÂ­as:', e.message); }
}

async function connectToWhatsApp() {
    try {
        const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
        socket = makeWASocket({ auth: state, printQRInTerminal: true, browser: Browsers.appropriate('Chrome') });
        socket.ev.on('creds.update', saveCreds);
        socket.ev.on('connection.update', (u) => {
            if (u.connection) connectionState = u.connection;
            if (u.qr) lastQR = u.qr;
            if (u.connection === 'open') {
                lastQR = "";
                lastError = null;
                console.log('Ã¢Å“â€¦ WhatsApp conectado');
            }
            if (u.connection === 'close') {
                const code = u.lastDisconnect?.error?.output?.statusCode;
                console.log(`Ã°Å¸â€Å’ ConexiÃƒÂ³n cerrada. CÃƒÂ³digo: ${code}`);

                if (code === DisconnectReason.loggedOut) {
                    console.log('Ã°Å¸Å¡Âª SesiÃƒÂ³n cerrada por el usuario. Limpiando datos...');
                    lastQR = "";
                    socket = null;
                    connectionState = 'close';
                    if (fs.existsSync('auth_info_baileys')) {
                        try {
                            fs.rmSync('auth_info_baileys', { recursive: true, force: true });
                        } catch (e) { console.error('Error al borrar sesiÃƒÂ³n:', e.message); }
                    }
                    setTimeout(connectToWhatsApp, 2000);
                } else {
                    setTimeout(connectToWhatsApp, 3000);
                }
            }
        });
        socket.ev.on('messages.upsert', async ({ messages }) => {
            const m = messages[0];
            if (!m.message) return;
            const fromMe = !!m.key.fromMe;
            const sender = m.key.remoteJid.replace('@s.whatsapp.net', '');
            if (sender.endsWith('@g.us')) return;

            const text = m.message.conversation || m.message.extendedTextMessage?.text || m.message.imageMessage?.caption || m.message.videoMessage?.caption || "";
            if (!text) return;

            if (fromMe) {
                // Si es mensaje propio desde el celular, registrarlo como 'agent'
                let [rowsMe] = await db.execute('SELECT id FROM patients WHERE phone = ?', [sender]);
                if (rowsMe.length > 0) {
                    await db.execute('INSERT INTO messages (patient_id, content, sender) VALUES (?, ?, ?)', [rowsMe[0].id, text, 'agent']);
                }
                return;
            }

            console.log(`📥 RECIBIDO de ${sender}: ${text}`);

            let [rows] = await db.execute('SELECT * FROM patients WHERE phone = ?', [sender]);
            let pId, pName, pManual;
            if (rows.length === 0) {
                const [res] = await db.execute('INSERT INTO patients (name, phone, status) VALUES (?, ?, ?)', ['Nuevo Paciente', sender, 'lead']);
                pId = res.insertId; pName = 'Nuevo Paciente'; pManual = 0;
            } else {
                pId = rows[0].id; pName = rows[0].name; pManual = rows[0].manual_mode;
            }

            await db.execute('INSERT INTO messages (patient_id, content, sender) VALUES (?, ?, ?)', [pId, text, 'patient']);
            await db.execute('UPDATE patients SET last_interaction = CURRENT_TIMESTAMP WHERE id = ?', [pId]);

            broadcastSSE('new_message', { patient_id: pId, patient_name: pName, phone: sender, text: text.slice(0, 80) });

            let [pData] = await db.execute('SELECT name, phone, email FROM patients WHERE id = ?', [pId]);
            const patientInfo = pData[0] || {};

            const keys = await getAPIKeys();
            if (keys.gemini && GoogleGenerativeAI && pManual !== 1) {
                try {
                    console.log(`🤖 Generando respuesta para ${sender} con Gemini...`);

                    const [history] = await db.execute('SELECT content, sender FROM messages WHERE patient_id = ? ORDER BY id DESC LIMIT 10', [pId]);
                    const conversationHistory = history.reverse().map(h => `${h.sender === 'patient' ? 'Paciente' : 'Asistente'}: ${h.content}`).join('\n');

                    const [dbServices] = await db.execute('SELECT name, description, price, duration_minutes FROM services WHERE active = 1');
                    const servicesList = dbServices.map(s => `- ${s.name}: ${s.description || ''} ($${s.price || 'Consultar'})`).join('\n');

                    const [brandRows] = await db.execute('SELECT key_name, value FROM brand_settings WHERE key_name IN (\'bot_personality\', \'clinic_name\', \'giro\', \'bot_context\')');
                    const brandCfg = brandRows.reduce((acc, r) => { acc[r.key_name] = r.value; return acc; }, {});

                    const personality = brandCfg.bot_personality || brandCfg.bot_context ||
                        `Eres el asistente virtual de ${brandCfg.clinic_name || 'nuestra clÃ­nica'}. Eres amable y profesional. Responde siempre en espaÃ±ol.`;

                    const now = new Date();
                    const dateStr = now.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                    const timeStr = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

                    const prompt = `${personality}
                    
HOY ES: ${dateStr} y son las ${timeStr}.

REGLAS CRÃ TICAS DE AGENDADO:
1. ANTES de agendar, DEBES tener: Nombre, Email y TelÃ©fono (10 dÃ­gitos).
2. Si falta algo, pÃ­delo amablemente. Datos actuales: Nombre: ${patientInfo.name || 'Desconocido'}, Email: ${patientInfo.email || 'Desconocido'}, Tel: ${patientInfo.phone}.
3. Si el paciente da sus datos, usa: __DATOS|nombre=X|email=Y|telefono=Z__
4. SÃ“LO cuando tengas TODO, usa: __CITA|fecha=YYYY-MM-DD HH:mm:ss|servicio=NombreServicio__
5. El horario de atenciÃ³n es Lunes a SÃ¡bado de 9:00 AM a 7:00 PM. No agendes fuera de este horario ni en el pasado.

SERVICIOS DISPONIBLES:
${servicesList}

HISTORIAL DE CONVERSACIÃ“N:
${conversationHistory}

Paciente: ${text}
Asistente:`;

                    const genAI = new GoogleGenerativeAI(keys.gemini, { apiVersion: 'v1' });
                    let botMsg = await callGemini(genAI, prompt);

                    const datosMatch = botMsg.match(/__DATOS\|nombre=(.*?)\|email=(.*?)\|telefono=(.*?)__/i);
                    if (datosMatch) {
                        const [, n, e, t] = datosMatch;
                        await db.execute('UPDATE patients SET name = ?, email = ? WHERE id = ?', [n.trim(), e.trim(), pId]);
                        botMsg = botMsg.replace(datosMatch[0], '').trim();
                        pName = n.trim();
                    }

                    const citaMatch = botMsg.match(/__CITA\|fecha=([\d\-\:\s]+)\|servicio=(.*?)__/i);
                    if (citaMatch) {
                        const fechaStr = citaMatch[1].trim();
                        const servicioName = citaMatch[2].trim();
                        const fechaCita = new Date(fechaStr);
                        const day = fechaCita.getDay();
                        const hour = fechaCita.getHours();

                        if (isNaN(fechaCita.getTime())) {
                            botMsg = "Lo siento, la fecha no es vÃ¡lida. Â¿PodrÃ­as decirme otra vez cuÃ¡ndo te gustarÃ­a venir?";
                        } else if (fechaCita < now) {
                            botMsg = "Lo siento, no puedo agendar citas en el pasado. Â¿PodrÃ­as elegir otra fecha y hora?";
                        } else if (day === 0 || hour < 9 || hour >= 19) {
                            botMsg = "Nuestro horario de atenciÃ³n es de Lunes a SÃ¡bado de 9:00 AM a 7:00 PM. Â¿Gustas elegir otro horario?";
                        } else {
                            const service = dbServices.find(s => s.name.toLowerCase() === servicioName.toLowerCase()) || { duration_minutes: 60 };
                            const duration = service.duration_minutes || 60;
                            const endDate = new Date(fechaCita.getTime() + duration * 60000);
                            
                            const [overlaps] = await db.execute(
                                'SELECT id FROM appointments WHERE status != "cancelada" AND ((appointment_date <= ? AND end_date > ?) OR (appointment_date < ? AND end_date >= ?))',
                                [fechaStr, fechaStr, endDate.toISOString().slice(0, 19).replace('T', ' '), endDate.toISOString().slice(0, 19).replace('T', ' ')]
                            );

                            if (overlaps.length > 0) {
                                botMsg = "Ese horario ya estÃ¡ ocupado. Â¿TendrÃ¡s algÃºn otro momento disponible?";
                            } else {
                                const [resCita] = await db.execute(
                                    'INSERT INTO appointments (patient_id, patient_name, appointment_date, end_date, description, source) VALUES (?, ?, ?, ?, ?, ?)',
                                    [pId, pName, fechaStr, endDate.toISOString().slice(0, 19).replace('T', ' '), servicioName, 'bot']
                                );

                                let gUrl = "";
                                try {
                                    const cal = await getCalendarClient();
                                    if (cal) {
                                        const event = {
                                            summary: `Cita: ${pName} (${servicioName})`,
                                            description: `Agendada automÃ¡ticamente por el Asistente de WhatsApp.`,
                                            start: { dateTime: fechaCita.toISOString() },
                                            end: { dateTime: endDate.toISOString() }
                                        };
                                        const gEvent = await cal.events.insert({ calendarId: 'primary', resource: event });
                                        if (gEvent.data.id) {
                                            gUrl = gEvent.data.htmlLink;
                                            await db.execute('UPDATE appointments SET google_event_id = ?, google_event_url = ? WHERE id = ?', [gEvent.data.id, gUrl, resCita.insertId]);
                                        }
                                    }
                                } catch (e) { console.error('Error Google Calendar:', e.message); }

                                botMsg = botMsg.replace(citaMatch[0], '').trim();
                                if (gUrl) botMsg += `\n\n📅 *¡Cita confirmada!* Puedes guardarla en tu calendario aquÃ­: ${gUrl}`;
                                
                                broadcastSSE('appointment_created', { patient_id: pId, patient_name: pName, service: servicioName, date: fechaStr });
                            }
                        }
                    }

                    if (botMsg.trim()) {
                        await socket.sendMessage(m.key.remoteJid, { text: botMsg });
                        await db.execute('INSERT INTO messages (patient_id, content, sender) VALUES (?, ?, ?)', [pId, botMsg, 'bot']);
                        console.log(`✅ Respuesta enviada a ${sender}`);
                    }
                } catch (errIA) {
                    console.error('❌ Error flujo Gemini:', errIA.message);
                }
            }
        });
    } catch (e) {
        console.error('❌ Error Socket:', e.message);
    }
}

app.get('/api/whatsapp/status', requireAuth, (req, res) => res.json({ connected: connectionState === 'open', qr: lastQR, error: lastError }));

app.post('/api/whatsapp/restart', requireAuth, async (req, res) => {
    try {
        console.log('Ã°Å¸â€â€ž Reiniciando conexiÃƒÂ³n de WhatsApp...');
        if (socket) {
            try { socket.end(); } catch (e) { }
            socket = null;
        }
        lastQR = "";
        setTimeout(connectToWhatsApp, 1000);
        res.json({ success: true, message: 'Reinicio solicitado' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/whatsapp/logout', requireAuth, async (req, res) => {
    try {
        console.log('Ã°Å¸Å¡Âª Forzando cierre de sesiÃƒÂ³n...');
        if (socket) {
            try { await socket.logout(); } catch (e) { }
            socket = null;
        }
        if (fs.existsSync('auth_info_baileys')) {
            fs.rmSync('auth_info_baileys', { recursive: true, force: true });
        }
        lastQR = "";
        setTimeout(connectToWhatsApp, 1000);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- REMINDER CRON (cada hora) ---
async function checkAppointmentReminders() {
    try {
        const [appointments] = await db.execute(`
            SELECT a.*, p.phone, p.name as patient_name
            FROM appointments a
            JOIN patients p ON a.patient_id = p.id
            WHERE a.reminder_sent = 0
              AND a.status NOT IN ('cancelada', 'completada')
              AND a.appointment_date BETWEEN DATE_ADD(NOW(), INTERVAL 23 HOUR) AND DATE_ADD(NOW(), INTERVAL 25 HOUR)
        `);

        for (const appt of appointments) {
            if (!socket || !appt.phone) continue;
            try {
                const fecha = new Date(appt.appointment_date);
                const fechaStr = fecha.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
                const horaStr = fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
                const msg = `Ã°Å¸â€œÅ’ *Recordatorio de Cita*\n\nHola ${appt.patient_name || 'estimado paciente'}, te recordamos que maÃƒÂ±ana *${fechaStr} a las ${horaStr}* tienes una cita agendada.\n\nÃ‚Â¿Alguna duda o necesitas reprogramarla? RespÃƒÂ³ndenos aquÃƒÂ­.`;
                const jid = appt.phone.includes('@') ? appt.phone : `${appt.phone}@s.whatsapp.net`;
                await socket.sendMessage(jid, { text: msg });
                await db.execute('UPDATE appointments SET reminder_sent = 1 WHERE id = ?', [appt.id]);
                console.log(`Ã°Å¸â€”â€œÃ¯Â¸Â Recordatorio enviado a ${appt.patient_name} (${appt.phone})`);
            } catch (e) {
                console.error(`Ã¢ÂÅ’ Error enviando recordatorio a ${appt.phone}:`, e.message);
            }
        }
    } catch (e) {
        console.error('Ã¢ÂÅ’ Error en cron de recordatorios:', e.message);
    }
}

// --- START ---
const PORT = process.env.PORT || 3000;

// Catch-all para React (Solo si no es una ruta de API)
app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'Ruta de API no encontrada' });
    }
    if (fs.existsSync(path.join(distDir, 'index.html'))) {
        res.sendFile(path.join(distDir, 'index.html'));
    } else {
        res.status(404).send('Frontend no compilado. Ejecute npm run build');
    }
});

app.listen(PORT, '0.0.0.0', async () => {
    console.log(`Ã°Å¸Å¡â‚¬ Servidor en puerto ${PORT}`);
    await initDB();
    inicializarLibreriasYWhatsApp();
    // Cron de recordatorios: revisar cada hora
    setInterval(checkAppointmentReminders, 60 * 60 * 1000);
    console.log('Ã¢ÂÂ° Cron de recordatorios 24h activado.');
});



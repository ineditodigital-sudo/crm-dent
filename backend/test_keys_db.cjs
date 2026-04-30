const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env') });

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
});

async function testKeys() {
    try {
        const [rows] = await db.execute('SELECT key_name, content FROM crm_settings WHERE section = "api_keys"');
        console.log('--- DB Rows in api_keys ---');
        console.log(rows.map(r => ({ key: r.key_name, length: r.content?.length || 0 })));
        
        const k = rows.reduce((acc, r) => { acc[r.key_name] = r.content; return acc; }, {});
        const gemini = (k.gemini_key || k.gemini || process.env.GEMINI_API_KEY || '').trim();
        
        console.log('--- Resolved Gemini Key ---');
        console.log('Length:', gemini.length);
        console.log('Starts with:', gemini.substring(0, 5) + '...');
        
        process.exit(0);
    } catch (e) {
        console.error('Error:', e.message);
        process.exit(1);
    }
}

testKeys();

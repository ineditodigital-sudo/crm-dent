const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

async function migrate() {
    const db = await mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'crm_multiagente',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    try {
        console.log('Iniciando migración...');
        // Drop foreign keys
        const [msgFks] = await db.query(`
            SELECT CONSTRAINT_NAME
            FROM information_schema.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'messages' AND COLUMN_NAME = 'patient_id'
        `);
        for (const fk of msgFks) {
            await db.query(`ALTER TABLE messages DROP FOREIGN KEY ${fk.CONSTRAINT_NAME}`);
        }

        const [apptFks] = await db.query(`
            SELECT CONSTRAINT_NAME
            FROM information_schema.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'appointments' AND COLUMN_NAME = 'patient_id'
        `);
        for (const fk of apptFks) {
            await db.query(`ALTER TABLE appointments DROP FOREIGN KEY ${fk.CONSTRAINT_NAME}`);
        }

        // Rename table
        await db.query(`RENAME TABLE patients TO contacts`);

        // Rename columns
        await db.query(`ALTER TABLE messages CHANGE patient_id contact_id INT`);
        await db.query(`ALTER TABLE appointments CHANGE patient_id contact_id INT`);
        await db.query(`ALTER TABLE appointments CHANGE patient_name contact_name VARCHAR(255)`);

        // Re-add foreign keys
        await db.query(`ALTER TABLE messages ADD CONSTRAINT fk_msg_contact FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE`);
        await db.query(`ALTER TABLE appointments ADD CONSTRAINT fk_appt_contact FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE`);

        console.log('Migración completada con éxito.');
    } catch (e) {
        console.error('Error durante la migración:', e);
    } finally {
        await db.end();
    }
}

migrate();

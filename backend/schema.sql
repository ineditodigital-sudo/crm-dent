-- Base de Datos para CRM Multiagente Dra. Stephanie Ortega
-- Diseñada para MySQL (cPanel)

CREATE DATABASE IF NOT EXISTS crm_multiagente;
USE crm_multiagente;

-- Tabla de Pacientes
CREATE TABLE IF NOT EXISTS patients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255),
    last_interaction TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    treatment_interest ENUM('Preventiva', 'Restaurativa', 'Estetica', 'Ortodoncia', 'Cirugía') DEFAULT 'Preventiva',
    status ENUM('Lead', 'Paciente', 'Urgente') DEFAULT 'Lead'
);

-- Tabla de Mensajes (Historial de Conversaciones)
CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT,
    sender ENUM('patient', 'bot', 'agent') NOT NULL,
    content TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- Tabla de Citas (Sincronizada con Google Calendar)
CREATE TABLE IF NOT EXISTS appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT,
    google_event_id VARCHAR(255),
    appointment_date DATETIME NOT NULL,
    treatment_type VARCHAR(100),
    status ENUM('pending', 'confirmed', 'cancelled', 'completed') DEFAULT 'pending',
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- Tabla de Configuración y Estado del Bot
CREATE TABLE IF NOT EXISTS bot_settings (
    id INT PRIMARY KEY DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    ai_model VARCHAR(50) DEFAULT 'gemini-flash-latest',
    system_prompt TEXT
);

-- Datos iniciales de configuración
INSERT IGNORE INTO bot_settings (id, is_active, ai_model, system_prompt) 
VALUES (1, TRUE, 'gemini-flash-latest', 'Eres el asistente inteligente de la Dra. Stephanie Ortega. Tu objetivo es agendar citas dentales. Sé amable, profesional y clasifica al paciente según sus necesidades (Limpieza, Estética, Dolor, etc).');

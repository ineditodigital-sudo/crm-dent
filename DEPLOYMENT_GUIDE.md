# Guía de Implementación y Despliegue: CRM Multi-Agente

Este documento es la hoja de ruta técnica para poner en marcha el CRM en un entorno de producción (cPanel/VPS), así como las instrucciones finas para replicar el sistema para nuevos clientes.

---

## 1. Requisitos Previos del Servidor

*   **Entorno:** Servidor Linux (VPS o hosting compartido tipo cPanel con soporte para Node.js).
*   **Software:** Node.js v18 o superior, MySQL 8 o MariaDB.
*   **Permisos:** Capacidad para instalar paquetes (`npm`), leer/escribir en el sistema de archivos (necesario para las sesiones de WhatsApp y subida de imágenes).
*   **Dominios:** Un dominio o subdominio con certificado SSL (HTTPS) activado. Obligatorio para WebSockets y Google OAuth.

---

## 2. Preparación de Credenciales de Terceros

Antes de subir el código, debes tener estas claves:
1.  **Google Gemini API Key:** Entra a *Google AI Studio*, crea un proyecto y obtén la API Key.
2.  **Google Cloud Console (Calendar API):**
    *   Crea un proyecto en Google Cloud.
    *   Habilita la "Google Calendar API".
    *   Ve a *Credenciales* -> Crear credenciales de tipo *OAuth Client ID* (Aplicación Web).
    *   **IMPORTANTE:** En "URI de redireccionamiento autorizados", añade exactamente: `https://[TU-DOMINIO]/api/calendar/callback`.
    *   Guarda el *Client ID* y *Client Secret*.

---

## 3. Despliegue Paso a Paso (Entorno cPanel / VPS)

### Paso 1: Base de Datos
1. Crea una base de datos MySQL en tu panel.
2. Crea un usuario, asígnale contraseña y dale **todos los privilegios** sobre la base de datos.
3. *Nota:* No necesitas importar tablas manualmente. Al iniciar, el servidor ejecutará la función `initDB()` que creará y configurará todas las tablas automáticamente.

### Paso 2: Configuración de Variables de Entorno (`.env`)
En el directorio raíz de tu proyecto en el servidor, crea un archivo llamado `.env` y llénalo con lo siguiente:

```env
PORT=3000
DB_HOST=localhost
DB_USER=usuario_cpanel
DB_PASS=tu_contraseña_segura
DB_NAME=nombre_base_datos

# Acceso al Panel Admin del CRM
ADMIN_USER=admin
ADMIN_PASS=superpassword123

# (Opcional) Si no se definen aquí, se configuran desde el módulo "Conexiones" en la UI
GEMINI_API_KEY=tu_gemini_key
GOOGLE_CLIENT_ID=tu_google_id
GOOGLE_CLIENT_SECRET=tu_google_secret
```

### Paso 3: Subida del Código y Compilación
1. En tu máquina local, ejecuta:
   ```bash
   npm run build
   ```
2. Esto generará la carpeta `dist/` (El Front-End optimizado).
3. Sube al servidor de producción los siguientes archivos y carpetas:
   * `backend/` (completo)
   * `dist/` (completo)
   * `package.json` y `package-lock.json`
4. **Instalación de dependencias:** Vía SSH o terminal de cPanel, entra al directorio y ejecuta:
   ```bash
   npm install --production
   ```

### Paso 4: Ajuste de Rutas en `server.js` (CRÍTICO)
Asegúrate de que la variable `distDir` en `backend/server.js` apunte a la ruta absoluta correcta de tu servidor donde está la carpeta `dist`.
*Ejemplo cPanel:* `const distDir = '/home/tu_usuario/public_html/dist';`

### Paso 5: Permisos de Carpetas (Imágenes)
El sistema guarda los logos en la carpeta `uploads/` dentro de `distDir`.
*   Asegúrate de que el proceso Node tenga permisos de escritura en esa carpeta.
*   Asegúrate de que los permisos de la carpeta sean `0755` y los archivos se guarden con `0644`. El servidor generará un archivo `.htaccess` automáticamente para evitar que el enrutador SPA de React bloquee las imágenes.

### Paso 6: Arrancar el Servidor
En VPS, usa `pm2` para mantener el proceso vivo:
```bash
pm2 start backend/server.js --name "crm-odontologico"
pm2 save
pm2 startup
```
En cPanel, usa la herramienta "Setup Node.js App", apunta el *Startup file* a `backend/server.js` y arranca la aplicación.

---

## 4. Configuración Post-Despliegue (En la Interfaz del CRM)

1. Ingresa a `https://[TU-DOMINIO]/login` usando el `ADMIN_USER` y `ADMIN_PASS` del `.env`.
2. Ve a **Conexiones**:
   * Escanea el código QR con el WhatsApp del negocio (Dispositivos Vinculados).
   * Ingresa las credenciales de Google y presiona conectar (esto abrirá la ventana de Google para autorizar el calendario).
3. Ve a **Negocio**:
   * Escribe el nombre, giro ("Clínica Dental") y eslogan.
   * Haz clic en *Generar Textos Inteligentes*. La IA creará toda la landing page al instante.
   * Personaliza tus colores primarios y sube tu logo.
4. Ve a **Servicios**: Da de alta los tratamientos, precios y duración en minutos.

---

## 5. Guía de Replicación para un Nuevo Cliente

Para revender o instalar este CRM a un nuevo cliente, el proceso es ágil y modular. Sigue estos pasos para un reseteo limpio:

1. **Clonar Base de Código:** Duplica la carpeta del proyecto.
2. **Nueva Base de Datos:** Crea una nueva base de datos limpia. El script de Node.js la poblará en el primer arranque.
3. **Limpiar Sesiones (Muy Importante):**
   Asegúrate de que la carpeta `auth_info_baileys` NO exista en el nuevo despliegue. Si existe, bórrala. Contiene la sesión de WhatsApp del cliente anterior.
   ```bash
   rm -rf auth_info_baileys/
   ```
4. **Limpiar Uploads:** Vacía la carpeta `uploads/` de logos o imágenes antiguas.
5. **Configurar Dominio y `.env`:** Asigna el nuevo subdominio, cambia el `ADMIN_USER/PASS` y configura las variables de conexión a la nueva BD.
6. **Entregar al Cliente:** Una vez levantado el servidor, el cliente entra, escanea *su propio* WhatsApp, conecta *su propio* calendario y utiliza la IA en el módulo "Negocio" para armar su landing page en minutos.

### Consideraciones de Mantenimiento
*   **Si el bot envía caracteres extraños (`Ã­`):** Revisa que el motor de la base de datos esté configurado estrictamente en `utf8mb4`. El código ya fuerza esto en la creación de tablas.
*   **Si WhatsApp se desconecta:** En la pestaña Conexiones, hay un botón de "Reiniciar Conexión" o "Cerrar Sesión Forzada" que elimina la carpeta Baileys y regenera el QR.

# Arquitectura y Funcionalidades del CRM Multi-Agente con IA

Este documento detalla la estructura, módulos y funcionalidades del CRM desarrollado, destacando las ventajas arquitectónicas y las integraciones de Inteligencia Artificial (IA) implementadas.

## 1. Visión General del Sistema
El CRM es una plataforma integral diseñada para negocios de servicios (especialmente clínicas o consultorios) que automatiza la captación de leads, la atención al cliente vía WhatsApp y la gestión de citas. Se basa en una arquitectura monolítica moderna (React + Node.js + MySQL) que permite un despliegue sencillo y alto rendimiento.

**Beneficios principales:**
*   **Centralización:** Combina marketing (Landing Page), ventas (Leads) y operaciones (Agenda) en una sola plataforma.
*   **Automatización:** Reduce la carga operativa humana en un 80% al delegar la primera línea de atención y agendado a la IA.
*   **Escalabilidad:** Diseñado para soportar múltiples conexiones simultáneas sin bloquear el hilo principal, usando WebSockets locales (Baileys) y SSE (Server-Sent Events) para actualizaciones en tiempo real.

---

## 2. Módulos y Funciones a Detalle

### 2.1. Landing Page Dinámica e Inteligente
Una página web de cara al cliente final (front-end público) completamente integrada con el CRM.
*   **Generación por IA:** El texto completo de la página (Hero, Servicios, FAQ, Biografía) se genera automáticamente usando Gemini basándose en el nombre, giro y eslogan del negocio.
*   **Personalización en Tiempo Real:** Los colores (primario, fondo, acentos), tipografías y logotipos se configuran desde el panel de administración e impactan la Landing Page inmediatamente.
*   **Beneficios:** Elimina la necesidad de un diseñador o copywriter para lanzar o pivotar el negocio. Optimización SEO automática mediante la estructura de etiquetas.

### 2.2. Panel de Conversaciones (Chat Multi-Agente)
El corazón de la comunicación.
*   **Integración WhatsApp Web (Baileys):** Conexión directa mediante código QR, sin depender de la API oficial de pago (WhatsApp Cloud API), ahorrando costos por mensaje.
*   **Handoff Humano/Bot:** El bot responde automáticamente, pero si un operador humano interviene enviando un mensaje manual, el bot "pasa a segundo plano" (modo manual = 1) para no interrumpir la venta.
*   **Sincronización en Tiempo Real:** Uso de *Server-Sent Events (SSE)* para inyectar nuevos mensajes en la pantalla del administrador al instante, sin recargar la página.

### 2.3. Módulo de Agenda y Google Calendar
Gestión de citas inteligente con prevención de colisiones.
*   **Sincronización Bidireccional:** Cada cita creada en el CRM genera un evento en Google Calendar y devuelve el enlace del evento al cliente.
*   **Reglas de Negocio:** El sistema respeta los horarios de apertura/cierre (ej. 9:00 AM a 7:00 PM) configurados en el módulo de Negocio.
*   **Notificaciones Automáticas:** Al crear una cita manual desde el panel, el servidor envía inmediatamente un WhatsApp de confirmación al cliente.
*   **Cron de Recordatorios:** Un proceso en segundo plano revisa cada hora las citas próximas (24 horas) y envía recordatorios automáticos por WhatsApp.

### 2.4. Gestión de Contactos y Embudo (Leads)
*   **Ciclo de Vida del Cliente:** Estados dinámicos (`lead`, `prospecto`, `frecuente`, `cancelada`). Si el bot agenda una cita, el lead se convierte; si cancela, se etiqueta adecuadamente.
*   **Extracción Automática de Datos:** La IA identifica el nombre y correo dentro de la conversación natural del cliente y actualiza su perfil en la base de datos de forma silenciosa.

### 2.5. Dashboard y Reportes de Inteligencia de Negocio
*   **Métricas en Tiempo Real:** Leads totales, citas generadas por IA vs. Humanos, tasa de retención.
*   **Consultor IA:** Un endpoint especial compila las estadísticas del mes y se las envía a Gemini para que genere un reporte narrativo estratégico con recomendaciones de negocio en 3 párrafos.

---

## 3. Implementaciones Específicas de IA (Google Gemini)

La integración con la API de Gemini (modelos `flash` y `pro`) se realiza mediante *prompt engineering* avanzado y fallback de modelos para garantizar alta disponibilidad.

### A. El Agente Conversacional (WhatsApp)
El bot no es de "opciones predefinidas" (árbol de decisiones), es un agente generativo libre, restringido por *System Prompts* estrictos.
*   **Inyección de Contexto:** Al prompt se le inyecta la fecha/hora actual, la lista de servicios con precios y duraciones desde la base de datos, y el historial de la conversación.
*   **Extracción Estructurada (Comandos):** Se le instruye a la IA que si tiene los datos suficientes, responda con comandos invisibles para el usuario:
    *   `__DATOS|nombre=Juan|email=juan@m.com|telefono=555__`: Le indica al backend que actualice el perfil.
    *   `__CITA|fecha=YYYY-MM-DD HH:mm:ss|servicio=Limpieza__`: Detona la lógica de Google Calendar y creación de cita en la base de datos. El servidor borra estas etiquetas antes de enviar el mensaje al WhatsApp del cliente.

### B. Copiloto de Copywriting (Módulo Negocio)
El administrador solo ingresa "Dentista en Madrid" y la IA construye toda la narrativa de la página web, preguntas frecuentes enfocadas a odontología y la biografía del doctor, insertándolas en la tabla `crm_settings`.

### C. Analista de Datos Estratégico
La IA recibe un JSON con el volumen de mensajes, citas canceladas y leads nuevos, y devuelve un diagnóstico cualitativo (ej. "Tu bot está cerrando pocas citas, sugiere añadir un descuento en el mensaje de bienvenida").

---

## 4. Estructura de la Base de Datos (Seguridad y Rendimiento)
*   `contacts` y `messages`: Almacenan el núcleo del CRM con codificación `utf8mb4` para soportar emojis de WhatsApp.
*   `appointments`: Administra colisiones de horarios mediante consultas lógicas (`appointment_date <= ? AND end_date > ?`).
*   `crm_settings` y `brand_settings`: Tablas clave-valor de alta eficiencia para guardar configuraciones dinámicas sin alterar el esquema.
*   **Seguridad:** Las variables sensibles (Tokens, IDs de Google) están encriptadas o alojadas en `.env`, y las consultas SQL están parametrizadas (anti SQL-Injection).

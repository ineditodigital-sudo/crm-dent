# CRM Multiagente & Bot de WhatsApp (Clínica)

Sistema integral para la gestión de clínicas médicas con automatización vía WhatsApp.

## Estructura del Proyecto

- `/src/pages/Landing.tsx`: Sitio web premium con catálogo y captación de leads.
- `/src/pages/Dashboard.tsx`: Panel principal con métricas clave.
- `/src/pages/Conversations.tsx`: Gestor de hilos Multiagente (SLA, Session Lock).
- `/src/pages/Calendar.tsx`: Agenda dinámica (Citas Bot vs Manual).
- `/backend/schema.sql`: Estructura de base de datos escalable.
- `/backend/bot_logic.md`: Especificación técnica del bot.

## Cómo ejecutar

1. Clonar el repositorio.
2. Ejecutar `npm install`.
3. Ejecutar `npm run dev`.
4. Visitar `http://localhost:5173/` para el CRM.
5. Visitar `http://localhost:5173/landing` para ver el sitio web público.

## Próximas Implementaciones
- Conexión real con WhatsApp Business API.
- Motor de NLP para extracción de entidades.
- Sistema de autenticación de usuarios.

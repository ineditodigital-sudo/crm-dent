# Lógica del Bot de WhatsApp y Árbol de Respuesta

Este documento detalla el flujo conversacional y la lógica de extracción de datos para el bot mediante la API Oficial de WhatsApp.

## 1. Flujo de Bienvenida y Captura de Entidades
El bot opera bajo un esquema de "State Machine" para guiar al usuario.

| Estado | Acción del Bot | Información Extraída |
| :--- | :--- | :--- |
| `START` | "Hola! Bienvenido a ClinicCRM. ¿Cómo te llamas?" | `name` |
| `ASK_SERVICE` | "Mucho gusto {name}. ¿Qué servicio te interesa? (1. Limpieza, 2. Ortodoncia, 3. Urgencias)" | `treatment_interest` |
| `ASK_LOCATION` | "Perfecto. ¿Desde qué zona nos contactas?" | `address` |
| `ASK_APPOINTMENT` | "Tengo disponibilidad hoy a las 4:00 PM o mañana a las 10:00 AM. ¿Cuál prefieres?" | `scheduled_time` |
| `CONFIRM` | "Cita confirmada. Enviaremos un recordatorio 24h antes." | |

## 2. Extracción de Entidades (NLP)
Para la "Extracción de Entidades" solicitada, se recomienda integrar un procesador como **OpenAI API** o **Dialogflow** para mapear lenguaje natural a variables:
- "Me llamo Juan y vivo en Polanco" -> `{name: "Juan", address: "Polanco"}`

## 3. Manejo de Alta Concurrencia (10k Conversaciones)
- **Infraestructura**: Despliegue en Kubernetes o Servidores con Balanceo de Carga (AWS/GCP).
- **Webhooks**: Node.js con `worker_threads` o arquitectura basada en eventos (Redis Pub/Sub) para procesar mensajes en paralelo sin bloquear el hilo principal.
- **Base de Datos**: PostgreSQL con POOL de conexiones para manejar lecturas/escrituras masivas.

## 4. Agendamiento Autónomo
1. El bot consulta la tabla `appointments` para ver huecos libres.
2. Reserva el espacio `status: 'scheduled'` de forma temporal por 10 minutos.
3. Al recibir confirmación, cambia a `status: 'confirmed'`.

## 5. Transición a Humano
- Si el bot detecta palabras clave ("hablar con alguien", "urgencia real") o no entiende tras 3 intentos, cambia `conversations.status` a `waiting_agent`.
- El Dashboard alerta al agente mediante el "Semáforo Rojo".

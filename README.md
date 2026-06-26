# SMARTCARE — Backend

Server Node.js che riceve i dati dal Raspberry Pi via MQTT,
li salva su MongoDB e li espone tramite REST API alla dashboard React.

## Stack tecnologico

- **Node.js** + **Express** — server HTTP e API REST
- **MongoDB** + **Mongoose** — database dei vitali e utenti
- **MQTT** (Mosquitto su Docker) — ricezione dati dal Raspberry Pi
- **Nodemailer** — invio email di alert su anomalia critica
- **JWT** + **bcryptjs** — autenticazione e sicurezza

## Architettura
Raspberry Pi → MQTT → index.js → MongoDB
↓
Dashboard React ← REST API ← index.js
App Android → POST /api/patients/gps → MongoDB

## Struttura file

| File | Descrizione |
|------|-------------|
| `index.js` | Entry point — MQTT, MongoDB, API REST, email alert |
| `routes/auth.js` | Login, registrazione, verifica token JWT |
| `routes/patients.js` | Gestione pazienti e aggiornamento GPS |
| `models/User.js` | Schema MongoDB utenti (pazienti e medici) |
| `.env` | Variabili d'ambiente (non committare su GitHub) |

## API REST

| Endpoint | Metodo | Descrizione |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/auth/register` | POST | Registrazione utente |
| `/auth/login` | POST | Login — restituisce token JWT |
| `/auth/me` | GET | Dati utente loggato |
| `/api/vitals/:patientID` | GET | Ultimi 50 vitali |
| `/api/vitals/:patientID/latest` | GET | Ultimo valore vitali |
| `/api/alerts/:patientID` | GET | Ultimi 20 alert |
| `/api/patients` | GET | Lista pazienti (solo medico) |
| `/api/patients/:id` | GET | Dettaglio paziente (solo medico) |
| `/api/patients` | POST | Aggiungi paziente (solo medico) |
| `/api/patients/gps/:patientID` | POST | Aggiorna GPS (app Android) |

## Setup
```bash
# Installa dipendenze
npm install

# Avvia Docker (MongoDB + Mosquitto)
docker compose up -d

# Copia e configura variabili d'ambiente
cp .env.example .env

# Avvia server
node index.js
```
## Variabili d'ambiente (.env)
MQTT_BROKER=mqtt://localhost

MQTT_TOPIC=smartcare/patient/PAZ-001/vitals

MONGO_URI=mongodb://localhost:27017/smartcare

PORT=3000

EMAIL_FROM=tua_email@gmail.com

EMAIL_TO=tua_email@gmail.com

EMAIL_PASS=app_password_gmail

JWT_SECRET=chiave_segreta_jwt

## Note

- Il broker MQTT Mosquitto gira su Docker sulla porta 1883
- MongoDB gira su Docker sulla porta 27017
- Le email di alert vengono inviate solo quando severity = critical
- Il token JWT ha durata 7 giorni
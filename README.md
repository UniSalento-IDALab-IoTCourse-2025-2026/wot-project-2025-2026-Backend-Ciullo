# SMARTCARE — Backend Node.js

> Sistema IoT per il Monitoraggio Remoto di Pazienti con Scompenso Cardiaco

[![University](https://img.shields.io/badge/Università-del%20Salento-gold)](https://www.unisalento.it)
[![Course](https://img.shields.io/badge/Corso-Internet%20of%20Things-blue)](https://www.unisalento.it)
[![Node](https://img.shields.io/badge/Node.js-20.x-green)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-Docker-green)](https://www.mongodb.com)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

## Descrizione

Questo repository contiene il **backend** del sistema SMARTCARE, sviluppato in **Node.js con Express**. Il server gestisce tre flussi in parallelo: ricezione dati dal Raspberry Pi via MQTT, esposizione delle API REST alla dashboard e all'app mobile, e invio automatico delle notifiche di emergenza in caso di evento critico.

---

## Architettura

```
Raspberry Pi → MQTT Broker → Backend Node.js → MongoDB
                                    │
                         ┌──────────┴──────────┐
                         │   REST API (JWT)     │  Dashboard + App Android
                         │   MQTT Subscriber    │  Ricezione vitali
                         │   Nodemailer         │  Email medico + 118
                         │   Cloudinary         │  Foto profilo pazienti
                         └─────────────────────┘
```

[Schema architetturale completo su FigJam](https://www.figma.com/board/CPYTiOD9fkwEItSPM6bcCV)

---

## API REST

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| `POST` | `/api/auth/login` | Login utente — restituisce JWT |
| `GET` | `/api/auth/me` | Dati utente autenticato |
| `GET` | `/api/vitals/:patientId/latest` | Ultimi vitali del paziente |
| `GET` | `/api/vitals/:patientId/history` | Storico ultimi 50 valori |
| `GET` | `/api/alerts/:patientId` | Lista alert warning e critical |
| `GET` | `/api/patients` | Lista tutti i pazienti (medico) |
| `POST` | `/api/patients` | Registra nuovo paziente |
| `POST` | `/api/patients/gps/:patientId` | Aggiorna posizione GPS |
| `POST` | `/api/upload/:patientId` | Carica foto profilo su Cloudinary |

---

## Struttura MongoDB

**Collezione `vitals`**
```json
{
  "patientId": "PAZ-001",
  "bpm": 134,
  "hrv": 23.4,
  "temp": 36.9,
  "severity": "critical",
  "anomalyRatio": 0.42,
  "steps": 1203,
  "postura": "In piedi",
  "ax": -5, "ay": 12, "az": 45,
  "flags": { "tachicardia_critica": 134.3 },
  "timestamp": "2026-06-29T19:53:58.265Z"
}
```

**Collezione `users`**
```json
{
  "nome": "Luigi De Vitis",
  "email": "luigidevitis52@gmail.com",
  "ruolo": "paziente",
  "patientId": "PAZ-001",
  "lat": 39.97,
  "lng": 18.26,
  "fotoUrl": "https://res.cloudinary.com/..."
}
```

---

## Notifiche di emergenza

In caso di `severity: critical` il backend:
1. Recupera le coordinate GPS aggiornate dal documento utente su MongoDB
2. Invia **email al medico** con parametri vitali, flag anomalia e link Google Maps
3. Invia **email all'hub 118** con notifica automatica di emergenza
4. La dashboard riceve i dati al polling successivo e mostra la **Web Notification Chrome**

Latenza end-to-end garantita: **< 10 secondi**

---

## Requisiti

```bash
Node.js 20.x
Docker (Mosquitto + MongoDB)
```

**Dipendenze principali:** `express` · `mongoose` · `mqtt` · `jsonwebtoken` · `bcrypt` · `nodemailer` · `multer` · `cloudinary`

---

## Installazione e avvio

```bash
# 1. Clona il repository
git clone https://github.com/UniSalento-IDALab-IoTCourse-2025-2026/wot-project-2025-2026-Backend-Ciullo.git
cd wot-project-2025-2026-Backend-Ciullo

# 2. Installa le dipendenze
npm install

# 3. Configura le variabili d'ambiente
cp .env.example .env
# Modifica .env con le tue credenziali

# 4. Avvia Docker (Mosquitto + MongoDB)
docker-compose up -d

# 5. Avvia il server
node index.js
```

### Variabili d'ambiente richieste (.env)
```env
MONGO_URI=mongodb://localhost:27017/smartcare
JWT_SECRET=your_jwt_secret
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_app_password
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
MQTT_BROKER=mqtt://192.168.0.x
```

---

## Repository correlati

| Repository | Descrizione |
|------------|-------------|
| [Edge Node Raspberry Pi](https://github.com/UniSalento-IDALab-IoTCourse-2025-2026/wot-project-2025-2026-RaspberryPi-Ciullo) | Acquisizione BLE, Isolation Forest, pubblicazione MQTT |
| [Dashboard React](https://github.com/UniSalento-IDALab-IoTCourse-2025-2026/wot-project-2025-2026-Dashboard-Ciullo) | Dashboard web multi-ruolo con mappa GPS e grafico BPM |
| [App Android](https://github.com/UniSalento-IDALab-IoTCourse-2025-2026/wot-project-2025-2026-MobileApp-Ciullo) | Applicazione mobile Expo SDK 54 con tracking GPS |
| [Presentazione](https://github.com/UniSalento-IDALab-IoTCourse-2025-2026/wot-project-2025-2026-Presentation-Ciullo) | Slide e documentazione del progetto |

---

## Autore

**Alberto Ciullo**
Università del Salento — Magistrale Informatica
Corso di Internet of Things — A.A. 2025/2026
Docente: Prof. Luigi Patrono · Tutor: Ing. Teodoro Montanaro

Sviluppato in collaborazione con l'**Istituto Italiano di Tecnologia (IIT)**

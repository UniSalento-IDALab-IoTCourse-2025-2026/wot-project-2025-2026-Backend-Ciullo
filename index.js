// index.js
// Entry point del backend SMARTCARE

require('dotenv').config()
const express    = require('express')
const mongoose   = require('mongoose')
const mqtt       = require('mqtt')
const nodemailer = require('nodemailer')
const cors       = require('cors')
const User       = require('./models/User')

const authRoutes    = require('./routes/auth')
const patientRoutes = require('./routes/patients')
const uploadRoutes  = require('./routes/upload')

const app = express()
app.use(cors())
app.use(express.json())

app.use('/auth', authRoutes)
app.use('/api/patients', patientRoutes)
app.use('/api/upload', uploadRoutes)

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('[MONGO] Connesso'))
  .catch(e => console.error('[MONGO] Errore:', e))

const vitalSchema = new mongoose.Schema({
  patientID:    String,
  timestamp:    Date,
  bpm:          Number,
  hrv_ms:       Number,
  temp_c:       Number,
  imu:          Object,
  passi_oggi:   Number,
  anomaly:      Object,
  ecg_analysis: Object,
}, { timestamps: true })

const Vital = mongoose.model('Vital', vitalSchema)

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_FROM,
    pass: process.env.EMAIL_PASS,
  }
})

async function sendAlert(payload) {
  const { patientID, vitals, anomaly } = payload

  // Link Google Maps con coordinate GPS del paziente
  const gpsLink = payload.gps?.lat
    ? `https://www.google.com/maps?q=${payload.gps.lat},${payload.gps.lng}`
    : 'non disponibile'

  try {
    // Email al medico
    await transporter.sendMail({
      from:    process.env.EMAIL_FROM,
      to:      process.env.EMAIL_TO,
      subject: `[SMARTCARE] ALERT ${anomaly.severity.toUpperCase()} - ${patientID}`,
      text: [
        'ALERT SMARTCARE',
        '',
        `Paziente:    ${patientID}`,
        `Severity:    ${anomaly.severity}`,
        `BPM:         ${vitals.bpm}`,
        `HRV:         ${vitals.hrv_ms} ms`,
        `Temperatura: ${vitals.temp_c} C`,
        `Flags:       ${anomaly.flags.join(', ') || 'nessuno'}`,
        `Critical:    ${anomaly.critical.join(', ') || 'nessuno'}`,
        `Timestamp:   ${payload.timestamp}`,
        `Posizione:   ${gpsLink}`,
      ].join('\n')
    })
    console.log('[EMAIL] Alert medico inviata per', patientID)

    // Email al hub 118
    await transporter.sendMail({
      from:    process.env.EMAIL_FROM,
      to:      process.env.EMAIL_118 || process.env.EMAIL_TO,
      subject: `[EMERGENZA 118] Paziente ${patientID} - ${anomaly.severity.toUpperCase()}`,
      text: [
        'NOTIFICA AUTOMATICA SISTEMA SMARTCARE',
        '',
        'Si segnala anomalia critica rilevata dal sistema di monitoraggio cardiaco.',
        '',
        `Paziente ID: ${patientID}`,
        `Severita:    ${anomaly.severity.toUpperCase()}`,
        `BPM:         ${vitals.bpm}`,
        `Temperatura: ${vitals.temp_c} C`,
        `Anomalia:    ${[...anomaly.critical, ...anomaly.flags].join(', ')}`,
        `Timestamp:   ${payload.timestamp}`,
        `Posizione:   ${gpsLink}`,
        '',
        'Questo e un messaggio automatico generato dal sistema SMARTCARE.',
        'Verificare immediatamente le condizioni del paziente.',
      ].join('\n')
    })
    console.log('[EMAIL] Alert 118 inviata per', patientID)

  } catch (e) {
    console.error('[EMAIL] Errore invio:', e.message)
  }
}

const client = mqtt.connect(process.env.MQTT_BROKER)

client.on('connect', () => {
  console.log('[MQTT] Connesso al broker')
  client.subscribe(process.env.MQTT_TOPIC, err => {
    if (err) console.error('[MQTT] Errore subscribe:', err)
    else     console.log('[MQTT] Subscribed a', process.env.MQTT_TOPIC)
  })
})

client.on('message', async (topic, message) => {
  try {
    const payload = JSON.parse(message.toString())
    console.log('[MQTT] Ricevuto:', payload.patientID,
      '| BPM:', payload.vitals?.bpm,
      '| severity:', payload.anomaly?.severity)

    const doc = new Vital({
      patientID:    payload.patientID,
      timestamp:    new Date(payload.timestamp),
      bpm:          payload.vitals?.bpm,
      hrv_ms:       payload.vitals?.hrv_ms,
      temp_c:       payload.vitals?.temp_c,
      imu:          payload.vitals?.imu,
      passi_oggi:   payload.vitals?.passi_oggi,
      anomaly:      payload.anomaly,
      ecg_analysis: payload.ecg_analysis,
    })
    await doc.save()
    console.log('[MONGO] Salvato per', payload.patientID)

    if (payload.anomaly?.severity === 'critical') {
      // Recupera GPS aggiornato dal documento utente
      const paziente = await User.findOne({ patientID: payload.patientID })
      if (paziente?.gps?.lat) payload.gps = paziente.gps
      await sendAlert(payload)
    }

  } catch (e) {
    console.error('[ERRORE] Parsing/salvataggio:', e.message)
  }
})

app.get('/api/vitals/:patientID', async (req, res) => {
  try {
    const docs = await Vital.find({ patientID: req.params.patientID })
      .sort({ timestamp: -1 })
      .limit(50)
    res.json(docs)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/vitals/:patientID/latest', async (req, res) => {
  try {
    const doc = await Vital.findOne({ patientID: req.params.patientID })
      .sort({ timestamp: -1 })
    res.json(doc)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/alerts/:patientID', async (req, res) => {
  try {
    const docs = await Vital.find({
      patientID: req.params.patientID,
      'anomaly.severity': { $in: ['warning', 'critical'] }
    }).sort({ timestamp: -1 }).limit(20)
    res.json(docs)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/health', (req, res) => res.json({ status: 'ok' }))

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`[SERVER] In ascolto su http://localhost:${PORT}`))
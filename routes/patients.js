// routes/patients.js
// Route per la gestione pazienti e aggiornamento GPS
//
// Tutte le route sono protette da authMiddleware che verifica il JWT.
// Le route di lista e dettaglio pazienti sono accessibili solo al medico.
// La route GPS è accessibile anche al paziente (per aggiornare la propria posizione).
//
// Il GPS viene aggiornato dall'app Android ogni 10 secondi
// e salvato nel documento utente su MongoDB.

const express = require('express')
const jwt     = require('jsonwebtoken')
const User    = require('../models/User')
const router  = express.Router()

const JWT_SECRET = process.env.JWT_SECRET || 'smartcare_secret_key'

// Middleware — verifica che il token JWT sia valido
// Aggiunge req.user con { id, ruolo } decodificato dal token
function authMiddleware(req, res, next) {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) return res.status(401).json({ error: 'Token mancante' })
    req.user = jwt.verify(token, JWT_SECRET)
    next()
  } catch (e) {
    res.status(401).json({ error: 'Token non valido' })
  }
}

// Middleware — permette accesso solo al medico
function medicoOnly(req, res, next) {
  if (req.user.ruolo !== 'medico') return res.status(403).json({ error: 'Accesso negato' })
  next()
}

// GET /api/patients — lista tutti i pazienti registrati
// Accessibile solo al medico — usato dalla dashboard medico
router.get('/', authMiddleware, medicoOnly, async (req, res) => {
  try {
    const pazienti = await User.find({ ruolo: 'paziente' }).select('-password')
    res.json(pazienti)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/patients/:id — dettaglio singolo paziente
// Accessibile solo al medico — usato dalla pagina dettaglio
router.get('/:id', authMiddleware, medicoOnly, async (req, res) => {
  try {
    const paziente = await User.findById(req.params.id).select('-password')
    if (!paziente) return res.status(404).json({ error: 'Paziente non trovato' })
    res.json(paziente)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/patients — aggiunge nuovo paziente
// Accessibile solo al medico — usato dal bottone + nella dashboard medico
// Se non specificato, il patientID viene generato automaticamente
router.post('/', authMiddleware, medicoOnly, async (req, res) => {
  try {
    const { nome, cognome, email, password, telefono, codice_fiscale, patientID } = req.body
    const esistente = await User.findOne({ email })
    if (esistente) return res.status(400).json({ error: 'Email già registrata' })

    const user = new User({
      nome, cognome, email, password,
      telefono, codice_fiscale,
      ruolo:     'paziente',
      patientID: patientID || `PAZ-${Date.now()}`
    })
    await user.save()
    res.json(user)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/patients/gps/:patientID — aggiorna posizione GPS del paziente
// Chiamato dall'app Android ogni 10 secondi
// Accessibile al paziente stesso (non solo al medico)
router.post('/gps/:patientID', authMiddleware, async (req, res) => {
  try {
    const { lat, lng } = req.body
    console.log(`[GPS] ${req.params.patientID} → lat=${lat} lng=${lng}`)

    const paziente = await User.findOneAndUpdate(
      { patientID: req.params.patientID },
      { gps: { lat, lng, timestamp: new Date() } },
      { new: true }
    )
    if (!paziente) return res.status(404).json({ error: 'Paziente non trovato' })
    res.json({ ok: true, gps: paziente.gps })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

module.exports = router
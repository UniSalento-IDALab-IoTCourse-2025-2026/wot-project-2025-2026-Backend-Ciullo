// routes/auth.js
// Route per autenticazione — login e registrazione
//
// Usa JWT (JSON Web Token) per l'autenticazione stateless:
// - Al login viene generato un token firmato con JWT_SECRET
// - Il token ha durata 7 giorni
// - Il client lo salva nel localStorage e lo invia in ogni richiesta
//   nell'header Authorization: Bearer <token>
//
// Le password vengono hashate con bcryptjs prima di salvarle su MongoDB
// (mai salvare password in chiaro nel database)

const express = require('express')
const jwt     = require('jsonwebtoken')
const User    = require('../models/User')
const router  = express.Router()

const JWT_SECRET = process.env.JWT_SECRET || 'smartcare_secret_key'

// POST /auth/register — registrazione nuovo utente
// Body: { nome, cognome, email, password, telefono, codice_fiscale, ruolo, patientID }
// Restituisce: { token, user }
router.post('/register', async (req, res) => {
  try {
    const { nome, cognome, email, password, telefono, codice_fiscale, ruolo, patientID } = req.body

    // Controlla se l'email è già registrata
    const esistente = await User.findOne({ email })
    if (esistente) return res.status(400).json({ error: 'Email gia registrata' })

    const user = new User({
      nome,
      cognome,
      email,
      password,
      telefono:       telefono       || '',
      codice_fiscale: codice_fiscale || '',
      ruolo:          ruolo          || 'paziente',
      patientID:      patientID      || '',
    })
    await user.save()

    // Genera token JWT con id e ruolo dell'utente
    const token = jwt.sign(
      { id: user._id, ruolo: user.ruolo },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({
      token,
      user: {
        id:        user._id,
        nome:      user.nome,
        cognome:   user.cognome,
        email:     user.email,
        ruolo:     user.ruolo,
        patientID: user.patientID,
      }
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// POST /auth/login — accesso con email e password
// Body: { email, password }
// Restituisce: { token, user }
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    const user = await User.findOne({ email })
    if (!user) return res.status(400).json({ error: 'Email non trovata' })

    // verificaPassword è definito nel modello User con bcrypt.compare
    const ok = await user.verificaPassword(password)
    if (!ok) return res.status(400).json({ error: 'Password errata' })

    const token = jwt.sign(
      { id: user._id, ruolo: user.ruolo },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({
      token,
      user: {
        id:        user._id,
        nome:      user.nome,
        cognome:   user.cognome,
        email:     user.email,
        ruolo:     user.ruolo,
        patientID: user.patientID,
      }
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET /auth/me — restituisce i dati dell'utente loggato
// Header: Authorization: Bearer <token>
// Usato dal frontend per recuperare i dati utente al caricamento
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) return res.status(401).json({ error: 'Token mancante' })

    const decoded = jwt.verify(token, JWT_SECRET)
    const user    = await User.findById(decoded.id).select('-password')
    if (!user) return res.status(404).json({ error: 'Utente non trovato' })

    res.json(user)
  } catch (e) {
    res.status(401).json({ error: 'Token non valido' })
  }
})

module.exports = router
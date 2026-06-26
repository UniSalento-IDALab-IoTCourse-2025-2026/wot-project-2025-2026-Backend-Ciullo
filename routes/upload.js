// routes/upload.js
// Caricamento foto profilo paziente su Cloudinary

const express    = require('express')
const multer     = require('multer')
const cloudinary = require('cloudinary').v2
const jwt        = require('jsonwebtoken')
const User       = require('../models/User')
const router     = express.Router()

// Configura Cloudinary con le credenziali dal .env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// Multer salva il file in memoria invece che su disco
// così lo passiamo direttamente a Cloudinary
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 5 * 1024 * 1024 }, // max 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true)
    else cb(new Error('Solo immagini accettate'))
  }
})

// Verifica che il token JWT sia valido
function verificaToken(req, res, next) {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) return res.status(401).json({ error: 'Token mancante' })
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'smartcare_secret_key')
    next()
  } catch (e) {
    res.status(401).json({ error: 'Token non valido' })
  }
}

// POST /api/upload/foto/:patientId
// Il medico carica la foto — viene salvata su Cloudinary e l'URL su MongoDB
router.post('/foto/:patientId', verificaToken, upload.single('foto'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nessun file caricato' })

    // Carica l'immagine su Cloudinary
    // crop: 'fill' + gravity: 'face' centra automaticamente il viso
    const risultato = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder:         'smartcare/pazienti',
          public_id:      `paziente_${req.params.patientId}`,
          overwrite:      true,
          transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }]
        },
        (errore, risultato) => errore ? reject(errore) : resolve(risultato)
      )
      stream.end(req.file.buffer)
    })

    // Salva l'URL della foto nel documento utente su MongoDB
    await User.findByIdAndUpdate(req.params.patientId, { foto: risultato.secure_url })

    console.log(`[FOTO] Caricata per paziente ${req.params.patientId}`)
    res.json({ ok: true, url: risultato.secure_url })

  } catch (e) {
    console.error('[FOTO] Errore:', e.message)
    res.status(500).json({ error: e.message })
  }
})

module.exports = router
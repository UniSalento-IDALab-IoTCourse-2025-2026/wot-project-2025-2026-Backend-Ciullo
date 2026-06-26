// models/User.js
// Schema Mongoose per gli utenti del sistema SMARTCARE
//
// Gestisce sia i pazienti che i medici con lo stesso schema.
// Il campo ruolo determina cosa può vedere l'utente nella dashboard.
//
// La password viene hashata automaticamente prima del salvataggio
// grazie al middleware pre('save') di Mongoose.
// Mai salvare o confrontare password in chiaro.
//
// Il campo gps viene aggiornato dall'app Android ogni 10 secondi
// tramite la route POST /api/patients/gps/:patientID

const mongoose = require('mongoose')
const bcrypt   = require('bcryptjs')

const userSchema = new mongoose.Schema({
  // Dati anagrafici
  nome:           { type: String, required: true },
  cognome:        { type: String, required: true },
  email:          { type: String, required: true, unique: true },
  password:       { type: String, required: true },
  telefono:       { type: String, default: '' },
  codice_fiscale: { type: String, default: '' },

  // Ruolo — determina accesso alla dashboard paziente o medico
  ruolo: { type: String, enum: ['paziente', 'medico'], default: 'paziente' },

  // ID univoco del paziente — collega l'utente ai dati vitali su MongoDB
  // es. PAZ-001 — deve corrispondere al PATIENT_ID in anomaly_engine.py
  patientID: { type: String, default: '' },
  foto:      { type: String, default: '' }, // URL Cloudinary foto profilo
  
  // Posizione GPS aggiornata dall'app Android
  gps: {
    lat:       { type: Number, default: null },
    lng:       { type: Number, default: null },
    timestamp: { type: Date,   default: null },
  },
}, { timestamps: true })

// Middleware pre-save — hasha la password prima di salvarla
// Viene eseguito solo se la password è stata modificata
userSchema.pre('save', async function() {
  if (!this.isModified('password')) return
  this.password = await bcrypt.hash(this.password, 10)
})

// Metodo per verificare la password al login
// Usa bcrypt.compare per confrontare la password in chiaro
// con quella hashata salvata nel database
userSchema.methods.verificaPassword = async function(password) {
  return bcrypt.compare(password, this.password)
}

module.exports = mongoose.model('User', userSchema)
const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  service: { type: String, required: true },
  date: { type: String, required: true }, // "YYYY-MM-DD"
  hour: { type: String, required: true }, // "HH:MM"
  scheduledAt: { type: Date, required: true }, // fecha completa en UTC
  parts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  status: { type: String, enum: ['scheduled', 'arrived', 'expired', 'cancelled'], default: 'scheduled' },
  createdAt: { type: Date, default: Date.now }
});

// Asegurar scheduledAt correcto antes de guardar
appointmentSchema.pre('validate', function(next) {
  if (!this.scheduledAt && this.date && this.hour) {
    // Interpretar la fecha/hora como local del cliente y convertir a Date
    // Si tu frontend ya envía scheduledAt en ISO, no sobrescribirlo.
    this.scheduledAt = new Date(`${this.date}T${this.hour}:00`);
  }
  next();
});

module.exports = mongoose.model('Appointment', appointmentSchema);
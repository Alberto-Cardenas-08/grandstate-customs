const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  service: { type: String, required: true },
  date: { type: String, required: true }, // "YYYY-MM-DD"
  hour: { type: String, required: true }, // "HH:MM"
  scheduledAt: { type: Date, required: true },
  parts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  status: { type: String, enum: ['scheduled', 'arrived', 'expired', 'cancelled'], default: 'scheduled' },
  createdAt: { type: Date, default: Date.now }
});

// Validar que la hora sea múltiplo de 30 minutos
appointmentSchema.pre('validate', function(next) {
  if (this.hour) {
    const [hh, mm] = this.hour.split(':').map(Number);
    if (mm !== 0 && mm !== 30) {
      return next(new Error('Solo se pueden agendar citas en intervalos de 30 minutos.'));
    }
  }
  if (!this.scheduledAt && this.date && this.hour) {
    this.scheduledAt = new Date(`${this.date}T${this.hour}:00`);
  }
  next();
});

module.exports = mongoose.model('Appointment', appointmentSchema);
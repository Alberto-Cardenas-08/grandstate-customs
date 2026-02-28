const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // ✅ NUEVOS CAMPOS
  nombre: { type: String, required: true },
  telefono: { type: String, required: true },

  service: { type: String, required: true },
  date: { type: String, required: true },
  hour: { type: String, required: true },
  scheduledAt: { type: Date, required: true },

  parts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],

  status: { 
    type: String, 
    enum: ['scheduled', 'arrived', 'expired', 'cancelled'], 
    default: 'scheduled' 
  },

  createdAt: { type: Date, default: Date.now }
});

// Validación 30 min
appointmentSchema.pre('validate', function () {

  if (this.hour) {
    const [hh, mm] = this.hour.split(':').map(Number);

    if (mm !== 0 && mm !== 30) {
      throw new Error('Solo se pueden agendar citas en intervalos de 30 minutos.');
    }
  }

  if (!this.scheduledAt && this.date && this.hour) {

    let isoDate = this.date;

    if (typeof isoDate === 'string' && isoDate.includes('/')) {
      const [dd, mm, yyyy] = isoDate.split('/');
      isoDate = `${yyyy}-${mm}-${dd}`;
    }

    this.scheduledAt = new Date(`${isoDate}T${this.hour}:00`);
  }
});

module.exports = mongoose.model('Appointment', appointmentSchema);
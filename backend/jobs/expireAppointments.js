// Tarea simple para expirar citas programadas en el pasado
const Appointment = require('../models/Appointment');

const expireAppointments = async () => {
  try {
    const now = new Date();
    const res = await Appointment.updateMany(
      { scheduledAt: { $lte: now }, status: 'scheduled' },
      { $set: { status: 'expired' } }
    );
    if (res.modifiedCount > 0) {
      console.log(`Expire job: ${res.modifiedCount} citas marcadas como expired`);
    }
  } catch (err) {
    console.error('Error expirando citas', err);
  }
};

module.exports = expireAppointments;
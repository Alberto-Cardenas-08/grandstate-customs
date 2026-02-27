const express = require('express');
const Appointment = require('../models/Appointment');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Crear cita
router.post('/', protect, async (req, res) => {
  try {
    const { service, date, hour, scheduledAt } = req.body;
    if (!service || !date || !hour) {
      return res.status(400).json({ msg: 'Faltan campos obligatorios' });
    }

    // Validar intervalos de media hora
    const [hh, mm] = hour.split(':').map(Number);
    if (mm !== 0 && mm !== 30) {
      return res.status(400).json({ msg: 'Solo se pueden agendar citas cada media hora.' });
    }

    const scheduled = scheduledAt ? new Date(scheduledAt) : new Date(`${date}T${hour}:00`);

    const appointment = new Appointment({
      user: req.user.id,
      service,
      date,
      hour,
      scheduledAt: scheduled
    });

    await appointment.save();
    res.status(201).json(appointment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Error en servidor' });
  }
});

// Obtener citas (admin: todas, user: solo las suyas)
router.get('/', protect, async (req, res) => {
  try {
    let appointments;
    if (req.user.role === 'admin') {
      appointments = await Appointment.find().populate('user', 'email').populate('parts', 'name');
    } else {
      appointments = await Appointment.find({ user: req.user.id }).populate('parts', 'name');
    }
    res.json(appointments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Error en servidor' });
  }
});

// Historial de citas (expired o arrived)
router.get('/history', protect, async (req, res) => {
  try {
    let history;
    if (req.user.role === 'admin') {
      history = await Appointment.find({ status: { $in: ['expired', 'arrived'] } })
        .populate('user', 'email')
        .populate('parts', 'name');
    } else {
      history = await Appointment.find({ user: req.user.id, status: { $in: ['expired', 'arrived'] } })
        .populate('parts', 'name');
    }
    res.json(history);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Error en servidor' });
  }
});

// Marcar llegada
router.put('/:id/arrive', protect, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ msg: 'Cita no encontrada' });

    if (req.user.role !== 'admin' && appointment.user.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Acceso denegado' });
    }

    appointment.status = 'arrived';
    await appointment.save();
    res.json(appointment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Error en servidor' });
  }
});

module.exports = router;
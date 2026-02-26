const express = require('express');
const Appointment = require('../models/Appointment');
const { protect, admin } = require('../middleware/auth');

const router = express.Router();

// Crear cita (usuario autenticado)
router.post('/', protect, async (req, res) => {
  try {
    const { service, date, hour, scheduledAt } = req.body;
    if (!service || !date || !hour) {
      return res.status(400).json({ msg: 'Faltan campos obligatorios' });
    }

    // Crear scheduledAt si no viene
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

// Marcar llegada (cambia status a 'arrived')
router.put('/:id/arrive', protect, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ msg: 'Cita no encontrada' });

    // Solo admin o el propietario pueden marcar llegada
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

// Editar cita (admin o propietario)
router.put('/:id', protect, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ msg: 'Cita no encontrada' });

    if (req.user.role !== 'admin' && appointment.user.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Acceso denegado' });
    }

    const { service, date, hour, scheduledAt, status } = req.body;
    if (service) appointment.service = service;
    if (date) appointment.date = date;
    if (hour) appointment.hour = hour;
    if (scheduledAt) appointment.scheduledAt = new Date(scheduledAt);
    if (status && ['scheduled','arrived','expired','cancelled'].includes(status)) appointment.status = status;

    await appointment.save();
    res.json(appointment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Error en servidor' });
  }
});

// Eliminar cita (admin o propietario)
router.delete('/:id', protect, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ msg: 'Cita no encontrada' });

    if (req.user.role !== 'admin' && appointment.user.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Acceso denegado' });
    }

    await appointment.remove();
    res.json({ msg: 'Cita eliminada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Error en servidor' });
  }
});

module.exports = router;
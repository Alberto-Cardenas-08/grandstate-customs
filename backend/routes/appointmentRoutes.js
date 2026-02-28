const express = require('express');
const Appointment = require('../models/Appointment');
const { protect } = require('../middleware/auth');

const router = express.Router();

// ✅ Validar horario del taller (Lun–Sáb 09:00–18:00, cada 30min)
function validateWorkshopSchedule(dateStr, hourStr, scheduledAtStr) {
  // Validar formato hora HH:MM
  if (!hourStr || typeof hourStr !== 'string' || !hourStr.includes(':')) {
    return 'Hora inválida.';
  }

  const [hh, mm] = hourStr.split(':').map(Number);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return 'Hora inválida.';

  // Bloques de 30
  if (mm !== 0 && mm !== 30) {
    return 'Solo se pueden agendar citas cada media hora.';
  }

  // Construir Date
  let scheduled;

  if (scheduledAtStr) {
    scheduled = new Date(scheduledAtStr);
  } else {
    let isoDate = dateStr;

    // Si viene dd/mm/yyyy
    if (typeof dateStr === 'string' && dateStr.includes('/')) {
      const [dd, mm2, yyyy] = dateStr.split('/');
      isoDate = `${yyyy}-${mm2}-${dd}`;
    }

    scheduled = new Date(`${isoDate}T${hourStr}:00`);
  }

  if (isNaN(scheduled.getTime())) {
    return 'Fecha u hora inválida.';
  }

  // 0 domingo, 1 lunes ... 6 sábado
  const day = scheduled.getDay();
  if (day === 0) {
    return 'No se atiende los domingos. Elige lunes a sábado.';
  }

  // Validar rango horario 09:00–18:00 (incluye 18:00)
  const totalMinutes = hh * 60 + mm;
  const start = 9 * 60;    // 09:00
  const end = 18 * 60;     // 18:00

  if (totalMinutes < start || totalMinutes > end) {
    return 'Horario inválido. Atendemos de 09:00 a 18:00 (lunes a sábado).';
  }

  return null;
}

// ========================
// CREAR CITA
// ========================
router.post('/', protect, async (req, res) => {
  try {
    // ✅ NUEVO: recibimos nombre y telefono también
    const { nombre, telefono, service, date, hour, scheduledAt } = req.body;

    if (!nombre || !telefono || !service || !date || !hour) {
      return res.status(400).json({ msg: 'Faltan campos obligatorios' });
    }

    // ✅ Validación de horario
    const scheduleError = validateWorkshopSchedule(date, hour, scheduledAt);
    if (scheduleError) {
      return res.status(400).json({ msg: scheduleError });
    }

    // Construcción final de scheduled
    let scheduled;

    if (scheduledAt) {
      scheduled = new Date(scheduledAt);
    } else {
      let isoDate = date;

      if (typeof date === 'string' && date.includes('/')) {
        const [dd, mm2, yyyy] = date.split('/');
        isoDate = `${yyyy}-${mm2}-${dd}`;
      }

      scheduled = new Date(`${isoDate}T${hour}:00`);
    }

    const appointment = new Appointment({
      user: req.user.id,
      nombre,
      telefono,
      service,
      date,
      hour,
      scheduledAt: scheduled
    });

    await appointment.save();
    res.status(201).json(appointment);

  } catch (err) {
    console.error('APPOINTMENT CREATE ERROR:', err);
    res.status(500).json({ msg: 'Error en servidor', error: err.message });
  }
});

// ========================
// OBTENER CITAS
// ========================
router.get('/', protect, async (req, res) => {
  try {
    let appointments;

    if (req.user.role === 'admin') {
      appointments = await Appointment.find()
        .populate('user', 'email')
        .populate('parts', 'name');
    } else {
      appointments = await Appointment.find({ user: req.user.id })
        .populate('parts', 'name');
    }

    res.json(appointments);

  } catch (err) {
    console.error('APPOINTMENTS GET ERROR:', err);
    res.status(500).json({ msg: 'Error en servidor', error: err.message });
  }
});

// ========================
// EDITAR CITA
// ========================
router.put('/:id', protect, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ msg: 'Cita no encontrada' });
    }

    if (req.user.role !== 'admin' && appointment.user.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Acceso denegado' });
    }

    // ✅ NUEVO: permitir editar nombre y telefono
    const { nombre, telefono, service, date, hour, scheduledAt } = req.body;

    // Si cambian fecha/hora, validar reglas del taller
    const newDate = date || appointment.date;
    const newHour = hour || appointment.hour;
    const newScheduledAt = scheduledAt || null;

    const scheduleError = validateWorkshopSchedule(newDate, newHour, newScheduledAt);
    if (scheduleError) {
      return res.status(400).json({ msg: scheduleError });
    }

    // ✅ Actualizaciones
    if (nombre) appointment.nombre = nombre;
    if (telefono) appointment.telefono = telefono;

    if (service) appointment.service = service;
    if (date) appointment.date = date;
    if (hour) appointment.hour = hour;

    // scheduledAt
    if (scheduledAt) {
      appointment.scheduledAt = new Date(scheduledAt);
    } else if (date || hour) {
      let isoDate = newDate;
      if (typeof newDate === 'string' && newDate.includes('/')) {
        const [dd, mm2, yyyy] = newDate.split('/');
        isoDate = `${yyyy}-${mm2}-${dd}`;
      }
      appointment.scheduledAt = new Date(`${isoDate}T${newHour}:00`);
    }

    await appointment.save();
    res.json(appointment);

  } catch (err) {
    console.error('APPOINTMENT UPDATE ERROR:', err);
    res.status(500).json({ msg: 'Error en servidor', error: err.message });
  }
});

// ========================
// ELIMINAR CITA
// ========================
router.delete('/:id', protect, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ msg: 'Cita no encontrada' });
    }

    if (req.user.role !== 'admin' && appointment.user.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Acceso denegado' });
    }

    await appointment.deleteOne();
    return res.json({ msg: 'Cita eliminada correctamente' });

  } catch (err) {
    console.error('APPOINTMENT DELETE ERROR:', err);
    return res.status(500).json({ msg: 'Error en servidor', error: err.message });
  }
});

// ========================
// HISTORIAL SOLO ADMIN
// ========================
router.get('/history', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Acceso denegado: solo admin' });
    }

    const history = await Appointment.find({
      status: { $in: ['expired', 'arrived'] }
    })
      .populate('user', 'email')
      .populate('parts', 'name');

    res.json(history);

  } catch (err) {
    console.error('APPOINTMENTS HISTORY ERROR:', err);
    res.status(500).json({ msg: 'Error en servidor', error: err.message });
  }
});

// ========================
// MARCAR LLEGADA
// ========================
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
    console.error('APPOINTMENT ARRIVE ERROR:', err);
    res.status(500).json({ msg: 'Error en servidor', error: err.message });
  }
});

module.exports = router;
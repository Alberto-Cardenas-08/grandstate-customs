const express = require('express');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

const router = express.Router();

// ================= REGISTRO =================
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body; // ❌ quitamos role

  try {
    if (!name || !email || !password) {
      return res.status(400).json({ msg: 'Faltan campos (name, email, password)' });
    }

    let user = await User.findOne({ email: email.toLowerCase().trim() });
    if (user) {
      return res.status(400).json({ msg: 'Usuario ya existe' });
    }

    user = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: "user" // 🔥 FORZAMOS que siempre sea user
    });

    await user.save();

    const payload = { id: user.id, role: user.role };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.status(201).json({ token });

  } catch (err) {
    console.error("REGISTER ERROR:", err);
    res.status(500).json({ msg: 'Error en servidor', error: err.message });
  }
});

// ================= LOGIN =================
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ msg: 'Credenciales inválidas' });
    }

    const payload = { id: user.id, role: user.role };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.json({ token });

  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ msg: 'Error en servidor', error: err.message });
  }
});

module.exports = router;
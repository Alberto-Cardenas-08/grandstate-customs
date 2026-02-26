const express = require('express');
const Product = require('../models/Product');
const { protect, admin } = require('../middleware/auth');

const router = express.Router();

// Obtener todos los productos (para usuarios)
router.get('/', async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    res.status(500).json({ msg: 'Error en servidor' });
  }
});

// Admin: Crear producto
router.post('/', protect, admin, async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ msg: 'Error en servidor' });
  }
});

// ... Agrega PUT y DELETE similares si es necesario

module.exports = router;
const express = require('express');
const Product = require('../models/Product');
const { protect, admin } = require('../middleware/auth');

const router = express.Router();

// Obtener todos los productos
router.get('/', async (req, res) => {
  try {
    const products = await Product.find().sort({ _id: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ msg: 'Error en servidor' });
  }
});

// 🔎 Obtener producto por ID (opcional pero útil)
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ msg: 'Producto no encontrado' });
    res.json(product);
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

// ✅ NUEVO — Admin: Editar producto
router.put('/:id', protect, admin, async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ msg: 'Producto no encontrado' });

    const { name, price, stock, image, description } = req.body;

    if (name !== undefined) product.name = String(name);
    if (price !== undefined) product.price = Number(price);
    if (stock !== undefined) product.stock = Number(stock);
    if (image !== undefined) product.image = String(image);
    if (description !== undefined) product.description = String(description);

    await product.save();

    res.json({
      msg: 'Producto actualizado correctamente',
      product
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Error en servidor' });
  }
});

// Admin: Eliminar producto
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ msg: 'Producto no encontrado' });

    await product.deleteOne();
    return res.json({ msg: 'Producto eliminado correctamente' });
  } catch (err) {
    res.status(500).json({ msg: 'Error en servidor' });
  }
});

module.exports = router;
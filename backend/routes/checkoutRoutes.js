const express = require('express');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { protect } = require('../middleware/auth');

const router = express.Router();

// POST /api/checkout
router.post('/', protect, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id }).populate('items.product');

    if (!cart) {
      return res.status(400).json({ msg: 'El carrito está vacío.' });
    }

    // Limpia items huérfanos (producto eliminado)
    cart.items = (cart.items || []).filter(it => it.product);
    if (cart.items.length === 0) {
      cart.items = [];
      await cart.save();
      return res.status(400).json({ msg: 'El carrito está vacío.' });
    }

    let total = 0;

    // Validar stock
    for (const item of cart.items) {
      if (item.product.stock < item.quantity) {
        return res.status(400).json({
          msg: `Stock insuficiente de ${item.product.name}`
        });
      }

      total += item.product.price * item.quantity;
    }

    // Descontar stock
    for (const item of cart.items) {
      await Product.findByIdAndUpdate(item.product._id, {
        $inc: { stock: -item.quantity }
      });
    }

    // Vaciar carrito
    cart.items = [];
    await cart.save();

    res.json({
      msg: 'Compra finalizada correctamente',
      total
    });

  } catch (err) {
    console.error('CHECKOUT ERROR:', err);
    res.status(500).json({ msg: 'Error en servidor' });
  }
});

module.exports = router;
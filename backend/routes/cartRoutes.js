const express = require('express');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { protect } = require('../middleware/auth');

const router = express.Router();

async function cleanupOrphanItems(userId) {
  const cart = await Cart.findOne({ user: userId }).populate('items.product');
  if (!cart) return null;

  const before = cart.items.length;
  cart.items = cart.items.filter(it => it.product);
  if (cart.items.length !== before) {
    await cart.save();
  }
  return cart;
}

// Obtener carrito del usuario
router.get('/', protect, async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user.id }).populate('items.product');
    if (!cart) {
      cart = new Cart({ user: req.user.id, items: [] });
      await cart.save();
      return res.json(cart);
    }

    const cleaned = await cleanupOrphanItems(req.user.id);
    return res.json(cleaned || cart);
  } catch (err) {
    console.error('CART GET ERROR:', err);
    res.status(500).json({ msg: 'Error en servidor' });
  }
});

// Agregar item al carrito
router.post('/', protect, async (req, res) => {
  try {
    const { productId, quantity } = req.body;

    if (!productId) return res.status(400).json({ msg: 'productId es requerido' });

    const qty = Number(quantity);
    const addQty = Number.isFinite(qty) && qty > 0 ? qty : 1;

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ msg: 'Producto no encontrado' });

    // ✅ NUEVO: validar stock
    if ((product.stock ?? 0) <= 0) {
      return res.status(400).json({ msg: 'Producto sin stock' });
    }

    let cart = await Cart.findOne({ user: req.user.id });
    if (!cart) cart = new Cart({ user: req.user.id, items: [] });

    const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);

    if (itemIndex > -1) {
      const current = Number(cart.items[itemIndex].quantity || 0);
      const nextQty = current + addQty;

      if (nextQty > product.stock) {
        return res.status(400).json({ msg: `No puedes exceder el stock. Stock disponible: ${product.stock}` });
      }

      cart.items[itemIndex].quantity = nextQty;
    } else {
      if (addQty > product.stock) {
        return res.status(400).json({ msg: `No puedes exceder el stock. Stock disponible: ${product.stock}` });
      }
      cart.items.push({ product: productId, quantity: addQty });
    }

    await cart.save();

    const populated = await Cart.findOne({ user: req.user.id }).populate('items.product');
    return res.json(populated);

  } catch (err) {
    console.error('CART POST ERROR:', err);
    res.status(500).json({ msg: 'Error en servidor', error: err.message });
  }
});

// DELETE /api/cart/:productId
router.delete('/:productId', protect, async (req, res) => {
  try {
    const { productId } = req.params;

    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) return res.status(404).json({ msg: 'Carrito no encontrado' });

    const index = cart.items.findIndex(item => item.product.toString() === productId);
    if (index === -1) return res.status(404).json({ msg: 'Producto no está en el carrito' });

    cart.items.splice(index, 1);
    await cart.save();

    const updatedCart = await Cart.findOne({ user: req.user.id }).populate('items.product');
    return res.json(updatedCart);

  } catch (err) {
    console.error('CART DELETE ERROR:', err);
    return res.status(500).json({ msg: 'Error en servidor', error: err.message });
  }
});

// PUT /api/cart/:productId  body: { delta: 1 } o { delta: -1 }
router.put('/:productId', protect, async (req, res) => {
  try {
    const { productId } = req.params;
    const change = Number(req.body?.delta);

    if (![1, -1].includes(change)) {
      return res.status(400).json({ msg: 'Delta inválido. Usa 1 o -1.' });
    }

    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) return res.status(404).json({ msg: 'Carrito no encontrado' });

    const item = cart.items.find(i => i.product.toString() === productId);
    if (!item) return res.status(404).json({ msg: 'Producto no está en el carrito' });

    // ✅ NUEVO: si va a subir, validar stock
    if (change === 1) {
      const product = await Product.findById(productId);
      if (!product) return res.status(404).json({ msg: 'Producto no encontrado' });

      const nextQty = Number(item.quantity || 0) + 1;
      if (nextQty > product.stock) {
        return res.status(400).json({ msg: `No puedes exceder el stock. Stock disponible: ${product.stock}` });
      }
    }

    item.quantity = Number(item.quantity || 0) + change;

    if (item.quantity <= 0) {
      cart.items = cart.items.filter(i => i.product.toString() !== productId);
    }

    await cart.save();

    const updatedCart = await Cart.findOne({ user: req.user.id }).populate('items.product');

    if (updatedCart) {
      const before = updatedCart.items.length;
      updatedCart.items = updatedCart.items.filter(it => it.product);
      if (updatedCart.items.length !== before) await updatedCart.save();
    }

    return res.json(updatedCart);

  } catch (err) {
    console.error('CART PUT ERROR:', err);
    return res.status(500).json({ msg: 'Error en servidor', error: err.message });
  }
});

module.exports = router;
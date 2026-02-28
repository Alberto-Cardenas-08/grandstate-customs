// carrito.js FIXED
const API = "grandstate-customs-nai9.vercel.app/api";

document.addEventListener("DOMContentLoaded", loadCart);

async function loadCart() {
  const token = localStorage.getItem("token");
  const container = document.getElementById("cartItems");

  if (!token) {
    window.location.href = "Login.html";
    return;
  }

  try {
    const res = await fetch(`${API}/cart`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      console.error(await res.text());
      return;
    }

    const cart = await res.json();
    const items = cart.items || [];

    container.innerHTML = "";

    if (items.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding:40px;">
          <img src="Logo.png" style="width:120px; opacity:0.7;">
          <h3 style="margin-top:20px;">Tu carrito está vacío</h3>
          <p style="color:#6b7280;">Agrega productos desde la tienda.</p>
          <a href="Tienda.html" class="btn btn-primary" style="margin-top:15px; display:inline-block;">
            Ir a la tienda
          </a>
        </div>
      `;
      updateTotals(0);
      return;
    }

    let total = 0;

    items.forEach(item => {
      if (!item.product) return;

      const price = Number(item.product.price || 0);
      const qty = Number(item.quantity || 0);
      const subtotal = price * qty;
      total += subtotal;

      const div = document.createElement("div");
      div.className = "cart-item";

      div.innerHTML = `
        <div class="cart-thumb">
          <img src="${item.product.image || 'https://via.placeholder.com/150'}">
        </div>

        <div>
          <p class="cart-name">${item.product.name}</p>
          <p class="cart-sub">$${price.toFixed(2)} c/u</p>

          <!-- ✅ NUEVO: STOCK DISPONIBLE -->
          <p style="color:#6b7280; font-size:13px; margin-top:4px;">
            Stock disponible: ${Number(item.product.stock ?? 0)}
          </p>

          <div class="qty-controls">
            <button onclick="updateQty('${item.product._id}', -1)">-</button>
            <span>${qty}</span>
            <button onclick="updateQty('${item.product._id}', 1)">+</button>
          </div>
        </div>

        <div class="cart-right">
          <div class="cart-price">$${subtotal.toFixed(2)}</div>
          <button class="btn btn-danger cart-remove" onclick="removeItem('${item.product._id}')">
            Eliminar
          </button>
        </div>
      `;

      container.appendChild(div);
    });

    updateTotals(total);

  } catch (err) {
    console.error("Error cargando carrito:", err);
  }
}

function updateTotals(total) {
  document.getElementById("subtotalText").textContent = `$${total.toFixed(2)}`;
  document.getElementById("totalText").textContent = `$${total.toFixed(2)}`;
}

async function updateQty(id, delta) {
  const token = localStorage.getItem("token");

  try {
    await fetch(`${API}/cart/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ delta })
    });

    loadCart();
    updateCartCount();

  } catch (err) {
    console.error("Error actualizando cantidad:", err);
  }
}

async function removeItem(id) {
  const token = localStorage.getItem("token");

  try {
    await fetch(`${API}/cart/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });

    loadCart();
    updateCartCount();

  } catch (err) {
    console.error("Error eliminando producto:", err);
  }
}

async function checkout() {
  const token = localStorage.getItem("token");

  const res = await fetch("grandstate-customs-nai9.vercel.app/api/checkout", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await res.json();

  if (!res.ok) {
    alert(data.msg);
    return;
  }

  alert(`Compra realizada. Total: $${data.total.toFixed(2)}`);
  loadCart();
  updateCartCount();
}
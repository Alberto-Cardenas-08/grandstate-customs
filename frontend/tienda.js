// tienda.js (PRO + MODAL EDITAR)
// - API puerto 5000
// - Agregar al carrito (sin redirigir)
// - Comprar ahora (agrega y manda a carrito)
// - Admin: Eliminar
// - Admin: Editar con MODAL bonito (PUT /api/products/:id)

const API = "grandstate-customs-nai9.vercel.app/api";
let allProducts = [];

document.addEventListener("DOMContentLoaded", () => {
  // Mostrar panel admin si es admin
  const adminPanel = document.getElementById("adminPanel");
  if (adminPanel && localStorage.getItem("role") === "admin") {
    adminPanel.style.display = "block";
  }

  // Hook del formulario para crear productos
  const form = document.getElementById("productForm");
  if (form) form.addEventListener("submit", createProduct);

  // Buscar / ordenar
  const searchInput = document.getElementById("searchInput");
  const sortSelect = document.getElementById("sortSelect");
  if (searchInput) searchInput.addEventListener("input", renderFiltered);
  if (sortSelect) sortSelect.addEventListener("change", renderFiltered);

  // Modal: submit
  const editForm = document.getElementById("editProductForm");
  if (editForm) editForm.addEventListener("submit", submitEditForm);

  // Modal: cerrar con ESC
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeEditModal();
  });

  // Modal: cerrar clic fuera
  const overlay = document.getElementById("editModal");
  if (overlay) {
    overlay.addEventListener("click", (e) => {
      if (e.target.id === "editModal") closeEditModal();
    });
  }

  loadProducts();
});

async function loadProducts() {
  try {
    const res = await fetch(`${API}/products`);
    if (!res.ok) throw new Error(await res.text());

    const products = await res.json();
    allProducts = Array.isArray(products) ? products : [];
    renderProducts(allProducts);
  } catch (err) {
    console.error("Error cargando productos:", err);
    const list = document.getElementById("productList");
    if (list) {
      list.innerHTML = `
        <div class="card" style="padding:16px;">
          <h3 style="margin-bottom:8px;">No se pudieron cargar los productos</h3>
          <p style="color:#6b7280;">Revisa que el backend esté corriendo en el puerto 5000.</p>
        </div>
      `;
    }
  }
}

function renderFiltered() {
  const search = (document.getElementById("searchInput")?.value || "")
    .toLowerCase()
    .trim();

  const sort = document.getElementById("sortSelect")?.value || "default";

  let filtered = allProducts.filter(p =>
    (p.name || "").toLowerCase().includes(search)
  );

  if (sort === "priceAsc") filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
  if (sort === "priceDesc") filtered.sort((a, b) => (b.price || 0) - (a.price || 0));

  renderProducts(filtered);
}

function safeImage(url) {
  const fallback = "https://via.placeholder.com/400x300";
  if (!url || typeof url !== "string") return fallback;
  const trimmed = url.trim();
  if (!trimmed) return fallback;
  return trimmed;
}

function renderProducts(products) {
  const list = document.getElementById("productList");
  if (!list) return;

  list.innerHTML = "";

  products.forEach(p => {
    const stock = Number(p.stock ?? 0);
    const outOfStock = stock <= 0;

    const article = document.createElement("article");
    article.className = "product-card card";

    article.innerHTML = `
      <div class="product-media">
        <img src="${safeImage(p.image)}" alt="${p.name || "Producto"}">
      </div>

      <div class="product-body">
        <h3 class="product-title">${p.name ?? "Producto"}</h3>

        <div class="product-meta">
          <span class="price">$${Number(p.price ?? 0).toFixed(2)}</span>
          <span>Stock: ${stock}</span>
        </div>

        <div class="product-actions">
          <button
            class="btn btn-primary"
            ${outOfStock ? "disabled" : ""}
            onclick="addToCart('${p._id}')"
            title="${outOfStock ? "Sin stock" : "Agregar al carrito"}"
          >
            ${outOfStock ? "Sin stock" : "Agregar al carrito"}
          </button>

          <button
            class="btn btn-ghost"
            ${outOfStock ? "disabled" : ""}
            onclick="buyNow('${p._id}')"
            title="${outOfStock ? "Sin stock" : "Comprar ahora"}"
          >
            Comprar ahora
          </button>

          ${
            localStorage.getItem("role") === "admin"
              ? `
                <button class="btn btn-ghost" onclick="openEditModal('${p._id}')">Editar</button>
                <button class="btn btn-danger" onclick="deleteProduct('${p._id}')">Eliminar</button>
              `
              : ""
          }
        </div>
      </div>
    `;

    list.appendChild(article);
  });
}

async function addToCart(id) {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "Login.html";
    return;
  }

  try {
    const res = await fetch(`${API}/cart`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ productId: id, quantity: 1 })
    });

    if (!res.ok) {
      console.error("Error agregando al carrito:", await res.text());
      alert("No se pudo agregar al carrito.");
      return;
    }

    if (typeof updateCartCount === "function") updateCartCount();

    alert("Producto agregado al carrito ✅");
  } catch (err) {
    console.error("Error agregando al carrito:", err);
    alert("Error de conexión con el servidor.");
  }
}

async function buyNow(id) {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "Login.html";
    return;
  }

  try {
    const res = await fetch(`${API}/cart`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ productId: id, quantity: 1 })
    });

    if (!res.ok) {
      console.error("Error comprar ahora:", await res.text());
      alert("No se pudo agregar al carrito.");
      return;
    }

    if (typeof updateCartCount === "function") updateCartCount();

    window.location.href = "carrito.html";
  } catch (err) {
    console.error("Error en buyNow:", err);
    alert("Error de conexión con el servidor.");
  }
}

async function deleteProduct(id) {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "Login.html";
    return;
  }

  if (!confirm("¿Eliminar este producto?")) return;

  try {
    const res = await fetch(`${API}/products/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      console.error("Error eliminando producto:", await res.text());
      alert("No se pudo eliminar el producto.");
      return;
    }

    await loadProducts();
  } catch (err) {
    console.error("Error eliminando producto:", err);
    alert("Error de conexión con el servidor.");
  }
}

/* =========================
   ADMIN: Crear producto (POST /api/products)
   ========================= */
async function createProduct(e) {
  e.preventDefault();

  const token = localStorage.getItem("token");
  const msg = document.getElementById("adminMsg");

  if (!token) {
    if (msg) msg.textContent = "❌ No hay token. Inicia sesión de nuevo.";
    return;
  }

  const name = document.getElementById("pName").value.trim();
  const price = Number(document.getElementById("pPrice").value);
  const stock = Number(document.getElementById("pStock").value);
  const image = document.getElementById("pImage").value.trim();

  const payload = { name, price, stock };
  if (image) payload.image = image;

  try {
    const res = await fetch(`${API}/products`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (msg) msg.textContent = data?.message || "❌ No se pudo crear el producto (revisa rol admin).";
      console.error("POST /products error:", data);
      return;
    }

    if (msg) msg.textContent = "✅ Producto guardado en MongoDB.";
    e.target.reset();

    await loadProducts();
  } catch (err) {
    console.error("Error creando producto:", err);
    if (msg) msg.textContent = "❌ Error de conexión con el servidor.";
  }
}

/* =========================
   MODAL EDITAR PRODUCTO (ADMIN)
   ========================= */

function openEditModal(id) {
  const role = localStorage.getItem("role");
  if (role !== "admin") return;

  const p = allProducts.find(x => x._id === id);
  if (!p) {
    alert("No se encontró el producto.");
    return;
  }

  // llenar inputs
  document.getElementById("editId").value = p._id;
  document.getElementById("editName").value = p.name ?? "";
  document.getElementById("editPrice").value = Number(p.price ?? 0);
  document.getElementById("editStock").value = Number(p.stock ?? 0);
  document.getElementById("editImage").value = p.image ?? "";
  document.getElementById("editDesc").value = p.description ?? "";

  const msg = document.getElementById("editMsg");
  if (msg) msg.textContent = "";

  const modal = document.getElementById("editModal");
  if (modal) modal.style.display = "flex";
}

function closeEditModal() {
  const modal = document.getElementById("editModal");
  if (modal) modal.style.display = "none";
}

async function submitEditForm(e) {
  e.preventDefault();

  const token = localStorage.getItem("token");
  const msg = document.getElementById("editMsg");
  if (!token) {
    if (msg) msg.textContent = "❌ No hay token. Inicia sesión de nuevo.";
    return;
  }

  const id = document.getElementById("editId").value;
  const name = document.getElementById("editName").value.trim();
  const price = Number(document.getElementById("editPrice").value);
  const stock = Number(document.getElementById("editStock").value);
  const image = document.getElementById("editImage").value.trim();
  const description = document.getElementById("editDesc").value.trim();

  if (!name) {
    if (msg) msg.textContent = "❌ El nombre no puede ir vacío.";
    return;
  }
  if (!Number.isFinite(price) || price < 0) {
    if (msg) msg.textContent = "❌ Precio inválido.";
    return;
  }
  if (!Number.isFinite(stock) || stock < 0) {
    if (msg) msg.textContent = "❌ Stock inválido.";
    return;
  }

  const payload = { name, price, stock, image, description };

  try {
    if (msg) msg.textContent = "Guardando cambios...";

    const res = await fetch(`${API}/products/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (msg) msg.textContent = data.msg || "❌ No se pudo actualizar el producto.";
      return;
    }

    if (msg) msg.textContent = "✅ Producto actualizado.";
    await loadProducts();
    closeEditModal();

  } catch (err) {
    console.error(err);
    if (msg) msg.textContent = "❌ Error de conexión con el servidor.";
  }
}
// auth.js
function parseJwt(token) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

function getToken() {
  return localStorage.getItem("token");
}

function saveRoleFromToken() {
  const token = getToken();
  if (!token) return null;

  const payload = parseJwt(token);
  if (!payload) return null;

  // validar expiración
  if (payload.exp && Date.now() >= payload.exp * 1000) {
    logout();
    return null;
  }

  if (payload.role) localStorage.setItem("role", payload.role);
  return payload.role || null;
}

function getRole() {
  return localStorage.getItem("role");
}

function isAdmin() {
  return getRole() === "admin";
}

// Verificar si hay sesión activa
function checkAuth() {
  const token = getToken();
  if (!token) {
    window.location.href = "Login.html"; // mayúscula según tu preferencia
    return;
  }
  saveRoleFromToken();
}

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  // redirigir al registrar (mayúscula según tu preferencia)
  window.location.href = "index.html";
}

async function updateCartCount() {
  const badge = document.getElementById("cartCount");
  if (!badge) return;

  const token = getToken();
  if (!token) {
    badge.style.display = "none";
    badge.textContent = "0";
    return;
  }

  try {
    const res = await fetch("https://grandstate-customs-nai9.vercel.app/api/cart", {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      badge.style.display = "none";
      badge.textContent = "0";
      return;
    }

    const cart = await res.json();
    const items = Array.isArray(cart?.items) ? cart.items : [];

    const totalQty = items.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0);

    if (totalQty > 0) {
      badge.textContent = String(totalQty);
      badge.style.display = "inline-block";
    } else {
      badge.textContent = "0";
      badge.style.display = "none";
    }
  } catch (e) {
    badge.style.display = "none";
    badge.textContent = "0";
  }
}
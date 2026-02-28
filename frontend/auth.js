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

  // opcional: validar expiración
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
    window.location.href = "Login.html";
    return;
  }
  // Asegura que el role exista en localStorage
  saveRoleFromToken();
}

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("role");

  // ✅ Redirigir al registro en vez del login
  window.location.href = "Register.html"; // o "register.html" según tu archivo real
}
async function updateCartCount() {
  const badge = document.getElementById("cartCount");
  if (!badge) return;

  const token = localStorage.getItem("token");
  if (!token) {
    badge.style.display = "none";
    badge.textContent = "0";
    return;
  }

  try {
    const res = await fetch("https://grandstate-customs-nai9-lq8n3u1an-alberto-cardenas-08s-projects.vercel.app/api/cart", {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      // si falla, no rompemos la UI
      badge.style.display = "none";
      badge.textContent = "0";
      return;
    }

    const cart = await res.json();
    const items = Array.isArray(cart?.items) ? cart.items : [];

    // suma total de cantidades
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
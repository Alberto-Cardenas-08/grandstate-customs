// admin.js - versión actualizada mostrando nombre y teléfono
document.addEventListener("DOMContentLoaded", () => {
  const API_BASE = "https://grandstate-customs-nai9.vercel.app/api";

  const rows = document.getElementById("rows");
  const messageEl = document.getElementById("message");
  const btnActive = document.getElementById("btnActive");
  const btnHistory = document.getElementById("btnHistory");
  const btnRefresh = document.getElementById("btnRefresh");
  const searchInput = document.getElementById("searchInput");
  const logoutBtn = document.getElementById("logoutBtn");

  let mode = "active";
  let dataCache = [];

  function getToken() {
    return localStorage.getItem("token");
  }

  function getRole() {
    return localStorage.getItem("role");
  }

  function showMessage(text, type = "ok") {
    messageEl.textContent = text;
    messageEl.className = type === "err" ? "err" : "ok";
    messageEl.style.display = "block";
    setTimeout(() => {
      messageEl.style.display = "none";
      messageEl.textContent = "";
      messageEl.className = "";
    }, 3000);
  }

  function formatDate(iso) {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  }

  function badgeClass(status) {
    const s = (status || "").toLowerCase();
    if (["scheduled", "arrived", "expired", "cancelled"].includes(s)) return s;
    return "scheduled";
  }

  // ✅ ahora busca también por teléfono
  function filterData(text) {
    const q = (text || "").trim().toLowerCase();
    if (!q) return dataCache;

    return dataCache.filter(a => {
      const email = (a?.user?.email || "").toLowerCase();
      const nombre = (a?.nombre || "").toLowerCase();
      const telefono = (a?.telefono || "").toLowerCase();
      const service = (a?.service || "").toLowerCase();
      const date = (a?.scheduledAt || "").toLowerCase();

      return (
        email.includes(q) ||
        nombre.includes(q) ||
        telefono.includes(q) ||
        service.includes(q) ||
        date.includes(q)
      );
    });
  }

  async function apiGet(url) {
    const token = getToken();
    const res = await fetch(url, {
      headers: { Authorization: token ? `Bearer ${token}` : "" },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.msg || "Error en la petición");
    return data;
  }

  async function apiPut(url) {
    const token = getToken();
    const res = await fetch(url, {
      method: "PUT",
      headers: { Authorization: token ? `Bearer ${token}` : "" },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.msg || "Error en la petición");
    return data;
  }

  async function apiDelete(url) {
    const token = getToken();
    const res = await fetch(url, {
      method: "DELETE",
      headers: { Authorization: token ? `Bearer ${token}` : "" },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.msg || "Error en la petición");
    return data;
  }

  function render(list) {
    rows.innerHTML = "";

    if (!list || list.length === 0) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="5">No hay datos para mostrar.</td>`;
      rows.appendChild(tr);
      return;
    }

    list.forEach(a => {
      const nombre = a?.nombre || "Cliente";
      const email = a?.user?.email || "-";
      const telefono = a?.telefono || "-";
      const service = a?.service || "-";
      const when = formatDate(a?.scheduledAt || "");
      const status = a?.status || "-";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>
          <div><b>${nombre}</b></div>
          <div class="muted">${email}</div>
          <div class="muted">Tel: ${telefono}</div>
          <div class="muted">ID: ${a?._id || "-"}</div>
        </td>
        <td>${service}</td>
        <td>${when}</td>
        <td><span class="badge ${badgeClass(status)}">${status}</span></td>
        <td>
          <div class="row-actions" id="actions-${a?._id}"></div>
        </td>
      `;

      rows.appendChild(tr);

      const actions = tr.querySelector(`#actions-${a?._id}`);

      const arriveBtn = document.createElement("button");
      arriveBtn.className = "btn-arrive";
      arriveBtn.textContent = "Marcar llegada";
      arriveBtn.disabled = (a?.status !== "scheduled");
      arriveBtn.addEventListener("click", async () => {
        try {
          await apiPut(`${API_BASE}/appointments/${a._id}/arrive`);
          showMessage("Cliente marcado como llegado.");
          await load();
        } catch (e) {
          showMessage(e.message || "Error marcando llegada", "err");
        }
      });

      const delBtn = document.createElement("button");
      delBtn.className = "btn-del";
      delBtn.textContent = "Eliminar";
      delBtn.addEventListener("click", async () => {
        if (!confirm("¿Seguro que quieres eliminar esta cita?")) return;
        try {
          await apiDelete(`${API_BASE}/appointments/${a._id}`);
          showMessage("Cita eliminada.");
          await load();
        } catch (e) {
          showMessage(e.message || "Error eliminando cita", "err");
        }
      });

      actions.appendChild(arriveBtn);
      actions.appendChild(delBtn);
    });
  }

  async function load() {
    try {
      let data;

      if (mode === "history") {
        data = await apiGet(`${API_BASE}/appointments/history`);
      } else {
        data = await apiGet(`${API_BASE}/appointments`);
        data = Array.isArray(data) ? data.filter(a => a.status === "scheduled") : [];
      }

      dataCache = Array.isArray(data) ? data : [];
      render(filterData(searchInput.value));

    } catch (e) {
      console.error(e);
      showMessage(e.message || "Error cargando datos", "err");
    }
  }

  function ensureAdmin() {
    if (typeof checkAuth === "function") checkAuth();

    const token = getToken();
    if (!token) {
      window.location.href = "Login.html";
      return;
    }

    if (getRole() !== "admin") {
      alert("Acceso denegado. Esta sección es solo para administradores.");
      window.location.href = "inicio_taller.html";
    }
  }

  btnActive.addEventListener("click", async () => {
    mode = "active";
    await load();
  });

  btnHistory.addEventListener("click", async () => {
    mode = "history";
    await load();
  });

  btnRefresh.addEventListener("click", load);

  searchInput.addEventListener("input", () => {
    render(filterData(searchInput.value));
  });

  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    window.location.href = "Login.html";
  });

  ensureAdmin();
  load();

  setInterval(load, 60000);
});
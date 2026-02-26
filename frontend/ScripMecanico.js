// ScripMecanico.js - integración con backend para crear, listar, marcar llegada y expirar visualmente
document.addEventListener('DOMContentLoaded', () => {
  let citas = []; // cache local para render
  let editingId = null;

  const form = document.getElementById('citaForm');
  const citasList = document.getElementById('citasList');
  const messageEl = document.getElementById('message');
  const submitBtn = document.getElementById('submitBtn') || (form && form.querySelector('button[type="submit"]'));
  const editingIndicator = document.getElementById('editingIndicator');

  const API_BASE = 'http://localhost:5000/api'; // ajustar si el backend está en otra URL

  function showMessage(text, isError = false) {
    if (!messageEl) return;
    messageEl.textContent = text;
    messageEl.className = isError ? 'error' : 'status';
    setTimeout(() => {
      messageEl.textContent = '';
      messageEl.className = '';
    }, 3000);
  }

  function validarCampos({ nombre, telefono, servicio, fecha, hora }) {
    if (!nombre || !telefono || !servicio || !fecha || !hora) {
      return 'Por favor, completa todos los campos.';
    }
    if (!/^\d{7,10}$/.test(telefono)) {
      return 'Teléfono inválido: solo dígitos, entre 7 y 10 caracteres.';
    }
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(nombre)) {
      return 'Nombre inválido: solo letras y espacios.';
    }
    const fechaHora = new Date(`${fecha}T${hora}`);
    if (isNaN(fechaHora.getTime())) {
      return 'Fecha u hora inválida.';
    }
    const ahora = new Date();
    if (fechaHora <= ahora) {
      return 'Selecciona una fecha y hora en el futuro.';
    }
    return null;
  }

  // Helpers para llamadas al backend
  function getToken() {
    return localStorage.getItem('token');
  }

  async function crearCitaBackend({ service, date, hour }) {
    const token = getToken();
    const scheduledAt = new Date(`${date}T${hour}`).toISOString();
    const res = await fetch(`${API_BASE}/appointments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      body: JSON.stringify({ service, date, hour, scheduledAt })
    });
    return res;
  }

  async function fetchCitasBackend() {
    const token = getToken();
    const res = await fetch(`${API_BASE}/appointments`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : ''
      }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.msg || 'Error al obtener citas');
    }
    return await res.json();
  }

  async function markArrivedBackend(id) {
    const token = getToken();
    const res = await fetch(`${API_BASE}/appointments/${id}/arrive`, {
      method: 'PUT',
      headers: {
        'Authorization': token ? `Bearer ${token}` : ''
      }
    });
    return res;
  }

  async function deleteCitaBackend(id) {
    const token = getToken();
    const res = await fetch(`${API_BASE}/appointments/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': token ? `Bearer ${token}` : ''
      }
    });
    return res;
  }

  async function editCitaBackend(id, payload) {
    const token = getToken();
    const res = await fetch(`${API_BASE}/appointments/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      body: JSON.stringify(payload)
    });
    return res;
  }

  // Render de citas desde datos del servidor
  function renderCitasFromServer(citasServer) {
    citas = Array.isArray(citasServer) ? citasServer : [];
    // Ordenar por scheduledAt asc
    citas.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

    citasList.innerHTML = '';
    if (citas.length === 0) {
      const empty = document.createElement('p');
      empty.textContent = 'No hay citas agendadas.';
      citasList.appendChild(empty);
      return;
    }

    citas.forEach(cita => {
      const li = document.createElement('li');

      const meta = document.createElement('div');
      meta.className = 'meta';

      const linea = document.createElement('div');
      linea.textContent = `${cita.user && cita.user.email ? cita.user.email : (cita.nombre || 'Cliente')} — ${cita._id ? cita._id.slice(-6) : ''}`;
      linea.style.fontWeight = '600';

      const detalle = document.createElement('div');
      // Mostrar fecha/hora en local
      const localDate = new Date(cita.scheduledAt);
      detalle.textContent = `${cita.service || cita.servicio} • ${localDate.toLocaleString()}`;
      detalle.style.fontSize = '13px';
      detalle.style.color = '#444';

      meta.appendChild(linea);
      meta.appendChild(detalle);

      const actions = document.createElement('div');
      actions.className = 'actions';

      // Badge de estado
      const badge = document.createElement('span');
      badge.className = `badge ${cita.status}`;
      badge.textContent = cita.status;

      // Botón marcar llegada
      const arriveBtn = document.createElement('button');
      arriveBtn.type = 'button';
      arriveBtn.className = 'arrive';
      arriveBtn.textContent = 'Marcar llegada';
      arriveBtn.disabled = cita.status !== 'scheduled';
      arriveBtn.addEventListener('click', async () => {
        try {
          const res = await markArrivedBackend(cita._id);
          if (res.ok) {
            showMessage('Cliente marcado como llegado.');
            await loadAndRender();
          } else {
            const err = await res.json().catch(() => ({}));
            showMessage(err.msg || 'Error marcando llegada', true);
          }
        } catch (e) {
          console.error(e);
          showMessage('Error marcando llegada', true);
        }
      });

      // Editar (solo si es tuya o admin; aquí abrimos el formulario con datos locales)
      const editarBtn = document.createElement('button');
      editarBtn.type = 'button';
      editarBtn.className = 'editar';
      editarBtn.textContent = 'Editar';
      editarBtn.addEventListener('click', () => {
        // Cargar datos en formulario para editar
        document.getElementById('nombre').value = cita.nombre || '';
        document.getElementById('telefono').value = cita.telefono || '';
        document.getElementById('servicio').value = cita.service || cita.servicio || '';
        const d = new Date(cita.scheduledAt);
        // Formato YYYY-MM-DD y HH:MM
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const hh = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        document.getElementById('fecha').value = `${yyyy}-${mm}-${dd}`;
        document.getElementById('hora').value = `${hh}:${min}`;
        editingId = cita._id;
        if (submitBtn) submitBtn.textContent = 'Guardar cambios';
        if (editingIndicator) editingIndicator.hidden = false;
        document.getElementById('nombre').focus();
      });

      // Eliminar
      const eliminarBtn = document.createElement('button');
      eliminarBtn.type = 'button';
      eliminarBtn.className = 'eliminar';
      eliminarBtn.textContent = 'Eliminar';
      eliminarBtn.addEventListener('click', async () => {
        if (!confirm('¿Seguro que quieres eliminar esta cita?')) return;
        try {
          const res = await deleteCitaBackend(cita._id);
          if (res.ok) {
            showMessage('Cita eliminada.');
            await loadAndRender();
          } else {
            const err = await res.json().catch(() => ({}));
            showMessage(err.msg || 'Error eliminando cita', true);
          }
        } catch (e) {
          console.error(e);
          showMessage('Error eliminando cita', true);
        }
      });

      actions.appendChild(badge);
      actions.appendChild(arriveBtn);
      actions.appendChild(editarBtn);
      actions.appendChild(eliminarBtn);

      li.appendChild(meta);
      li.appendChild(actions);
      citasList.appendChild(li);
    });
  }

  // Cargar y renderizar desde backend
  async function loadAndRender() {
    try {
      const data = await fetchCitasBackend();
      renderCitasFromServer(data);
    } catch (e) {
      console.error(e);
      showMessage(e.message || 'Error cargando citas', true);
    }
  }

  // Manejo del submit: crear o editar en backend
  if (form) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      const nombre = document.getElementById('nombre').value.trim();
      const telefono = document.getElementById('telefono').value.trim();
      const servicio = document.getElementById('servicio').value;
      const fecha = document.getElementById('fecha').value;
      const hora = document.getElementById('hora').value;

      const error = validarCampos({ nombre, telefono, servicio, fecha, hora });
      if (error) {
        showMessage(error, true);
        return;
      }

      // Si editingId es null -> crear, si no -> editar
      if (!editingId) {
        try {
          const res = await crearCitaBackend({ service: servicio, date: fecha, hour: hora });
          const data = await res.json().catch(() => ({}));
          if (res.ok) {
            showMessage('¡Cita agendada con éxito!');
            resetFormState();
            await loadAndRender();
          } else {
            showMessage(data.msg || 'Error al agendar cita', true);
          }
        } catch (e) {
          console.error(e);
          showMessage('Error al agendar cita', true);
        }
      } else {
        // Editar cita existente
        try {
          const scheduledAt = new Date(`${fecha}T${hora}`).toISOString();
          const payload = { service: servicio, date: fecha, hour: hora, scheduledAt };
          const res = await editCitaBackend(editingId, payload);
          const data = await res.json().catch(() => ({}));
          if (res.ok) {
            showMessage('¡Cita editada con éxito!');
            resetFormState();
            await loadAndRender();
          } else {
            showMessage(data.msg || 'Error editando cita', true);
          }
        } catch (e) {
          console.error(e);
          showMessage('Error editando cita', true);
        }
      }
    });
  }

  function resetFormState() {
    if (form) form.reset();
    editingId = null;
    if (submitBtn) submitBtn.textContent = 'Confirmar cita';
    if (editingIndicator) editingIndicator.hidden = true;
  }

  // Delegación para inputs (limitar teléfono y nombre)
  const telefonoInput = document.getElementById('telefono');
  if (telefonoInput) {
    telefonoInput.addEventListener('input', function() {
      this.value = this.value.replace(/\D/g, '');
      if (this.value.length > 10) this.value = this.value.slice(0, 10);
    });
  }
  const nombreInput = document.getElementById('nombre');
  if (nombreInput) {
    nombreInput.addEventListener('input', function() {
      this.value = this.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
    });
  }

  // Auto-refresh cada minuto para reflejar expiradas y cambios
  setInterval(loadAndRender, 60 * 1000);

  // Inicial
  (async function init() {
    // Si no hay token, avisar que algunas acciones requieren login
    if (!getToken()) {
      showMessage('Inicia sesión para agendar y gestionar citas.');
    }
    await loadAndRender();
  })();
});
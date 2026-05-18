// ── Auth segura con Edge Function ──
const SUPABASE_URL = 'https://amhtrwrucsgfbkswhttk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtaHRyd3J1Y3NnZmJrc3dodHRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4NDQxNjMsImV4cCI6MjA5MzQyMDE2M30.uN-1kwj3H_CmRlB51nOhW_7INMoj0Cq-OlNAjwKMWPY';

function guardarToken(token) {
  try {
    sessionStorage.setItem('tauros_admin_token', token);
  } catch (e) {
    localStorage.setItem('tauros_admin_token', token);
  }
}

function obtenerToken() {
  try {
    return sessionStorage.getItem('tauros_admin_token') || localStorage.getItem('tauros_admin_token');
  } catch (e) {
    return localStorage.getItem('tauros_admin_token');
  }
}

function eliminarToken() {
  try {
    sessionStorage.removeItem('tauros_admin_token');
  } catch (e) {}
  localStorage.removeItem('tauros_admin_token');
}

async function verificarAuth() {
  const session = obtenerToken();
  if (!session) return false;

  try {
    const sessionData = JSON.parse(atob(session));
    if (sessionData.exp < Date.now()) {
      eliminarToken();
      return false;
    }
    mostrarPanel();
    return true;
  } catch {
    return false;
  }
}

async function login(password) {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/admin-auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ password })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Auth error:', data.error);
      return false;
    }

    guardarToken(data.token);
    mostrarPanel();
    return true;
  } catch (error) {
    console.error('Login error:', error);
    return false;
  }
}

function logout() {
  eliminarToken();
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('admin-panel').classList.remove('active');
}

function mostrarPanel() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('admin-panel').classList.add('active');
  cargarBarberos();
  cargarCitas();
}

// ── Funciones de datos ──

async function cargarBarberos() {
  const { data, error } = await window.supabaseClient
    .from('barberos')
    .select('*')
    .order('nombre');

  if (error) {
    console.error('Error:', error);
    return [];
  }
  renderTabBarberos(data || []);
  return data;
}

async function crearBarbero(datos) {
  const { data, error } = await window.supabaseClient
    .from('barberos')
    .insert([datos])
    .select()
    .single();

  if (error) {
    alert('Error al crear barbero: ' + error.message);
    return null;
  }
  return data;
}

async function actualizarBarbero(id, datos) {
  const { data, error } = await window.supabaseClient
    .from('barberos')
    .update(datos)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    alert('Error al actualizar: ' + error.message);
    return null;
  }
  return data;
}

async function toggleBarbero(id, activo) {
  const { error } = await window.supabaseClient
    .from('barberos')
    .update({ activo })
    .eq('id', id);

  if (error) {
    alert('Error al cambiar estado: ' + error.message);
    return false;
  }
  cargarBarberos();
  return true;
}

async function cargarHorarios(barberoId) {
  const { data, error } = await window.supabaseClient
    .from('horarios')
    .select('*')
    .eq('barbero_id', barberoId)
    .order('dia_semana');

  if (error) {
    console.error('Error:', error);
    return [];
  }
  return data || [];
}

async function guardarHorarios(barberoId, horarios) {
  const promesas = horarios.map(h => {
    return window.supabaseClient
      .from('horarios')
      .upsert({
        barbero_id: barberoId,
        dia_semana: h.dia,
        hora_inicio: h.inicio,
        hora_fin: h.fin,
        duracion_slot: 30,
        activo: h.activo
      }, { onConflict: 'barbero_id,dia_semana' });
  });

  await Promise.all(promesas);
  alert('Horarios guardados correctamente');
}

async function cargarCitas(filtros = {}) {
  let query = window.supabaseClient
    .from('citas')
    .select(`
      *,
      barberos(nombre)
    `)
    .order('fecha', { ascending: false })
    .order('hora_inicio', { ascending: true });

  if (filtros.fecha) {
    query = query.eq('fecha', filtros.fecha);
  }
  if (filtros.barberoId) {
    query = query.eq('barbero_id', filtros.barberoId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error:', error);
    return [];
  }

  const citasConNombre = (data || []).map(c => ({
    ...c,
    nombre_barbero: c.barberos?.nombre || 'Sin asignar'
  }));

  renderTabCitas(citasConNombre);
  return citasConNombre;
}

// ── Funciones de UI ──

function renderTabBarberos(barberos) {
  const container = document.getElementById('barberos-list');
  let html = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
      <h2 style="color: #333;">Barberos</h2>
      <button class="btn-agregar" onclick="abrirModal('crear')">+ Agregar Barbero</button>
    </div>
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Especialidad</th>
            <th>Silla</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
  `;

  if (barberos.length === 0) {
    html += '<tr><td colspan="5" style="text-align: center; color: #999;">No hay barberos registrados</td></tr>';
  } else {
    barberos.forEach(b => {
      const inicial = b.nombre.charAt(0).toUpperCase();
      html += `
        <tr>
          <td>
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, var(--accent) 0%, var(--accent-light) 100%); display: flex; align-items: center; justify-content: center; color: var(--bg); font-weight: 600;">${inicial}</div>
              ${b.nombre}
            </div>
          </td>
          <td>${b.especialidad || '-'}</td>
          <td>${b.silla_id || '-'}</td>
          <td>
            <span class="badge ${b.activo ? 'confirmada' : 'cancelada'}">
              ${b.activo ? 'Activo' : 'Inactivo'}
            </span>
          </td>
          <td>
            <button class="btn-sm btn-edit" onclick='abrirModal("editar", ${JSON.stringify(b)})'>Editar</button>
            <button class="btn-sm btn-toggle ${b.activo ? 'active' : ''}" onclick="toggleBarbero('${b.id}', ${!b.activo})">
              ${b.activo ? 'Desactivar' : 'Activar'}
            </button>
          </td>
        </tr>
      `;
    });
  }

  html += '</tbody></table></div>';
  container.innerHTML = html;
}

function renderTabHorarios() {
  const container = document.getElementById('horarios-content');
  const selectBarbero = document.getElementById('barbero-select');

  if (!selectBarbero) return;

  selectBarbero.onchange = async (e) => {
    const barberoId = e.target.value;
    if (!barberoId) {
      container.innerHTML = '<p style="color: #999; text-align: center;">Selecciona un barbero para ver sus horarios</p>';
      return;
    }

    const horarios = await cargarHorarios(barberoId);
    const dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
    const nombresDias = { lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles', jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo' };

    let html = `
      <h2 style="color: #333; margin-bottom: 25px;">Horarios de Atención</h2>
      <div class="horario-grid">
    `;

    dias.forEach(dia => {
      const horario = horarios.find(h => h.dia_semana === dia);
      html += `
        <div class="horario-row">
          <label>${nombresDias[dia]}</label>
          <input type="time" id="inicio-${dia}" value="${horario?.hora_inicio?.substr(0, 5) || '09:00'}">
          <span style="color: #999;">a</span>
          <input type="time" id="fin-${dia}" value="${horario?.hora_fin?.substr(0, 5) || '18:00'}">
          <input type="checkbox" id="activo-${dia}" ${horario?.activo !== false ? 'checked' : ''}>
          <label style="font-size: 0.85rem; min-width: auto;">Activo</label>
        </div>
      `;
    });

    html += `
      </div>
      <button class="btn-agregar" style="margin-top: 25px;" onclick="guardarHorariosBarbero('${barberoId}')">Guardar Horarios</button>
    `;

    container.innerHTML = html;
  };
}

async function guardarHorariosBarbero(barberoId) {
  const dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
  const horarios = dias.map(dia => ({
    dia,
    inicio: document.getElementById(`inicio-${dia}`).value,
    fin: document.getElementById(`fin-${dia}`).value,
    activo: document.getElementById(`activo-${dia}`).checked
  }));

  await guardarHorarios(barberoId, horarios);
}

function renderTabCitas(citas) {
  const container = document.getElementById('citas-list');

  let html = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
      <h2 style="color: #333;">Citas</h2>
    </div>
    <div class="filtros-bar">
      <input type="date" id="filtro-fecha" onchange="aplicarFiltros()">
      <select id="filtro-barbero" onchange="aplicarFiltros()">
        <option value="">Todos los barberos</option>
      </select>
    </div>
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Hora</th>
            <th>Cliente</th>
            <th>Contacto</th>
            <th>Barbero</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
  `;

  if (citas.length === 0) {
    html += '<tr><td colspan="6" style="text-align: center; color: #999;">No hay citas</td></tr>';
  } else {
    citas.forEach(c => {
      html += `
        <tr>
          <td>${formatearFechaAdmin(c.fecha)}</td>
          <td>${c.hora_inicio?.substr(0, 5)}</td>
          <td>${c.cliente_nombre}</td>
          <td>${c.cliente_contacto}</td>
          <td>${c.nombre_barbero}</td>
          <td><span class="badge ${c.estado}">${c.estado}</span></td>
        </tr>
      `;
    });
  }

  html += '</tbody></table></div>';
  container.innerHTML = html;

  cargarBarberos().then(barberos => {
    const select = document.getElementById('filtro-barbero');
    barberos.forEach(b => {
      const option = document.createElement('option');
      option.value = b.id;
      option.textContent = b.nombre;
      select.appendChild(option);
    });
  });
}

function formatearFechaAdmin(fechaStr) {
  const fecha = new Date(fechaStr + 'T00:00:00');
  return fecha.toLocaleDateString('es-MX');
}

function aplicarFiltros() {
  const fecha = document.getElementById('filtro-fecha').value;
  const barberoId = document.getElementById('filtro-barbero').value;
  cargarCitas({ fecha: fecha || null, barberoId: barberoId || null });
}

function abrirModal(tipo, datos = null) {
  const modal = document.getElementById('modal');
  const title = document.getElementById('modal-title');
  const form = document.getElementById('modal-form');

  if (tipo === 'crear') {
    title.textContent = 'Agregar Barbero';
    form.innerHTML = `
      <div class="form-group">
        <label>Nombre</label>
        <input type="text" id="modal-nombre" required>
      </div>
      <div class="form-group">
        <label>Especialidad</label>
        <input type="text" id="modal-especialidad">
      </div>
      <div class="form-group">
        <label>Silla</label>
        <input type="text" id="modal-silla" placeholder="Silla 1">
      </div>
      <div class="form-group">
        <label>Foto URL</label>
        <input type="url" id="modal-foto" placeholder="https://...">
      </div>
      <div class="modal-buttons">
        <button type="button" class="btn-cancel" onclick="cerrarModal()">Cancelar</button>
        <button type="button" class="btn-save" onclick="guardarBarbero()">Guardar</button>
      </div>
    `;
  } else if (tipo === 'editar') {
    title.textContent = 'Editar Barbero';
    form.innerHTML = `
      <input type="hidden" id="modal-id" value="${datos.id}">
      <div class="form-group">
        <label>Nombre</label>
        <input type="text" id="modal-nombre" value="${datos.nombre}" required>
      </div>
      <div class="form-group">
        <label>Especialidad</label>
        <input type="text" id="modal-especialidad" value="${datos.especialidad || ''}">
      </div>
      <div class="form-group">
        <label>Silla</label>
        <input type="text" id="modal-silla" value="${datos.silla_id || ''}">
      </div>
      <div class="form-group">
        <label>Foto URL</label>
        <input type="url" id="modal-foto" value="${datos.foto_url || ''}">
      </div>
      <div class="modal-buttons">
        <button type="button" class="btn-cancel" onclick="cerrarModal()">Cancelar</button>
        <button type="button" class="btn-save" onclick="guardarBarbero()">Actualizar</button>
      </div>
    `;
  }

  modal.classList.add('active');
}

function cerrarModal() {
  document.getElementById('modal').classList.remove('active');
}

async function guardarBarbero() {
  const nombre = document.getElementById('modal-nombre').value.trim();
  const especialidad = document.getElementById('modal-especialidad').value.trim();
  const silla = document.getElementById('modal-silla').value.trim();
  const foto = document.getElementById('modal-foto').value.trim();
  const id = document.getElementById('modal-id')?.value;

  if (!nombre) {
    alert('El nombre es obligatorio');
    return;
  }

  const datos = {
    nombre,
    especialidad: especialidad || null,
    silla_id: silla || null,
    foto_url: foto || null
  };

  let resultado;
  if (id) {
    resultado = await actualizarBarbero(id, datos);
  } else {
    resultado = await crearBarbero(datos);
  }

  if (resultado) {
    cerrarModal();
    cargarBarberos();
  }
}

function mostrarTab(tab) {
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));

  document.querySelector(`.admin-tab[data-tab="${tab}"]`).classList.add('active');
  document.getElementById(`tab-${tab}`).classList.add('active');

  if (tab === 'horarios') {
    renderTabHorarios();
    cargarBarberos().then(barberos => {
      const select = document.getElementById('barbero-select');
      select.innerHTML = '<option value="">Selecciona un barbero</option>';
      barberos.forEach(b => {
        const option = document.createElement('option');
        option.value = b.id;
        option.textContent = b.nombre;
        select.appendChild(option);
      });
    });
  }
}

// ── Event listeners ──

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.onsubmit = (e) => {
      e.preventDefault();
      const password = document.getElementById('admin-password').value;
      if (!login(password)) {
        document.getElementById('login-error').style.display = 'block';
      }
    };
  }

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.onclick = logout;
  }

  verificarAuth();
});
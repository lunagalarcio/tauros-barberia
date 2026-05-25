// ── Auth segura con Edge Function ──
const ADMIN_SUPABASE_URL = 'https://amhtrwrucsgfbkswhttk.supabase.co';
const ADMIN_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtaHRyd3J1Y3NnZmJrc3dodHRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4NDQxNjMsImV4cCI6MjA5MzQyMDE2M30.uN-1kwj3H_CmRlB51nOhW_7INMoj0Cq-OlNAjwKMWPY';

// Guarda el token de autenticación en sessionStorage o localStorage
function guardarToken(token) {
  try {
    sessionStorage.setItem('tauros_admin_token', token);
  } catch (e) {
    localStorage.setItem('tauros_admin_token', token);
  }
}

// Obtiene el token de autenticación almacenado
function obtenerToken() {
  try {
    return sessionStorage.getItem('tauros_admin_token') || localStorage.getItem('tauros_admin_token');
  } catch (e) {
    return localStorage.getItem('tauros_admin_token');
  }
}

// Elimina el token de autenticación de ambos storages
function eliminarToken() {
  try {
    sessionStorage.removeItem('tauros_admin_token');
  } catch (e) {}
  localStorage.removeItem('tauros_admin_token');
}

// Verifica si hay una sesión activa y muestra el panel
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

// Autentica al admin con la contraseña mediante Edge Function
async function login(password) {
  try {
    const response = await fetch(`${ADMIN_SUPABASE_URL}/functions/v1/admin-auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_SUPABASE_KEY}`
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

// Cierra la sesión y regresa a la pantalla de login
function logout() {
  eliminarToken();
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('admin-panel').classList.remove('active');
}

// Muestra el panel de administración y carga datos iniciales
function mostrarPanel() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('admin-panel').classList.add('active');
  cargarBarberos();
  cargarCitas();
}

// ── Funciones de datos ──

// Obtiene todos los barberos desde Supabase y los renderiza
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

// Crea un nuevo barbero en la base de datos
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

// Actualiza los datos de un barbero existente
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

// Activa o desactiva un barbero
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

// Obtiene los horarios de atención de un barbero
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

// Guarda los horarios de atención de un barbero
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

// Obtiene las citas con filtros opcionales y las renderiza
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

// Renderiza la tabla de barberos en el panel
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

// Renderiza el editor de horarios por barbero
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

// Recoge los valores del formulario y guarda los horarios
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

// Renderiza la tabla de citas con filtros
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

// Formatea una fecha al formato local de México
function formatearFechaAdmin(fechaStr) {
  const fecha = new Date(fechaStr + 'T00:00:00');
  return fecha.toLocaleDateString('es-MX');
}

// Aplica los filtros de fecha y barbero a la tabla de citas
function aplicarFiltros() {
  const fecha = document.getElementById('filtro-fecha').value;
  const barberoId = document.getElementById('filtro-barbero').value;
  cargarCitas({ fecha: fecha || null, barberoId: barberoId || null });
}

// Abre el modal para crear o editar un barbero
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

// Cierra el modal de creación/edición de barbero
function cerrarModal() {
  document.getElementById('modal').classList.remove('active');
}

// Guarda o actualiza un barbero según el contexto del modal
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

// Muestra la pestaña seleccionada del panel de administración
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

  if (tab === 'estadisticas') {
    renderEstadisticas();
  }
}

// ── Estadísticas ──

// Renderiza la sección de estadísticas con gráficos y métricas
async function renderEstadisticas() {
  const container = document.getElementById('estadisticas-content');
  container.innerHTML = '<div class="loading"><div class="spinner"></div><p>Cargando estadísticas...</p></div>';

  const [citas, barberos] = await Promise.all([
    cargarTodasLasCitas(),
    cargarBarberos()
  ]);

  if (!citas.length) {
    container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 40px;">No hay citas registradas</p>';
    return;
  }

  const stats = calcularEstadisticas(citas, barberos);

  container.innerHTML = `
    <div class="stats-page">
      <div class="stats-header">
        <h2>Estadísticas</h2>
        <p>${citas.length} citas registradas</p>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-card-icon citas"><i class="fas fa-calendar-check"></i></div>
          <div class="stat-card-body">
            <span class="stat-card-number">${citas.length}</span>
            <span class="stat-card-label">Total citas</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-card-icon barberos"><i class="fas fa-user-tie"></i></div>
          <div class="stat-card-body">
            <span class="stat-card-number">${barberos.filter(b => b.activo).length}</span>
            <span class="stat-card-label">Barberos activos</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-card-icon promedio"><i class="fas fa-chart-line"></i></div>
          <div class="stat-card-body">
            <span class="stat-card-number">${stats.promedioDiario}</span>
            <span class="stat-card-label">Citas/día (promedio)</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-card-icon mes"><i class="fas fa-calendar-alt"></i></div>
          <div class="stat-card-body">
            <span class="stat-card-number">${stats.citasEsteMes}</span>
            <span class="stat-card-label">Citas este mes</span>
          </div>
        </div>
      </div>

      <div class="stats-charts">
        <div class="stats-chart-card">
          <h3><i class="fas fa-trophy"></i> Barbero más solicitado</h3>
          <div class="stats-barberos-ranking">
            ${stats.rankingBarberos.map((b, i) => `
              <div class="ranking-item">
                <span class="ranking-pos">#${i + 1}</span>
                <span class="ranking-name">${b.nombre}</span>
                <span class="ranking-bar"><span style="width: ${b.porcentaje}%"></span></span>
                <span class="ranking-count">${b.total} citas</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="stats-chart-card">
          <h3><i class="fas fa-calendar-day"></i> Días con más citas</h3>
          <div class="stats-dias">
            ${stats.diasSemana.map(d => `
              <div class="dia-item">
                <span class="dia-label">${d.nombre}</span>
                <span class="dia-bar"><span style="width: ${d.porcentaje}%"></span></span>
                <span class="dia-count">${d.total}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <div class="stats-charts">
        <div class="stats-chart-card">
          <h3><i class="fas fa-chart-bar"></i> Citas por mes</h3>
          <div class="stats-meses">
            ${stats.meses.map(m => `
              <div class="mes-item">
                <span class="mes-label">${m.nombre}</span>
                <span class="mes-bar"><span style="width: ${m.porcentaje}%"></span></span>
                <span class="mes-count">${m.total}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="stats-chart-card">
          <h3><i class="fas fa-clock"></i> Horas más concurridas</h3>
          <div class="stats-horas">
            ${stats.horas.map(h => `
              <div class="hora-item">
                <span class="hora-label">${h.hora}</span>
                <span class="hora-bar"><span style="width: ${h.porcentaje}%"></span></span>
                <span class="hora-count">${h.total}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}

// Obtiene todas las citas con el nombre del barbero para estadísticas
async function cargarTodasLasCitas() {
  // Obtiene todas las citas con el nombre del barbero para estadísticas
  const { data, error } = await window.supabaseClient
    .from('citas')
    .select(`
      *,
      barberos(nombre)
    `)
    .order('fecha', { ascending: false });

  if (error) {
    console.error('Error cargando citas:', error);
    return [];
  }

  return (data || []).map(c => ({
    ...c,
    nombre_barbero: c.barberos?.nombre || 'Sin asignar'
  }));
}

// Calcula todas las métricas de estadísticas: ranking, días, meses, horas
function calcularEstadisticas(citas, barberos) {
  // Calcula todas las métricas: ranking barberos, días, meses, horas
  const nombresDias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const nombresMeses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  const hoy = new Date();
  const mesActual = hoy.getMonth();
  const anioActual = hoy.getFullYear();

  // Citas este mes
  const citasEsteMes = citas.filter(c => {
    const f = new Date(c.fecha + 'T00:00:00');
    return f.getMonth() === mesActual && f.getFullYear() === anioActual;
  });

  // Promedio diario (últimos 30 días)
  const hace30Dias = new Date();
  hace30Dias.setDate(hace30Dias.getDate() - 30);
  const citasUltimos30 = citas.filter(c => new Date(c.fecha + 'T00:00:00') >= hace30Dias);
  const promedioDiario = citasUltimos30.length ? Math.round(citasUltimos30.length / 30 * 10) / 10 : 0;

  // Ranking de barberos
  const conteoBarberos = {};
  citas.filter(c => c.nombre_barbero !== 'Sin asignar').forEach(c => {
    conteoBarberos[c.nombre_barbero] = (conteoBarberos[c.nombre_barbero] || 0) + 1;
  });
  const maxBarbero = Math.max(...Object.values(conteoBarberos), 1);
  const rankingBarberos = Object.entries(conteoBarberos)
    .map(([nombre, total]) => ({ nombre, total, porcentaje: Math.round(total / maxBarbero * 100) }))
    .sort((a, b) => b.total - a.total);

  // Días de la semana
  const conteoDias = [0, 0, 0, 0, 0, 0, 0];
  citas.forEach(c => {
    const dia = new Date(c.fecha + 'T00:00:00').getDay();
    conteoDias[dia]++;
  });
  const maxDia = Math.max(...conteoDias, 1);
  const diasSemana = nombresDias.map((nombre, i) => ({
    nombre,
    total: conteoDias[i],
    porcentaje: Math.round(conteoDias[i] / maxDia * 100)
  }));

  // Citas por mes (últimos 6)
  const conteoMeses = {};
  citas.forEach(c => {
    const f = new Date(c.fecha + 'T00:00:00');
    const key = `${f.getFullYear()}-${f.getMonth()}`;
    conteoMeses[key] = (conteoMeses[key] || 0) + 1;
  });
  const mesesOrdenados = Object.entries(conteoMeses)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-6);
  const maxMes = Math.max(...mesesOrdenados.map(([, t]) => t), 1);
  const meses = mesesOrdenados.map(([key, total]) => {
    const [anio, mes] = key.split('-').map(Number);
    return { nombre: `${nombresMeses[mes]} ${anio}`, total, porcentaje: Math.round(total / maxMes * 100) };
  });

  // Horas más concurridas
  const conteoHoras = {};
  citas.forEach(c => {
    const hora = c.hora_inicio ? c.hora_inicio.substring(0, 5) : '00:00';
    conteoHoras[hora] = (conteoHoras[hora] || 0) + 1;
  });
  const maxHora = Math.max(...Object.values(conteoHoras), 1);
  const horas = Object.entries(conteoHoras)
    .map(([hora, total]) => ({ hora, total, porcentaje: Math.round(total / maxHora * 100) }))
    .sort((a, b) => a.hora.localeCompare(b.hora));

  return { promedioDiario, citasEsteMes: citasEsteMes.length, rankingBarberos, diasSemana, meses, horas };
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
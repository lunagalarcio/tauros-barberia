// ── Estado global ──
const state = {
  barberoId: null,
  barberName: '',
  fecha: null,
  horaInicio: null,
  horaFin: null,
  paso: 1
};

// ── Funciones de datos (Supabase) ──

async function cargarSillas() {
  const { data, error } = await window.supabase
    .from('barberos')
    .select('*')
    .eq('activo', true)
    .order('nombre');

  if (error) {
    console.error('Error cargando barberos:', error);
    return [];
  }
  return data;
}

async function cargarHorario(barberoId, diaSemana) {
  const { data, error } = await window.supabase
    .from('horarios')
    .select('*')
    .eq('barbero_id', barberoId)
    .eq('dia_semana', diaSemana)
    .eq('activo', true)
    .single();

  if (error) {
    console.error('Error cargando horario:', error);
    return null;
  }
  return data;
}

async function cargarCitasDelDia(barberoId, fecha) {
  const { data, error } = await window.supabase
    .from('citas')
    .select('*')
    .eq('barbero_id', barberoId)
    .eq('fecha', fecha)
    .neq('estado', 'cancelada');

  if (error) {
    console.error('Error cargando citas:', error);
    return [];
  }
  return data || [];
}

async function verificarDisponibilidad(barberoId, fecha, horaInicio) {
  const citas = await cargarCitasDelDia(barberoId, fecha);
  return !citas.some(c => c.hora_inicio === horaInicio);
}

async function guardarCita(datos) {
  const { data, error } = await window.supabase
    .from('citas')
    .insert([datos])
    .select()
    .single();

  if (error) {
    console.error('Error guardando cita:', error);
    return { data: null, error };
  }
  return { data, error: null };
}

// ── Generador de slots ──

function generarSlots(horaInicio, horaFin, duracionMinutos) {
  const slots = [];
  const [hInicio, mInicio] = horaInicio.split(':').map(Number);
  const [hFin, mFin] = horaFin.split(':').map(Number);

  let minutosActual = hInicio * 60 + mInicio;
  const minutosFin = hFin * 60 + mFin;

  while (minutosActual + duracionMinutos <= minutosFin) {
    const horas = Math.floor(minutosActual / 60);
    const mins = minutosActual % 60;
    slots.push(`${String(horas).padStart(2, '0')}:${String(mins).padStart(2, '0')}`);
    minutosActual += duracionMinutos;
  }

  return slots;
}

// ── Funciones de UI ──

function renderSillas(sillas) {
  const container = document.getElementById('sillas-container');
  container.innerHTML = '';

  if (!sillas || sillas.length === 0) {
    container.innerHTML = '<p class="text-center" style="color: var(--text-muted);">No hay barberos disponibles en este momento.</p>';
    return;
  }

  sillas.forEach(barbero => {
    const card = document.createElement('div');
    card.className = 'silla-card';
    card.onclick = () => seleccionarBarbero(barbero);

    const inicial = barbero.nombre.charAt(0).toUpperCase();
    const fotoHtml = barbero.foto_url
      ? `<img src="${barbero.foto_url}" alt="${barbero.nombre}" class="silla-avatar">`
      : `<div class="silla-avatar">${inicial}</div>`;

    card.innerHTML = `
      ${fotoHtml}
      <h3>${barbero.nombre}</h3>
      <p class="especialidad">${barbero.especialidad || 'Barbero'}</p>
      <span class="badge disponible">Disponible</span>
    `;

    container.appendChild(card);
  });
}

function renderCalendario() {
  const container = document.getElementById('calendario-container');
  const hoy = new Date();
  const mesActual = hoy.getMonth();
  const anioActual = hoy.getFullYear();

  const nombreMes = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  let html = `<div style="text-align: center; margin-bottom: 20px;">
    <h3 style="color: var(--accent);">${nombreMes[mesActual]} ${anioActual}</h3>
  </div>`;

  diasSemana.forEach(dia => {
    html += `<div class="calendario-header">${dia}</div>`;
  });

  const primerDia = new Date(anioActual, mesActual, 1).getDay();
  const diasEnMes = new Date(anioActual, mesActual + 1, 0).getDate();

  for (let i = 0; i < primerDia; i++) {
    html += '<div class="calendario-dia disabled"></div>';
  }

  const hoyStr = `${anioActual}-${String(mesActual + 1).padStart(2, '0')}`;

  for (let dia = 1; dia <= diasEnMes; dia++) {
    const fecha = new Date(anioActual, mesActual, dia);
    const fechaStr = `${anioActual}-${String(mesActual + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    const esHoy = hoyStr === `${anioActual}-${String(mesActual + 1).padStart(2, '0')}` && dia === hoy.getDate();
    const esPasado = fecha < new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    const esDomingo = fecha.getDay() === 0;

    let clases = 'calendario-dia';
    if (esPasado || esDomingo) clases += ' disabled';
    if (esHoy) clases += ' hoy';

    html += `<div class="${clases}" data-fecha="${fechaStr}" onclick="seleccionarFecha('${fechaStr}', this)">${dia}</div>`;
  }

  container.innerHTML = html;
}

async function renderSlots(horario, citasOcupadas) {
  const container = document.getElementById('slots-container');
  container.innerHTML = '<div class="loading"><div class="spinner"></div>Cargando horarios...</div>';

  if (!horario) {
    container.innerHTML = '<p style="color: var(--text-muted); text-align: center;">Este día no hay atención disponible.</p>';
    return;
  }

  const slots = generarSlots(horario.hora_inicio, horario.hora_fin, horario.duracion_slot || 30);
  const ocupadas = new Set(citasOcupadas.map(c => c.hora_inicio));

  let html = '<div class="slots-grid">';
  slots.forEach(slot => {
    const estaOcupada = ocupadas.has(slot);
    const clase = estaOcupada ? 'ocupado' : 'disponible';
    const onclick = estaOcupada ? '' : `seleccionarSlot('${slot}', this)`;
    html += `<button class="slot-btn ${clase}" ${onclick}>${slot}</button>`;
  });
  html += '</div>';

  container.innerHTML = html;
}

function renderFormulario() {
  const container = document.getElementById('form-container');
  container.innerHTML = `
    <div class="form-container">
      <h3 style="color: var(--accent); margin-bottom: 25px; text-align: center;">Confirmar tu cita</h3>
      <div class="confirmacion-details" style="margin-bottom: 25px;">
        <p><strong>Barbero:</strong> ${state.barberName}</p>
        <p><strong>Fecha:</strong> ${formatearFecha(state.fecha)}</p>
        <p><strong>Hora:</strong> ${state.horaInicio}</p>
      </div>
      <div class="message error" id="form-error"></div>
      <form onsubmit="enviarFormulario(event)">
        <div class="form-group">
          <label>Nombre completo</label>
          <input type="text" id="cliente-nombre" placeholder="Tu nombre" required>
        </div>
        <div class="form-group">
          <label>Teléfono o WhatsApp</label>
          <input type="text" id="cliente-contacto" placeholder="Tu número de contacto" required>
        </div>
        <button type="submit" class="btn-submit">Confirmar cita</button>
        <button type="button" class="btn-back" onclick="volverPaso(3)">Volver</button>
      </form>
    </div>
  `;
}

function renderConfirmacion(cita) {
  const container = document.getElementById('confirmacion-container');
  container.innerHTML = `
    <div class="confirmacion-container">
      <div class="confirmacion-icon">✓</div>
      <h2>¡Cita confirmad!</h2>
      <div class="confirmacion-details">
        <p><strong>Barbero:</strong> ${state.barberName}</p>
        <p><strong>Fecha:</strong> ${formatearFecha(state.fecha)}</p>
        <p><strong>Hora:</strong> ${state.horaInicio}</p>
        <p><strong>Cliente:</strong> ${cita.cliente_nombre}</p>
        <p><strong>Contacto:</strong> ${cita.cliente_contacto}</p>
      </div>
      <p style="color: var(--text-muted); margin-bottom: 25px;">Te esperamos. Llega 5 minutos antes.</p>
      <button class="btn-nueva" onclick="nuevaCita()">Agendar otra cita</button>
    </div>
  `;
}

function formatearFecha(fechaStr) {
  const fecha = new Date(fechaStr + 'T00:00:00');
  return fecha.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function mostrarPaso(numero) {
  state.paso = numero;
  actualizarStepper(numero);

  document.getElementById('step-1').classList.toggle('hidden', numero !== 1);
  document.getElementById('step-2').classList.toggle('hidden', numero !== 2);
  document.getElementById('step-3').classList.toggle('hidden', numero !== 3);
  document.getElementById('step-4').classList.toggle('hidden', numero !== 4);
  document.getElementById('step-5').classList.toggle('hidden', numero !== 5);

  const wizardSection = document.querySelector('.wizard-section');
  if (numero > 1) {
    wizardSection.classList.add('active');
    wizardSection.scrollIntoView({ behavior: 'smooth' });
  }
}

function actualizarStepper(paso) {
  const steps = document.querySelectorAll('.step');
  steps.forEach((step, index) => {
    step.classList.remove('active', 'completed');
    if (index + 1 < paso) {
      step.classList.add('completed');
    } else if (index + 1 === paso) {
      step.classList.add('active');
    }
  });
}

// ── Event handlers ──

async function seleccionarBarbero(barbero) {
  state.barberoId = barbero.id;
  state.barberName = barbero.nombre;
  state.fecha = null;
  state.horaInicio = null;
  state.horaFin = null;

  renderCalendario();
  mostrarPaso(2);
}

function seleccionarFecha(fecha, element) {
  const dias = document.querySelectorAll('.calendario-dia:not(.disabled)');
  dias.forEach(d => d.classList.remove('selected'));
  element.classList.add('selected');

  state.fecha = fecha;
  cargarSlotsParaFecha();
}

async function cargarSlotsParaFecha() {
  const diaSemana = getDiaSemana(state.fecha);
  const horario = await cargarHorario(state.barberoId, diaSemana);
  const citas = await cargarCitasDelDia(state.barberoId, state.fecha);
  renderSlots(horario, citas);
}

function getDiaSemana(fechaStr) {
  const dias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  const fecha = new Date(fechaStr + 'T00:00:00');
  return dias[fecha.getDay()];
}

function seleccionarSlot(hora, element) {
  state.horaInicio = hora;

  const slots = document.querySelectorAll('.slot-btn.disponible');
  slots.forEach(s => s.classList.remove('seleccionado'));
  element.classList.add('seleccionado');

  renderFormulario();
  mostrarPaso(4);
}

function volverPaso(paso) {
  if (paso === 3) {
    state.horaInicio = null;
    state.horaFin = null;
  }
  mostrarPaso(paso);
}

async function enviarFormulario(e) {
  e.preventDefault();

  const nombre = document.getElementById('cliente-nombre').value.trim();
  const contacto = document.getElementById('cliente-contacto').value.trim();
  const errorDiv = document.getElementById('form-error');

  if (!nombre || !contacto) {
    errorDiv.textContent = 'Por favor completa todos los campos.';
    errorDiv.style.display = 'block';
    return;
  }

  const disponible = await verificarDisponibilidad(state.barberoId, state.fecha, state.horaInicio);
  if (!disponible) {
    errorDiv.textContent = 'Lo sentimos, este horario ya fue reservado. Selecciona otro.';
    errorDiv.style.display = 'block';
    return;
  }

  const datos = {
    barbero_id: state.barberoId,
    cliente_nombre: nombre,
    cliente_contacto: contacto,
    fecha: state.fecha,
    hora_inicio: state.horaInicio,
    hora_fin: state.horaFin || '00:30:00',
    estado: 'confirmada'
  };

  const { data, error } = await guardarCita(datos);

  if (error) {
    errorDiv.textContent = 'Error al guardar la cita. Intenta de nuevo.';
    errorDiv.style.display = 'block';
    return;
  }

  errorDiv.style.display = 'none';
  document.getElementById('form-container').innerHTML = '';
  document.getElementById('confirmacion-container').innerHTML = '';
  renderConfirmacion(data);
  mostrarPaso(5);
}

function nuevaCita() {
  state.barberoId = null;
  state.barberName = '';
  state.fecha = null;
  state.horaInicio = null;
  state.horaFin = null;

  document.getElementById('sillas-container').innerHTML = '';
  document.getElementById('confirmacion-container').innerHTML = '';

  cargarSillas().then(renderSillas);
  mostrarPaso(1);

  window.scrollTo({ top: document.getElementById('sillas').offsetTop - 100, behavior: 'smooth' });
}

// ── Inicialización ──

document.addEventListener('DOMContentLoaded', () => {
  cargarSillas().then(renderSillas);
});

function initClient() {
  cargarSillas().then(renderSillas);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initClient);
} else {
  initClient();
}
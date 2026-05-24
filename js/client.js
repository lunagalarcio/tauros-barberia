// ── Estado global ──
const state = {
  barberoId: null,
  barberName: '',
  barberEspecialidad: '',
  fecha: null,
  horaInicio: null,
  horaFin: null,
  duracionSlot: 60,
  citaId: null,
  paso: 1,
  mesActual: new Date().getMonth(),
  anioActual: new Date().getFullYear(),
  barberosData: []
};

// ── Sanitización para prevenir XSS ──
function sanitizeHTML(str) {
  if (typeof str !== 'string') return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function escapeAttr(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

// ── Funciones de datos (Supabase) ──

async function cargarSillas() {
  const { data, error } = await window.supabaseClient
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
  const { data, error } = await window.supabaseClient
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
  const { data, error } = await window.supabaseClient
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
  const horaFormateada = horaInicio.substring(0, 5);
  return !citas.some(c => {
    const horaCita = typeof c.hora_inicio === 'string' ? c.hora_inicio.substring(0, 5) : c.hora_inicio;
    return horaCita === horaFormateada;
  });
}

async function guardarCita(datos) {
  const { data, error } = await window.supabaseClient
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

function generarSlots(horaInicio, horaFin, duracionMinutos, fechaSeleccionada) {
  const slots = [];
  const [hInicio, mInicio] = horaInicio.split(':').map(Number);
  const [hFin, mFin] = horaFin.split(':').map(Number);

  let minutosActual = hInicio * 60 + mInicio;
  const minutosFin = hFin * 60 + mFin;

  const esHoy = esFechaHoy(fechaSeleccionada);
  const horaActual = new Date();
  const minutosAhora = horaActual.getHours() * 60 + horaActual.getMinutes();

  while (minutosActual + duracionMinutos <= minutosFin) {
    const horas = Math.floor(minutosActual / 60);
    const mins = minutosActual % 60;
    const slotHora = `${String(horas).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    const minutosSlot = horas * 60 + mins;

    let bloqueado = false;
    if (esHoy && minutosSlot < minutosAhora) {
      bloqueado = true;
    }

    slots.push({
      hora: slotHora,
      bloqueado: bloqueado
    });
    minutosActual += duracionMinutos;
  }

  return slots;
}

function esFechaHoy(fechaStr) {
  if (!fechaStr) return false;
  const fecha = new Date(fechaStr + 'T00:00:00');
  const hoy = new Date();
  return fecha.toDateString() === hoy.toDateString();
}

// ── Funciones de UI ──

function renderSillas(sillas) {
  const container = document.getElementById('sillas-container');
  container.innerHTML = '';

  if (!sillas || sillas.length === 0) {
    container.innerHTML = '<p class="text-center" style="color: var(--text-muted);">No hay barberos disponibles en este momento.</p>';
    return;
  }

  state.barberosData = sillas;

  sillas.forEach((barbero, index) => {
    const card = document.createElement('div');
    card.className = 'silla-card';
    card.dataset.id = barbero.id;
    card.onclick = () => seleccionarBarbero(barbero, card);

    const nombreSanitized = sanitizeHTML(barbero.nombre);
    const especialidadSanitized = sanitizeHTML(barbero.especialidad || 'Barbero');
    const inicial = nombreSanitized.charAt(0).toUpperCase();
    const fotoUrlSafe = barbero.foto_url ? escapeAttr(barbero.foto_url) : '';

    const fotoHtml = barbero.foto_url
      ? `<div class="silla-avatar"><img src="${fotoUrlSafe}" alt="${nombreSanitized}"></div>`
      : `<div class="silla-avatar"><div class="silla-avatar-initials">${inicial}</div></div>`;

    card.innerHTML = `
      <div class="silla-number">${index + 1}</div>
      <div class="silla-avatar-wrapper">
        ${fotoHtml}
      </div>
      <div class="silla-info">
        <h3>${nombreSanitized}</h3>
        <p class="especialidad"><i class="fas fa-cut"></i> ${especialidadSanitized}</p>
        <span class="badge disponible">Disponible</span>
      </div>
    `;

    container.appendChild(card);
  });
}

function renderCalendario() {
  const container = document.getElementById('calendario-container');
  const hoy = new Date();
  const mesActual = state.mesActual;
  const anioActual = state.anioActual;

  const nombreMes = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  let html = `
    <div class="calendario-mes-nav">
      <button class="calendario-nav" onclick="cambiarMes(-1)">
        <i class="fas fa-chevron-left"></i>
      </button>
      <span class="mes-label">${nombreMes[mesActual]} ${anioActual}</span>
      <button class="calendario-nav" onclick="cambiarMes(1)">
        <i class="fas fa-chevron-right"></i>
      </button>
    </div>
  `;

  html += '<div class="calendario-grid">';
  diasSemana.forEach(dia => {
    html += `<div class="calendario-header">${dia}</div>`;
  });

  const primerDia = new Date(anioActual, mesActual, 1).getDay();
  const diasEnMes = new Date(anioActual, mesActual + 1, 0).getDate();

  for (let i = 0; i < primerDia; i++) {
    html += '<div class="calendario-dia disabled"></div>';
  }

  const hoyStr = `${anioActual}-${String(mesActual + 1).padStart(2, '0')}`;
  const hoyNum = hoy.getDate();

  for (let dia = 1; dia <= diasEnMes; dia++) {
    const fecha = new Date(anioActual, mesActual, dia);
    const fechaStr = `${anioActual}-${String(mesActual + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    const esHoy = mesActual === hoy.getMonth() && anioActual === hoy.getFullYear() && dia === hoyNum;
    const esPasado = fecha < new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    const esDomingo = fecha.getDay() === 0;

    let clases = 'calendario-dia';
    if (esPasado) clases += ' disabled';
    if (esHoy) clases += ' hoy';
    if (state.fecha === fechaStr) clases += ' selected';

    html += `<div class="${clases}" data-fecha="${fechaStr}" onclick="seleccionarFecha('${fechaStr}', this)">${dia}</div>`;
  }

  html += '</div>';
  container.innerHTML = html;
}

async function renderSlots(horario, citasOcupadas) {
  const container = document.getElementById('slots-container');
  container.innerHTML = '<div class="loading"><div class="spinner"></div>Cargando horarios...</div>';

  if (!horario) {
    container.innerHTML = `
      <p style="color: var(--text-muted); text-align: center; padding: 40px 20px;">
        <i class="fas fa-calendar-times" style="font-size: 2rem; margin-bottom: 12px; display: block;"></i>
        Este día no hay atención disponible
      </p>`;
    return;
  }

  const slots = generarSlots(horario.hora_inicio, horario.hora_fin, horario.duracion_slot || 30, state.fecha);
  const ocupadas = new Set(citasOcupadas.map(c => {
    const h = c.hora_inicio;
    return typeof h === 'string' ? h.substring(0, 5) : h;
  }));

  let html = `<div class="slots-grid">`;
  const esHoy = esFechaHoy(state.fecha);
  let horasBloqueadasHoy = 0;

  slots.forEach(slot => {
    const estaOcupada = ocupadas.has(slot.hora);
    const estaBloqueado = slot.bloqueado;

    let clase = '';
    let disabled = '';
    let icono = '';

    if (estaOcupada) {
      clase = 'ocupado';
      disabled = 'disabled';
      icono = '<i class="fas fa-lock"></i>';
    } else if (estaBloqueado) {
      clase = 'bloqueado-pasado';
      disabled = 'disabled';
      icono = '<i class="fas fa-clock"></i>';
      if (esHoy) horasBloqueadasHoy++;
    } else {
      clase = 'disponible';
      icono = '<i class="far fa-clock"></i>';
    }

    const labelHora = estaBloqueado ? `${slot.hora} (pasada)` : slot.hora;
    html += `<button class="slot-btn ${clase}" data-hora="${slot.hora}" ${disabled}>${icono} ${labelHora}</button>`;
  });
  html += '</div>';

  if (esHoy && horasBloqueadasHoy > 0) {
    html = `<p style="color: var(--text-muted); text-align: center; margin-bottom: 16px; font-size: 0.85rem;"><i class="fas fa-info-circle"></i> Las horas pasadas no están disponibles</p>` + html;
  }

  container.innerHTML = html;

  container.addEventListener('click', function(e) {
    const btn = e.target.closest('.slot-btn.disponible');
    if (btn) {
      const hora = btn.dataset.hora;
      seleccionarSlot(hora, btn);
    }
  });
}

function renderFormulario() {
  const container = document.getElementById('form-container');
  const fechaFormateada = formatearFecha(state.fecha);

  container.innerHTML = `
    <div class="form-container">
      <div class="form-header">
        <h3><i class="fas fa-calendar-check"></i> Confirma tu cita</h3>
        <p>Completa tus datos para finalizar</p>
      </div>
      <div class="form-summary">
        <div class="form-summary-item">
          <span><i class="fas fa-user-tie"></i> Barbero</span>
          <span>${state.barberName}</span>
        </div>
        <div class="form-summary-item">
          <span><i class="fas fa-calendar-day"></i> Fecha</span>
          <span>${fechaFormateada}</span>
        </div>
        <div class="form-summary-item">
          <span><i class="fas fa-clock"></i> Hora</span>
          <span>${state.horaInicio}</span>
        </div>
      </div>
      <div class="message error" id="form-error"></div>
      <form onsubmit="enviarFormulario(event)">
        <div class="form-group">
          <label><i class="fas fa-user"></i> Nombre completo</label>
          <input type="text" id="cliente-nombre" placeholder="Tu nombre completo" required>
        </div>
        <div class="form-group">
          <label><i class="fas fa-envelope"></i> Correo electrónico</label>
          <input type="email" id="cliente-email" placeholder="tu@email.com" required>
        </div>
        <div class="form-group">
          <label><i class="fas fa-phone"></i> Teléfono o WhatsApp</label>
          <input type="tel" id="cliente-contacto" placeholder="Ej: 3159780853" pattern="[0-9]{10,}" title="Ingresa al menos 10 dígitos" required>
        </div>
        <button type="submit" class="btn-submit"><i class="fas fa-check"></i> Confirmar cita</button>
        <button type="button" class="btn-back" onclick="volverPaso(3)"><i class="fas fa-arrow-left"></i> Volver</button>
      </form>
    </div>
  `;
}

function renderConfirmacion(cita) {
  const container = document.getElementById('confirmacion-container');
  const fechaFormateada = formatearFecha(state.fecha);
  state.citaId = cita.id;

  const nombreSanitized = sanitizeHTML(state.barberName);
  const clienteNombreSanitized = sanitizeHTML(cita.cliente_nombre || '');
  const clienteEmailSanitized = sanitizeHTML(cita.cliente_email || '');
  const clienteContactoSanitized = sanitizeHTML(cita.cliente_contacto || '');

  container.innerHTML = `
    <div class="confirmacion-container">
      <div class="confirmacion-icon"><i class="fas fa-check"></i></div>
      <h2>¡Cita confirmada!</h2>
      <p>Te esperamos con la mejor atención</p>
      <div class="confirmacion-details">
        <p><span><i class="fas fa-user-tie"></i> Barbero</span> <strong>${nombreSanitized}</strong></p>
        <p><span><i class="fas fa-calendar-day"></i> Fecha</span> <strong>${fechaFormateada}</strong></p>
        <p><span><i class="fas fa-clock"></i> Hora</span> <strong>${escapeAttr(state.horaInicio)}</strong></p>
        <p><span><i class="fas fa-user"></i> Cliente</span> <strong>${clienteNombreSanitized}</strong></p>
        <p><span><i class="fas fa-envelope"></i> Email</span> <strong>${clienteEmailSanitized}</strong></p>
        <p><span><i class="fas fa-phone"></i> Contacto</span> <strong>${clienteContactoSanitized}</strong></p>
      </div>
      <p style="color: var(--text-muted); margin-bottom: 25px;">
        <i class="fas fa-info-circle"></i> Llega 5 minutos antes de tu hora
      </p>
      <div class="confirmacion-actions">
        <button class="btn-nueva" onclick="nuevaCita()">
          <i class="fas fa-plus"></i> Agendar otra cita
        </button>
        <button class="btn-cancelar" onclick="cancelarCita('${state.citaId}')">
          <i class="fas fa-times"></i> Cancelar cita
        </button>
      </div>
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

function actualizarDisplayFecha() {
  const display = document.getElementById('selected-date-display');
  if (!state.fecha) {
    display.style.display = 'none';
    return;
  }

  display.style.display = 'block';
  const fecha = new Date(state.fecha + 'T00:00:00');
  const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  document.getElementById('date-day').textContent = fecha.getDate();
  document.getElementById('date-weekday').textContent = diasSemana[fecha.getDay()];
  document.getElementById('date-full').textContent = `${diasSemana[fecha.getDay()]} ${fecha.getDate()} de ${meses[fecha.getMonth()]} del ${fecha.getFullYear()}`;
}

// ── Event handlers ──

async function seleccionarBarbero(barbero, cardElement) {
  document.querySelectorAll('.silla-card').forEach(card => card.classList.remove('selected'));
  cardElement.classList.add('selected');

  state.barberoId = barbero.id;
  state.barberName = barbero.nombre;
  state.barberEspecialidad = barbero.especialidad || 'Barbero';
  state.fecha = null;
  state.horaInicio = null;
  state.horaFin = null;

  state.mesActual = new Date().getMonth();
  state.anioActual = new Date().getFullYear();

  const btnNext = document.getElementById('btn-fecha-next');
  if (btnNext) btnNext.disabled = true;

  renderCalendario();
  actualizarDisplayFecha();
  mostrarPaso(2);
}

function seleccionarFecha(fecha, element) {
  if (element.classList.contains('disabled')) return;

  const dias = document.querySelectorAll('.calendario-dia:not(.disabled)');
  dias.forEach(d => d.classList.remove('selected'));
  element.classList.add('selected');

  state.fecha = fecha;
  actualizarDisplayFecha();

  const btnNext = document.getElementById('btn-fecha-next');
  if (btnNext) btnNext.disabled = false;
}

function irASlots() {
  if (!state.fecha) return;
  cargarSlotsParaFecha();
  mostrarPaso(3);
}

async function cargarSlotsParaFecha() {
  const diaSemana = getDiaSemana(state.fecha);
  const horario = await cargarHorario(state.barberoId, diaSemana);
  const citas = await cargarCitasDelDia(state.barberoId, state.fecha);
  
  if (horario) {
    state.duracionSlot = horario.duracion_slot || 60;
  }

  const container = document.getElementById('slots-container');
  const fechaFormateada = formatearFecha(state.fecha);

  const wrapper = container.closest('.slots-wrapper');
  wrapper.querySelector('.slots-title').textContent = `Horarios para ${state.barberName}`;

  let dateInfo = wrapper.querySelector('.slots-date-info');
  if (!dateInfo) {
    dateInfo = document.createElement('div');
    dateInfo.className = 'slots-date-info';
    wrapper.insertBefore(dateInfo, wrapper.querySelector('.slots-grid') || container);
  }
  dateInfo.innerHTML = `<i class="fas fa-calendar-alt"></i> ${fechaFormateada}`;

  renderSlots(horario, citas);
}

function getDiaSemana(fechaStr) {
  const dias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  const fecha = new Date(fechaStr + 'T00:00:00');
  return dias[fecha.getDay()];
}

function seleccionarSlot(hora, element) {
  state.horaInicio = hora;
  
  const [h, m] = hora.split(':').map(Number);
  const duracion = state.duracionSlot || 60;
  const minutosFin = h * 60 + m + duracion;
  const horaFin = `${String(Math.floor(minutosFin / 60)).padStart(2, '0')}:${String(minutosFin % 60).padStart(2, '0')}`;
  state.horaFin = horaFin;

  const slots = document.querySelectorAll('.slot-btn.disponible');
  slots.forEach(s => s.classList.remove('seleccionado'));
  element.classList.add('seleccionado');

  const btnNext = document.getElementById('btn-hora-next');
  if (btnNext) btnNext.disabled = false;
}

function irAFormulario() {
  if (!state.horaInicio) return;
  renderFormulario();
  mostrarPaso(4);
}

function irASlots() {
  if (!state.fecha) return;
  const btnNext = document.getElementById('btn-hora-next');
  if (btnNext) btnNext.disabled = true;
  state.horaInicio = null;
  cargarSlotsParaFecha();
  mostrarPaso(3);
}

function cambiarMes(direccion) {
  state.mesActual += direccion;
  if (state.mesActual > 11) {
    state.mesActual = 0;
    state.anioActual++;
  } else if (state.mesActual < 0) {
    state.mesActual = 11;
    state.anioActual--;
  }
  renderCalendario();
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
  const email = document.getElementById('cliente-email').value.trim();
  const contacto = document.getElementById('cliente-contacto').value.trim();
  const errorDiv = document.getElementById('form-error');

  if (!nombre || !email || !contacto) {
    errorDiv.textContent = 'Por favor completa todos los campos.';
    errorDiv.style.display = 'block';
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    errorDiv.innerHTML = '<i class="fas fa-exclamation-circle"></i> Ingresa un correo electrónico válido.';
    errorDiv.style.display = 'block';
    return;
  }

  if (!/^\d+$/.test(contacto)) {
    errorDiv.innerHTML = '<i class="fas fa-exclamation-circle"></i> Ingresa un número de contacto válido (solo dígitos).';
    errorDiv.style.display = 'block';
    return;
  }

  if (contacto.length < 10) {
    errorDiv.innerHTML = '<i class="fas fa-exclamation-circle"></i> El número debe tener al menos 10 dígitos.';
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
    cliente_email: email,
    cliente_contacto: contacto,
    fecha: state.fecha,
    hora_inicio: state.horaInicio,
    hora_fin: state.horaFin,
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
  if (data && data.id) {
    state.citaId = data.id;
  }

  // Enviar confirmación por correo
  fetch('https://amhtrwrucsgfbkswhttk.supabase.co/functions/v1/send-confirmation', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtaHRyd3J1Y3NnZmJrc3dodHRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4NDQxNjMsImV4cCI6MjA5MzQyMDE2M30.uN-1kwj3H_CmRlB51nOhW_7INMoj0Cq-OlNAjwKMWPY'
    },
    body: JSON.stringify({
      cliente_email: email,
      cliente_nombre: nombre,
      barbero_nombre: state.barberName,
      fecha: state.fecha,
      hora: state.horaInicio
    })
  }).catch(e => console.error('Error enviando correo:', e));

  renderConfirmacion(data);
  mostrarPaso(5);
}

function nuevaCita() {
  state.barberoId = null;
  state.barberName = '';
  state.barberEspecialidad = '';
  state.fecha = null;
  state.horaInicio = null;
  state.horaFin = null;
  state.duracionSlot = 60;
  state.citaId = null;
  state.mesActual = new Date().getMonth();
  state.anioActual = new Date().getFullYear();

  document.getElementById('sillas-container').innerHTML = '';
  document.getElementById('confirmacion-container').innerHTML = '';

  cargarSillas().then(renderSillas);
  mostrarPaso(1);

  window.scrollTo({ top: document.getElementById('sillas').offsetTop - 100, behavior: 'smooth' });
}

// ── Inicialización ──

function initClient() {
  cargarSillas().then(renderSillas);
}

function playVideo() {
  const placeholder = document.getElementById('video-placeholder');
  const container = document.getElementById('video-container');
  const iframe = document.getElementById('video-iframe');

  iframe.src = 'https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1';
  placeholder.style.display = 'none';
  container.style.display = 'block';
}

async function cancelarCita(citaId) {
  if (!citaId || citaId === 'sin-id') {
    citaId = state.citaId;
  }
  console.log('ID de cita a cancelar:', citaId);
  if (!citaId) {
    alert('No se encontró el ID de la cita.');
    return;
  }
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-icon warning"><i class="fas fa-exclamation-triangle"></i></div>
      <h3>¿Cancelar cita?</h3>
      <p>La hora quedará disponible para otros clientes.</p>
      <div class="modal-actions">
        <button class="btn-cancelar-modal" id="btn-confirmar-cancelar">Sí, cancelar</button>
        <button class="btn-volver-modal" id="btn-volver-cancelar">No, volver</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.style.display = 'flex';

  document.getElementById('btn-confirmar-cancelar').addEventListener('click', async function() {
    this.disabled = true;
    this.textContent = 'Cancelando...';

    const { error } = await window.supabaseClient
      .from('citas')
      .update({ estado: 'cancelada' })
      .eq('id', citaId);

    if (error) {
      alert('Error al cancelar la cita: ' + error.message);
      console.error('Error cancelando:', error);
      return;
    }

    console.log('Cita cancelada correctamente, ID:', citaId);

    const modalContent = modal.querySelector('.modal-content');
    modalContent.innerHTML = `
      <div class="modal-icon success"><i class="fas fa-check-circle"></i></div>
      <h3>¡Cita cancelada!</h3>
      <p>La hora ha sido liberada.</p>
      <button class="btn-aceptar" id="btn-aceptar-cancelado">Aceptar</button>
    `;

    document.getElementById('btn-aceptar-cancelado').addEventListener('click', function() {
      modal.remove();
      nuevaCita();
    });
  });

  document.getElementById('btn-volver-cancelar').addEventListener('click', function() {
    modal.remove();
  });
}

function toggleNav() {
  const nav = document.querySelector('.nav-menu');
  nav.classList.toggle('active');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initClient);
} else {
  initClient();
}
// app.js — Lógica principal CardioVet
// Supabase + Auth + Navegación + Formulario + Informes

// ============================================================
// CONFIGURACIÓN
// ============================================================
const SUPABASE_URL      = "https://susdapyygrdtmaqflmde.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1c2RhcHl5Z3JkdG1hcWZsbWRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNzIyMTQsImV4cCI6MjA4OTk0ODIxNH0.aMHIMrm4JrAnVn0243rXjHR3vakRkUyX2-3s_1TNda4";
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================================
// ESTADO GLOBAL
// ============================================================
window.dbRazas         = {};
let currentUser        = null;
let currentVet         = null;
let consultaGuardada   = null;
let medCount           = 0;
let lastCalcs          = {};

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
  // Fecha documento por defecto
  const hoy = new Date().toISOString().split('T')[0];
  const fdoc = document.getElementById('fechaDocumento');
  if (fdoc) fdoc.value = hoy;

  await checkSession();
  bindAuth();
  bindNav();
  bindForm();
  bindMedications();
  bindReport();
});

// ============================================================
// AUTENTICACIÓN
// ============================================================
async function checkSession() {
  const { data: { session } } = await sb.auth.getSession();
  if (session) {
    await onLogin(session.user);
  }

  sb.auth.onAuthStateChange(async (event, session) => {
    if (session) {
      await onLogin(session.user);
    } else {
      onLogout();
    }
  });
}

async function onLogin(user) {
  currentUser = user;
  document.getElementById('authScreen').classList.add('hidden');
  document.getElementById('mainApp').classList.remove('hidden');

  // Cargar perfil veterinario
  const { data: vet } = await sb.from('veterinarios').select('*').eq('id', user.id).single();
  if (vet) {
    currentVet = vet;
  } else {
    // Crear perfil básico desde metadata
    const meta = user.user_metadata || {};
    const nuevo = {
      id: user.id,
      nombre_completo: meta.nombre_completo || user.email,
      num_colegiado: meta.num_colegiado || '',
      clinica: meta.clinica || ''
    };
    await sb.from('veterinarios').upsert(nuevo);
    currentVet = nuevo;
  }

  // Actualizar UI
  const nombre = currentVet?.nombre_completo || user.email;
  const clinica = currentVet?.clinica || '';
  document.getElementById('vetName').textContent = nombre;
  document.getElementById('vetClinic').textContent = clinica;
  document.getElementById('vetAvatar').textContent = nombre.charAt(0).toUpperCase();

  await cargarDatos();
}

function onLogout() {
  currentUser = null;
  currentVet  = null;
  document.getElementById('authScreen').classList.remove('hidden');
  document.getElementById('mainApp').classList.add('hidden');
}

function bindAuth() {
  // Cambiar entre login y registro
  document.getElementById('btnShowRegister').addEventListener('click', () => {
    document.getElementById('loginView').classList.add('hidden');
    document.getElementById('registerView').classList.remove('hidden');
    clearAuthNotice();
  });
  document.getElementById('btnShowLogin').addEventListener('click', () => {
    document.getElementById('registerView').classList.add('hidden');
    document.getElementById('loginView').classList.remove('hidden');
    clearAuthNotice();
  });

  // Login
  document.getElementById('btnLogin').addEventListener('click', async () => {
    const email = document.getElementById('loginEmail').value.trim();
    const pass  = document.getElementById('loginPassword').value;
    if (!email || !pass) { showAuthNotice('Completa todos los campos', 'error'); return; }

    const btn = document.getElementById('btnLogin');
    btn.disabled = true; btn.textContent = 'Entrando...';

    const { error } = await sb.auth.signInWithPassword({ email, password: pass });
    if (error) {
      showAuthNotice(
        error.message.includes('Email not confirmed')
          ? '⛔ Confirma tu email antes de entrar.'
          : '❌ Credenciales incorrectas.',
        'error'
      );
    }
    btn.disabled = false; btn.textContent = 'Iniciar sesión';
  });

  // Registro
  document.getElementById('btnRegister').addEventListener('click', async () => {
    const nombre    = document.getElementById('regNombre').value.trim();
    const colegiado = document.getElementById('regColegiado').value.trim();
    const clinica   = document.getElementById('regClinica').value.trim();
    const email     = document.getElementById('regEmail').value.trim();
    const pass      = document.getElementById('regPassword').value;

    if (!nombre || !email || !pass) { showAuthNotice('Completa los campos obligatorios', 'error'); return; }

    const btn = document.getElementById('btnRegister');
    btn.disabled = true; btn.textContent = 'Creando cuenta...';

    const { data, error } = await sb.auth.signUp({
      email, password: pass,
      options: { data: { nombre_completo: nombre, num_colegiado: colegiado, clinica } }
    });

    if (error) {
      showAuthNotice('❌ ' + error.message, 'error');
    } else if (!data.session) {
      showAuthNotice(`✅ Cuenta creada. Revisa tu email <b>${email}</b> para confirmar.`, 'success');
      document.getElementById('registerView').classList.add('hidden');
      document.getElementById('loginView').classList.remove('hidden');
      document.getElementById('loginEmail').value = email;
    }

    btn.disabled = false; btn.textContent = 'Crear cuenta';
  });

  // Logout
  document.getElementById('btnLogout').addEventListener('click', async () => {
    await sb.auth.signOut();
  });
}

function showAuthNotice(msg, type = 'error') {
  const el = document.getElementById('authNotice');
  el.innerHTML = msg;
  el.className = 'auth-notice ' + type;
  el.classList.remove('hidden');
}

function clearAuthNotice() {
  document.getElementById('authNotice').classList.add('hidden');
}

// ============================================================
// NAVEGACIÓN
// ============================================================
function bindNav() {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;

      // Reset completo si es nueva consulta
      if (view === 'nueva-consulta') {
        resetConsulta();
      }

      navigateTo(view);
      btn.closest('.sidebar-nav').querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('sidebar').classList.remove('open');
    });
  });

  document.getElementById('menuToggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });
}

function resetConsulta() {
  // Reset formulario
  const form = document.getElementById('consultaForm');
  if (form) form.reset();

  // Reset estado global
  consultaGuardada = null;
  lastCalcs = {};
  medCount  = 0;

  // Limpiar medicaciones
  document.getElementById('medicacionesContainer').innerHTML = '';

  // Ocultar informe generado
  document.getElementById('documentoGenerado')?.classList.add('hidden');
  document.getElementById('reporteMedicacion')?.classList.add('hidden');
  document.getElementById('step6Actions')?.classList.remove('hidden');

  // Volver al paso 1
  nextStep(1);
}

function navigateTo(viewName) {
  document.querySelectorAll('.view').forEach(v => {
    v.classList.remove('active');
    v.classList.add('hidden');
  });
  const target = document.getElementById('view-' + viewName);
  if (target) {
    target.classList.remove('hidden');
    target.classList.add('active');
  }

  const titles = {
    'nueva-consulta': 'Nueva Consulta',
    'pacientes': 'Pacientes',
    'historial': 'Historial de Consultas',
    'propietarios': 'Propietarios'
  };
  document.getElementById('topBarTitle').textContent = titles[viewName] || viewName;

  if (viewName === 'pacientes') cargarPacientes();
  if (viewName === 'historial') cargarHistorial();
  if (viewName === 'propietarios') cargarPropietarios();
}

// ============================================================
// CARGA DE DATOS INICIAL
// ============================================================
async function cargarDatos() {
  await cargarRazas();
  await cargarPropietariosSelect();
  await cargarPacientesSelect();
}

async function cargarPacientesSelect() {
  if (!currentUser) return;
  const { data } = await sb.from('pacientes')
    .select('id, nombre, raza, especie')
    .eq('veterinario_id', currentUser.id)
    .order('nombre');
  const sel = document.getElementById('pacienteExistenteId');
  if (!sel) return;
  sel.innerHTML = '<option value="">— Nueva consulta para paciente existente —</option>';
  if (data) {
    data.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `${p.nombre} (${p.raza || p.especie || '—'})`;
      sel.appendChild(opt);
    });
  }
}

async function mostrarHistorialPaciente(pacienteId, nombrePaciente) {
  const { data } = await sb.from('consultas')
    .select('id, fecha_consulta, motivo_consulta, clasificacion_isachc, soplo, impresion_diagnostica')
    .eq('paciente_id', pacienteId)
    .order('fecha_consulta', { ascending: false });

  const container = document.getElementById('historialPacienteContainer');
  const titulo    = document.getElementById('historialPacienteTitulo');
  if (!container) return;

  if (!data || data.length === 0) {
    container.classList.add('hidden');
    return;
  }

  titulo.textContent = `Historial de ${nombrePaciente} (${data.length} consulta${data.length > 1 ? 's' : ''})`;
  container.innerHTML = `
    <table class="data-table" style="font-size:0.82rem; margin-top:0.5rem;">
      <thead><tr><th>Fecha</th><th>Motivo</th><th>ISACHC</th><th>Soplo</th><th>Impresión</th></tr></thead>
      <tbody>
        ${data.map(c => `<tr>
          <td>${new Date(c.fecha_consulta).toLocaleDateString()}</td>
          <td>${c.motivo_consulta || '—'}</td>
          <td>${c.clasificacion_isachc || '—'}</td>
          <td>${c.soplo > 0 ? `${c.soplo}/VI` : 'No'}</td>
          <td style="max-width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${c.impresion_diagnostica || '—'}</td>
        </tr>`).join('')}
      </tbody>
    </table>`;
  container.classList.remove('hidden');
  document.getElementById('historialPacienteWrapper').classList.remove('hidden');
}

async function cargarRazas() {
  const { data } = await sb.from('razas_predisposicion').select('*').order('nombre_raza');
  if (data) {
    const list = document.getElementById('razaList');
    list.innerHTML = '';
    data.forEach(r => {
      window.dbRazas[r.nombre_raza] = r;
      const opt = document.createElement('option');
      opt.value = r.nombre_raza;
      list.appendChild(opt);
    });
  }
}

async function cargarPropietariosSelect() {
  if (!currentUser) return;
  const { data } = await sb.from('propietarios')
    .select('id, nombre, apellidos')
    .eq('veterinario_id', currentUser.id)
    .order('nombre');
  const sel = document.getElementById('propietarioId');
  sel.innerHTML = '<option value="">— Seleccionar existente —</option>';
  if (data) {
    data.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `${p.nombre} ${p.apellidos || ''}`.trim();
      sel.appendChild(opt);
    });
  }
}

// ============================================================
// WIZARD DE PASOS
// ============================================================
window.nextStep = function(step) {
  document.querySelectorAll('.step-panel').forEach(p => {
    p.classList.remove('active');
    p.classList.add('hidden');
  });
  const panel = document.getElementById('panel-' + step);
  if (panel) {
    panel.classList.remove('hidden');
    panel.classList.add('active');
  }

  document.querySelectorAll('.step').forEach(s => {
    const n = parseInt(s.dataset.step);
    s.classList.remove('active', 'done');
    if (n < step) s.classList.add('done');
    if (n === step) s.classList.add('active');
  });

  if (step === 5) {
    const calcs = calcularIndices();
    lastCalcs = calcs;
    actualizarUIIndices(calcs);
    actualizarFlags(calcs, getHallazgos());
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// ============================================================
// FORM BINDING
// ============================================================
function bindForm() {

  // Selector de paciente existente — carga datos automáticamente
  document.getElementById('pacienteExistenteId')?.addEventListener('change', async (e) => {
    const id = e.target.value;
    if (!id) return;
    const { data: pac } = await sb.from('pacientes')
      .select('*, propietarios(*)')
      .eq('id', id).single();
    if (!pac) return;

    // Rellenar campos del paciente
    document.getElementById('numHistoria').value    = pac.num_historia || '';
    document.getElementById('nombrePaciente').value = pac.nombre || '';
    document.getElementById('especie').value        = pac.especie || 'Canino';
    document.getElementById('raza').value           = pac.raza || '';
    document.getElementById('peso').value           = pac.peso || '';
    document.getElementById('edad').value           = pac.edad_anios || '';
    document.getElementById('sexo').value           = pac.sexo || '';
    document.getElementById('microchip').value      = pac.microchip || '';
    document.getElementById('alergias').value       = pac.alergias || '';

    // Seleccionar propietario vinculado
    if (pac.propietario_id) {
      document.getElementById('propietarioId').value = pac.propietario_id;
    }

    // Mostrar historial del paciente
    mostrarHistorialPaciente(pac.id, pac.nombre);

    // Guardar ID para vinculación
    document.getElementById('pacienteExistenteId').dataset.pacienteId = pac.id;
  });

  // Nuevo propietario toggle
  document.getElementById('btnNuevoPropietario').addEventListener('click', () => {
    const form = document.getElementById('nuevoPropietarioForm');
    form.classList.toggle('hidden');
  });

  // Recalcular
  document.getElementById('btnCalcular').addEventListener('click', () => {
    const calcs = calcularIndices();
    lastCalcs = calcs;
    actualizarUIIndices(calcs);
    actualizarFlags(calcs, getHallazgos());
  });

  // Recalcular al cambiar medidas
  ['LVIDd','LVIDs','IVSd','IVSs','LVPWd','LVPWs','LA','Ao','EPSS',
   'VmaxAo','VmaxPul','EMitral','AMitral','VmaxRT','EPrime','IVCT','IVRT','ET',
   'peso'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => {
      if (Object.keys(lastCalcs).length > 0) {
        const calcs = calcularIndices();
        lastCalcs = calcs;
        actualizarUIIndices(calcs);
      }
    });
  });
}

function getHallazgos() {
  return {
    engrosamiento_mitral: document.getElementById('engrosamientoMitral')?.value,
    prolapso_mitral: document.getElementById('prolapsoMitral')?.checked,
    derrame_pericardico: document.getElementById('derrameP')?.value,
    aplanamiento_septal: document.getElementById('aplanamientoSeptal')?.checked,
    jet_rm: document.getElementById('jetRM')?.value,
    jet_tricuspide: document.getElementById('jetTricuspide')?.value,
    hipertrofia: document.getElementById('hipertrofia')?.value,
  };
}

function recogerEstado() {
  const gn = (id) => { const v = document.getElementById(id)?.value; return (v !== '' && !isNaN(v) && v !== null) ? parseFloat(v) : null; };
  const gs = (id) => document.getElementById(id)?.value || null;
  const gc = (id) => document.getElementById(id)?.checked || false;

  return {
    paciente: {
      num_historia: gs('numHistoria'),
      nombre: gs('nombrePaciente'),
      especie: gs('especie'),
      raza: gs('raza'),
      peso: gn('peso'),
      fecha_nacimiento: gs('fechaNacimiento'),
      edad: gn('edad'),
      sexo: gs('sexo'),
      microchip: gs('microchip'),
      propietario_id: gs('propietarioId'),
      alergias: gs('alergias'),
    },
    exploracion: {
      motivo: gs('motivoConsulta'),
      sintomas: gs('sintomas'),
      soplo: gs('soplo'),
      localizacion_soplo: gs('localizacionSoplo'),
      fc: gn('frecuenciaCardiaca'),
      ritmo: gs('ritmo'),
      fr: gn('frecuenciaRespiratoria'),
      mucosas: gs('mucosas'),
      pulso_femoral: gs('pulsofemoral'),
      sincope: gc('sincope'),
      tos: gc('tos'),
      intolerancia_ejercicio: gc('intoleranciaEjercicio'),
      disnea: gc('disnea'),
      pa: gs('presionArterial'),
      spo2: gn('spo2'),
      isachc: gs('isachc'),
      antecedentes: gs('antecedentes'),
      medicacion_actual: gs('medicacionActual'),
    },
    medidas_modo_m: {
      lvidd: gn('LVIDd'), lvids: gn('LVIDs'),
      ivsd: gn('IVSd'), ivss: gn('IVSs'),
      lvpwd: gn('LVPWd'), lvpws: gn('LVPWs'),
      la: gn('LA'), ao: gn('Ao'), epss: gn('EPSS'), rvidd: gn('RVIDd'),
    },
    doppler: {
      vmax_ao: gn('VmaxAo'), vmax_pul: gn('VmaxPul'),
      e_mitral: gn('EMitral'), a_mitral: gn('AMitral'),
      vmax_rt: gn('VmaxRT'), e_prime: gn('EPrime'),
      ivct: gn('IVCT'), ivrt: gn('IVRT'), et: gn('ET'),
    },
    hallazgos: getHallazgos(),
    conclusion: {
      impresion: gs('impresionDiagnostica'),
      grado_sospecha: gs('gradoSospecha'),
      diag_diferencial: gs('diagDiferencial'),
      pruebas: gs('pruebasComplementarias'),
      tratamiento: gs('tratamientoIndicado'),
      fecha_revision: gs('fechaRevision'),
      observaciones_finales: gs('observacionesFinales'),
    },
    medicaciones: recogerMedicaciones(),
  };
}

// ============================================================
// MEDICACIONES
// ============================================================
function bindMedications() {
  document.getElementById('btnAddMed').addEventListener('click', () => addMedRow());
}

function addMedRow(data = {}) {
  medCount++;
  const id = medCount;
  const row = document.createElement('div');
  row.className = 'med-row';
  row.id = 'med-' + id;
  row.innerHTML = `
    <div class="field-group">
      <label>Medicamento</label>
      <input type="text" id="med-nombre-${id}" value="${data.medicamento || ''}" placeholder="Pimobendan">
    </div>
    <div class="field-group">
      <label>Principio activo</label>
      <input type="text" id="med-principio-${id}" value="${data.principio_activo || ''}" placeholder="Pimobendan">
    </div>
    <div class="field-group">
      <label>Dosis</label>
      <input type="number" id="med-dosis-${id}" value="${data.dosis || ''}" step="0.001" placeholder="0.25">
    </div>
    <div class="field-group">
      <label>Unidad</label>
      <input type="text" id="med-unidad-${id}" value="${data.unidad || 'mg/kg'}" placeholder="mg/kg">
    </div>
    <div class="field-group">
      <label>Frecuencia</label>
      <input type="text" id="med-freq-${id}" value="${data.frecuencia || ''}" placeholder="BID">
    </div>
    <div class="field-group">
      <label>Vía</label>
      <input type="text" id="med-via-${id}" value="${data.via_administracion || 'Oral'}" placeholder="Oral">
    </div>
    <div class="field-group">
      <label>Duración</label>
      <input type="text" id="med-dur-${id}" value="${data.duracion || ''}" placeholder="Indefinido">
    </div>
    <button type="button" class="btn-remove-med" onclick="removeMed(${id})">✕</button>
  `;
  document.getElementById('medicacionesContainer').appendChild(row);
}

window.removeMed = function(id) {
  document.getElementById('med-' + id)?.remove();
};

function recogerMedicaciones() {
  const meds = [];
  document.querySelectorAll('[id^="med-nombre-"]').forEach(el => {
    const id = el.id.replace('med-nombre-', '');
    const nombre = el.value.trim();
    if (nombre) {
      meds.push({
        medicamento: nombre,
        principio_activo: document.getElementById('med-principio-' + id)?.value || '',
        dosis: parseFloat(document.getElementById('med-dosis-' + id)?.value) || null,
        unidad: document.getElementById('med-unidad-' + id)?.value || '',
        frecuencia: document.getElementById('med-freq-' + id)?.value || '',
        via_administracion: document.getElementById('med-via-' + id)?.value || '',
        duracion: document.getElementById('med-dur-' + id)?.value || '',
      });
    }
  });
  return meds;
}

// ============================================================
// GUARDAR CONSULTA
// ============================================================
window.guardarYContinuar = async function() {
  const estado = recogerEstado();
  if (!estado.paciente.nombre) { alert('El nombre del paciente es obligatorio.'); return; }
  if (!estado.paciente.peso)   { alert('El peso del paciente es obligatorio.'); return; }

  const btn = document.getElementById('btnGuardarContinuar');
  btn.disabled = true; btn.textContent = 'Guardando...';

  try {
    // 1. Guardar propietario nuevo si se rellenó
    let propietarioId = estado.paciente.propietario_id || null;
    const propNombre = document.getElementById('propNombre')?.value.trim();
    if (propNombre) {
      const { data: np } = await sb.from('propietarios').insert({
        veterinario_id: currentUser.id,
        nombre: propNombre,
        apellidos: document.getElementById('propApellidos')?.value || '',
        telefono: document.getElementById('propTelefono')?.value || '',
        email: document.getElementById('propEmail')?.value || '',
        direccion: document.getElementById('propDireccion')?.value || '',
      }).select().single();
      if (np) propietarioId = np.id;
    }

    // 2. Guardar o actualizar paciente
    const pacienteData = {
      veterinario_id: currentUser.id,
      propietario_id: propietarioId,
      num_historia: estado.paciente.num_historia,
      nombre: estado.paciente.nombre,
      especie: estado.paciente.especie,
      raza: estado.paciente.raza,
      fecha_nacimiento: estado.paciente.fecha_nacimiento || null,
      edad_anios: estado.paciente.edad,
      sexo: estado.paciente.sexo,
      peso: estado.paciente.peso,
      microchip: estado.paciente.microchip,
      alergias: estado.paciente.alergias,
    };
    const { data: paciente } = await sb.from('pacientes').insert(pacienteData).select().single();

    // 3. Guardar consulta
    const consultaData = {
      veterinario_id: currentUser.id,
      paciente_id: paciente?.id,
      fecha_consulta: new Date().toISOString().split('T')[0],
      // Exploración
      motivo_consulta: estado.exploracion.motivo,
      sintomas: estado.exploracion.sintomas,
      soplo: parseInt(estado.exploracion.soplo || 0),
      localizacion_soplo: estado.exploracion.localizacion_soplo,
      frecuencia_cardiaca: estado.exploracion.fc,
      ritmo: estado.exploracion.ritmo,
      frecuencia_respiratoria: estado.exploracion.fr,
      mucosas: estado.exploracion.mucosas,
      pulso_femoral: estado.exploracion.pulso_femoral,
      sincope: estado.exploracion.sincope,
      tos: estado.exploracion.tos,
      intolerancia_ejercicio: estado.exploracion.intolerancia_ejercicio,
      disnea: estado.exploracion.disnea,
      presion_arterial: estado.exploracion.pa,
      spo2: estado.exploracion.spo2,
      clasificacion_isachc: estado.exploracion.isachc,
      antecedentes: estado.exploracion.antecedentes,
      medicacion_actual: estado.exploracion.medicacion_actual,
      // Medidas
      lvidd: estado.medidas_modo_m.lvidd, lvids: estado.medidas_modo_m.lvids,
      ivsd: estado.medidas_modo_m.ivsd, ivss: estado.medidas_modo_m.ivss,
      lvpwd: estado.medidas_modo_m.lvpwd, lvpws: estado.medidas_modo_m.lvpws,
      la: estado.medidas_modo_m.la, ao: estado.medidas_modo_m.ao,
      epss: estado.medidas_modo_m.epss, rvidd: estado.medidas_modo_m.rvidd,
      // Doppler
      vmax_ao: estado.doppler.vmax_ao, vmax_pul: estado.doppler.vmax_pul,
      e_mitral: estado.doppler.e_mitral, a_mitral: estado.doppler.a_mitral,
      vmax_rt: estado.doppler.vmax_rt, e_prime: estado.doppler.e_prime,
      ivct: estado.doppler.ivct, ivrt: estado.doppler.ivrt, et: estado.doppler.et,
      // Hallazgos
      engrosamiento_mitral: estado.hallazgos.engrosamiento_mitral,
      prolapso_mitral: estado.hallazgos.prolapso_mitral,
      derrame_pericardico: estado.hallazgos.derrame_pericardico,
      aplanamiento_septal: estado.hallazgos.aplanamiento_septal,
      jet_rm: estado.hallazgos.jet_rm,
      jet_tricuspide: estado.hallazgos.jet_tricuspide,
      hipertrofia: estado.hallazgos.hipertrofia,
      otras_observaciones: document.getElementById('observacionesConcr')?.value,
      comentario_interpretativo: document.getElementById('comentarioInterpretativo')?.value,
      // Conclusión
      impresion_diagnostica: estado.conclusion.impresion,
      grado_sospecha: estado.conclusion.grado_sospecha,
      diagnostico_diferencial: estado.conclusion.diag_diferencial,
      pruebas_complementarias: estado.conclusion.pruebas,
      tratamiento_indicado: estado.conclusion.tratamiento,
      fecha_revision: estado.conclusion.fecha_revision || null,
      observaciones_finales: estado.conclusion.observaciones_finales,
    };

    const { data: consulta } = await sb.from('consultas').insert(consultaData).select().single();
    consultaGuardada = { ...consulta, paciente, estado };

    // 4. Guardar medicaciones
    if (estado.medicaciones.length > 0 && consulta) {
      const medsData = estado.medicaciones.map(m => ({
        ...m,
        consulta_id: consulta.id,
        veterinario_id: currentUser.id,
      }));
      await sb.from('medicaciones').insert(medsData);
    }

    nextStep(6);
  } catch (err) {
    console.error('Error guardando:', err);
    alert('Error al guardar la consulta. Revisa la consola.');
  } finally {
    btn.disabled = false; btn.textContent = 'Guardar y generar informe →';
  }
};

// ============================================================
// INFORME
// ============================================================
function bindReport() {
  document.getElementById('btnGenerarDoc').addEventListener('click', () => generarDocumento(true));
  document.getElementById('btnGenerarSinIA').addEventListener('click', () => generarDocumento(false));
  document.getElementById('btnImprimir').addEventListener('click', () => window.print());
  document.getElementById('btnVolver').addEventListener('click', () => {
    document.getElementById('documentoGenerado').classList.add('hidden');
    document.getElementById('step6Actions').classList.remove('hidden');
  });
}

async function generarDocumento(conIA) {
  if (!consultaGuardada) {
    alert('Primero guarda la consulta (paso 5).');
    return;
  }

  const tipo  = document.getElementById('tipoDocumento').value;
  const lang  = document.getElementById('langImpresion').value;
  const btn   = document.getElementById('btnGenerarDoc');
  btn.disabled = true;
  btn.textContent = conIA ? t('generando') : 'Generando...';

  const calcs  = calcularIndices();
  const estado = consultaGuardada.estado;

  // Forzar idioma correcto en motor de diagnóstico
  const diag = motorDiagnostico(estado, calcs);

  // Texto libre del veterinario — si hay IA, se traduce; si no, se usa tal cual
  let textoIA_informe   = null;
  let textoIA_medicacion = null;

  if (conIA) {
    try {
      if (tipo === 'propietario' || tipo === 'ambos') {
        textoIA_informe = await llamarIA(estado, calcs, diag, lang, 'propietario');
      }
      if (tipo === 'medicacion' || tipo === 'ambos') {
        textoIA_medicacion = await llamarIA(estado, calcs, diag, lang, 'medicacion');
      }
    } catch (e) {
      console.error('IA error:', e);
      showToast(t('error_ia'), 'warning');
    }
  }

  // Renderizar informe principal
  const htmlInforme = renderizarInforme(estado, calcs, diag, textoIA_informe, lang, tipo === 'ambos' ? 'propietario' : tipo);
  document.getElementById('reporteContenido').innerHTML = htmlInforme;

  // Renderizar medicación separada si tipo = ambos
  const reporteMed = document.getElementById('reporteMedicacion');
  if (tipo === 'ambos' && estado.medicaciones?.length > 0) {
    const htmlMed = renderizarInforme(estado, calcs, diag, textoIA_medicacion, lang, 'medicacion');
    reporteMed.innerHTML = htmlMed;
    reporteMed.classList.remove('hidden');
  } else if (tipo === 'medicacion') {
    const htmlMed = renderizarInforme(estado, calcs, diag, textoIA_medicacion, lang, 'medicacion');
    document.getElementById('reporteContenido').innerHTML = htmlMed;
    reporteMed.classList.add('hidden');
  } else {
    reporteMed.classList.add('hidden');
  }

  document.getElementById('documentoGenerado').classList.remove('hidden');
  document.getElementById('step6Actions').classList.add('hidden');

  // Guardar informe en BD
  if (consultaGuardada?.id) {
    await sb.from('informes').insert({
      consulta_id: consultaGuardada.id,
      veterinario_id: currentUser.id,
      paciente_id: consultaGuardada.paciente?.id,
      tipo, idioma: lang,
      contenido_html: htmlInforme,
    });
  }

  btn.disabled = false;
  btn.textContent = '🤖 Generar con IA';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function llamarIA(estado, calcs, diag, idioma, tipo) {
  const { data: { session } } = await sb.auth.getSession();
  const response = await fetch(`${SUPABASE_URL}/functions/v1/analizar`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      datos_consulta: {
        paciente: estado.paciente,
        exploracion: estado.exploracion,
        medidas_modo_m: estado.medidas_modo_m,
        doppler: estado.doppler,
        hallazgos: estado.hallazgos,
        conclusion: estado.conclusion,
        calculos: calcs,
        medicaciones: estado.medicaciones,
      },
      idioma,
      tipo_documento: tipo,
    })
  });

  if (!response.ok) throw new Error('Edge Function error');
  const data = await response.json();
  return data.resultado || null;
}

function renderizarInforme(estado, calcs, diag, textoIA, lang, tipo) {
  const p   = estado.paciente;
  const exp = estado.exploracion;
  const con = estado.conclusion;
  const med = estado.medicaciones || [];
  const vet = currentVet || {};
  const fecha = document.getElementById('fechaDocumento')?.value || new Date().toISOString().split('T')[0];

  const lv = (v, suf = '') => (v !== null && v !== undefined && v !== '') ? `${v}${suf}` : '—';
  const sexoLabel = { M: 'Macho', MC: 'Macho castrado', H: 'Hembra', HC: 'Hembra esterilizada' };

  let html = `
    <div class="report-header-block">
      <div>
        <div class="report-clinic-name">${lv(vet.clinica, '')}</div>
        <div style="font-size:0.85rem; color:var(--text-muted); margin-top:4px;">
          ${vet.direccion_clinica ? vet.direccion_clinica + ' · ' : ''}
          ${vet.telefono_clinica || ''} ${vet.email_clinica ? '· ' + vet.email_clinica : ''}
        </div>
      </div>
      <div style="text-align:right;">
        <div style="font-weight:600;">${lv(vet.nombre_completo)}</div>
        ${vet.num_colegiado ? `<div style="font-size:0.8rem;color:var(--text-muted);">${t('lbl_colegiado')}: ${vet.num_colegiado}</div>` : ''}
        <div style="font-size:0.8rem;color:var(--text-muted);">${t('lbl_fecha')}: ${fecha}</div>
      </div>
    </div>

    <h2 style="font-family:'Instrument Serif',Georgia,serif; color:var(--primary); font-size:1.3rem; margin-bottom:1.5rem;">
      ${tipo === 'medicacion' ? t('titulo_medicacion') : t('titulo_informe')}
    </h2>

    <div class="report-section">
      <div class="report-section-title">${t('sec_paciente')}</div>
      <div class="report-grid">
        <div class="report-row"><span class="report-label">${t('lbl_nombre')}:</span><span class="report-value">${lv(p.nombre)}</span></div>
        <div class="report-row"><span class="report-label">${t('lbl_especie')}:</span><span class="report-value">${lv(p.especie)}</span></div>
        <div class="report-row"><span class="report-label">${t('lbl_raza')}:</span><span class="report-value">${lv(p.raza)}</span></div>
        <div class="report-row"><span class="report-label">${t('lbl_edad')}:</span><span class="report-value">${lv(p.edad, ' ' + t('lbl_anios'))}</span></div>
        <div class="report-row"><span class="report-label">${t('lbl_sexo')}:</span><span class="report-value">${sexoLabel[p.sexo] || lv(p.sexo)}</span></div>
        <div class="report-row"><span class="report-label">${t('lbl_peso')}:</span><span class="report-value">${lv(p.peso, ' kg')}</span></div>
        ${p.microchip ? `<div class="report-row"><span class="report-label">${t('lbl_microchip')}:</span><span class="report-value">${p.microchip}</span></div>` : ''}
      </div>
    </div>`;

  // Sección exploración (solo en informe propietario y ambos)
  if (tipo !== 'medicacion') {
    html += `
    <div class="report-section">
      <div class="report-section-title">${t('sec_consulta')}</div>
      <div class="report-grid">
        <div class="report-row"><span class="report-label">${t('lbl_motivo')}:</span><span class="report-value">${lv(exp.motivo)}</span></div>
        ${exp.soplo > 0 ? `<div class="report-row"><span class="report-label">${t('lbl_soplo')}:</span><span class="report-value">${t('lbl_grado')} ${exp.soplo}/VI</span></div>` : ''}
        ${exp.fc ? `<div class="report-row"><span class="report-label">${t('lbl_fc')}:</span><span class="report-value">${exp.fc} lpm</span></div>` : ''}
        ${exp.isachc ? `<div class="report-row"><span class="report-label">${t('lbl_isachc')}:</span><span class="report-value">${exp.isachc}</span></div>` : ''}
      </div>
    </div>

    <div class="report-section">
      <div class="report-section-title">${t('sec_indices')}</div>
      <table class="data-table" style="font-size:0.85rem;">
        <thead><tr><th>${t('tbl_param') || 'Parámetro'}</th><th>${t('tbl_val') || 'Valor'}</th><th>${t('tbl_ref') || 'Referencia'}</th><th>${t('tbl_val_inter') || 'Valoración'}</th></tr></thead>
        <tbody>
          ${calcs.la_ao != null ? `<tr><td>LA/Ao</td><td>${calcs.la_ao}</td><td>&lt; ${diag.especie === 'felino' ? '1.5' : '1.6'}</td><td class="${calcs.la_ao >= (diag.especie === 'felino' ? 1.5 : 1.6) ? 'val-danger' : 'val-ok'}">${calcs.la_ao >= (diag.especie === 'felino' ? 1.5 : 1.6) ? '↑ ' + (t('txt_dilat_auric') || 'Aumentado') : '✓ ' + (t('txt_normal') || 'Normal')}</td></tr>` : ''}
          ${calcs.fs != null ? `<tr><td>FS%</td><td>${calcs.fs}%</td><td>${diag.especie === 'felino' ? '35–65%' : '25–45%'}</td><td class="${calcs.fs < (diag.especie === 'felino' ? 35 : 25) ? 'val-danger' : 'val-ok'}">${calcs.fs < (diag.especie === 'felino' ? 35 : 25) ? '↓ ' + (t('txt_reducida') || 'Reducida') : '✓ ' + (t('txt_normal') || 'Normal')}</td></tr>` : ''}
          ${calcs.e_a != null ? `<tr><td>E/A</td><td>${calcs.e_a}</td><td>&gt; 1</td><td class="${calcs.e_a < 1 ? 'val-warn' : 'val-ok'}">${calcs.e_a < 1 ? '⚠ ' + (t('txt_precaucion') || 'Precaución') : '✓ ' + (t('txt_normal') || 'Normal')}</td></tr>` : ''}
          ${calcs.e_eprime != null ? `<tr><td>E/e'</td><td>${calcs.e_eprime}</td><td>&lt; ${diag.especie === 'felino' ? '12' : '15'}</td><td class="${calcs.e_eprime > (diag.especie === 'felino' ? 12 : 15) ? 'val-danger' : 'val-ok'}">${calcs.e_eprime > (diag.especie === 'felino' ? 12 : 15) ? '↑ ' + (t('txt_elevado') || 'Elevado') : '✓ ' + (t('txt_normal') || 'Normal')}</td></tr>` : ''}
          ${calcs.tei != null ? `<tr><td>${t('p_tei') || 'Índice Tei'}</td><td>${calcs.tei}</td><td>&lt; ${diag.especie === 'felino' ? '0.45' : '0.50'}</td><td class="${calcs.tei > (diag.especie === 'felino' ? 0.45 : 0.50) ? 'val-warn' : 'val-ok'}">${calcs.tei > (diag.especie === 'felino' ? 0.45 : 0.50) ? '⚠ ' + (t('txt_elevado') || 'Elevado') : '✓ ' + (t('txt_normal') || 'Normal')}</td></tr>` : ''}
          ${calcs.lvidd_ref ? `<tr><td>${diag.especie === 'felino' ? 'LVIDd' : 'LVIDd Cornell'}</td><td>${calcs.lvidd_ref.label}</td><td>${diag.especie === 'felino' ? '12–18 mm' : t('txt_alometrico') || 'Alométrico'}</td><td class="${calcs.lvidd_ref.dilatado ? 'val-danger' : 'val-ok'}">${calcs.lvidd_ref.dilatado ? '↑ ' + (t('txt_dilatacion') || 'Dilatado') : '✓ ' + (t('txt_normal') || 'Normal')}</td></tr>` : ''}
          ${calcs.paps != null ? `<tr><td>PAPs</td><td>${calcs.paps} mmHg</td><td>&lt; 30 mmHg</td><td class="${calcs.paps > 30 ? 'val-danger' : 'val-ok'}">${calcs.paps > 30 ? '↑ ' + (t('txt_elevado') || 'Elevada') : '✓ ' + (t('txt_normal') || 'Normal')}</td></tr>` : ''}
          ${calcs.grad_ao != null ? `<tr><td>${t('p_gradao') || 'Grad. Ao'}</td><td>${calcs.grad_ao} mmHg</td><td>&lt; 20 mmHg</td><td class="${calcs.grad_ao > 50 ? 'val-danger' : 'val-ok'}">${calcs.grad_ao > 50 ? '↑ ' + (t('txt_estenosis') || 'Estenosis') : '✓ ' + (t('txt_normal') || 'Normal')}</td></tr>` : ''}
        </tbody>
      </table>
    </div>

    <div class="report-section">
      <div class="report-section-title">${t('sec_diagnostico')}</div>
      <div class="report-diag-box report-editable" contenteditable="true">
        ${con.impresion ? `<p><strong>${con.impresion}</strong></p>` : ''}
        <ul style="padding-left:1.5rem; margin-top:0.5rem;">
          ${diag.diagnosticos.map(d => `<li>${d}</li>`).join('')}
        </ul>
        ${con.grado_sospecha ? `<p style="margin-top:0.5rem; font-size:0.85rem; color:var(--text-muted);">${t('lbl_grado_sospecha') || 'Grado de sospecha'}: <strong>${con.grado_sospecha}</strong></p>` : ''}
        ${con.diag_diferencial ? `<p style="margin-top:0.5rem; font-size:0.85rem;">${t('lbl_diag_dif') || 'Diagnóstico diferencial'}: ${con.diag_diferencial}</p>` : ''}
      </div>
    </div>

    ${con.pruebas || con.tratamiento ? `
    <div class="report-section">
      <div class="report-section-title">${t('sec_plan') || 'PLAN'}</div>
      <div contenteditable="true" class="report-editable" style="padding:0.5rem 0;">
        ${con.pruebas ? `<p><strong>${t('lbl_pruebas') || 'Pruebas complementarias'}:</strong> ${con.pruebas}</p>` : ''}
        ${con.tratamiento ? `<p style="margin-top:0.5rem;"><strong>${t('lbl_tratamiento') || 'Tratamiento'}:</strong> ${con.tratamiento}</p>` : ''}
      </div>
    </div>` : ''}

    <div class="report-section">
      <div class="report-section-title">${t('sec_recomendaciones')} <span class="no-print" style="font-size:0.7rem; color:var(--primary); font-weight:400;">${t('editable_hint')}</span></div>
      <div contenteditable="true" class="report-editable" style="padding:0.5rem 0;">
        ${textoIA ? `<div>${textoIA}</div>` : `<ul style="padding-left:1.5rem;">${diag.recomendaciones.map(r => `<li>${r}</li>`).join('')}</ul>`}
      </div>
    </div>

    ${con.fecha_revision ? `
    <div class="report-section">
      <div class="report-section-title">${t('sec_seguimiento')}</div>
      <p>${t('lbl_revision')}: <strong>${con.fecha_revision}</strong></p>
    </div>` : ''}

    ${con.observaciones_finales ? `
    <div class="report-section">
      <div class="report-section-title">${t('sec_observaciones')}</div>
      <div contenteditable="true" class="report-editable">${con.observaciones_finales}</div>
    </div>` : ''}`;
  }

  // Sección medicación
  if (tipo === 'medicacion' || tipo === 'ambos') {
    html += `
    <div class="report-section" style="${tipo === 'ambos' ? 'margin-top:2rem; padding-top:2rem; border-top:1px solid var(--border);' : ''}">
      <div class="report-section-title">${t('sec_medicacion')}</div>
      ${med.length > 0 ? `
      <table class="data-table" style="font-size:0.82rem;">
        <thead><tr>
          <th>${t('lbl_medicamento')}</th>
          <th>${t('lbl_dosis')}</th>
          <th>${t('lbl_frecuencia')}</th>
          <th>${t('lbl_via')}</th>
          <th>${t('lbl_duracion')}</th>
        </tr></thead>
        <tbody>
          ${med.map(m => `<tr>
            <td><strong>${m.medicamento}</strong>${m.principio_activo ? `<br><small style="color:var(--text-muted)">${m.principio_activo}</small>` : ''}</td>
            <td>${m.dosis ? m.dosis + ' ' + (m.unidad || '') : '—'}</td>
            <td>${m.frecuencia || '—'}</td>
            <td>${m.via_administracion || '—'}</td>
            <td>${m.duracion || '—'}</td>
          </tr>`).join('')}
        </tbody>
      </table>` : '<p style="color:var(--text-muted)">Sin medicación prescrita.</p>'}
    </div>

    <div class="report-section">
      <div class="report-section-title">${t('sec_instrucciones')} <span class="no-print" style="font-size:0.7rem; color:var(--primary); font-weight:400;">${t('editable_hint')}</span></div>
      <div contenteditable="true" class="report-editable" style="padding:0.5rem 0; min-height:80px;">
        ${textoIA && tipo === 'medicacion' ? textoIA : '<p style="color:var(--text-muted)"><em>Edite aquí las instrucciones para el propietario...</em></p>'}
      </div>
    </div>`;
  }

  // Firma
  html += `
    <div class="report-section" style="margin-top:3rem;">
      <div class="report-section-title">${t('sec_firma')}</div>
      <div style="display:flex; justify-content:flex-end; margin-top:1rem;">
        <div style="text-align:center; min-width:200px;">
          <div style="border-top:1px solid var(--text); padding-top:0.5rem; margin-top:3rem;">
            <p style="font-weight:600; margin:0;">${lv(vet.nombre_completo)}</p>
            ${vet.num_colegiado ? `<p style="font-size:0.8rem; color:var(--text-muted); margin:0;">${t('lbl_colegiado')}: ${vet.num_colegiado}</p>` : ''}
          </div>
        </div>
      </div>
    </div>

    <div class="report-disclaimer">⚠️ ${t('disclaimer')}</div>`;

  return html;
}

// ============================================================
// VISTAS SECUNDARIAS
// ============================================================
async function cargarPacientes() {
  if (!currentUser) return;
  const { data } = await sb.from('pacientes')
    .select('*, propietarios(nombre, apellidos)')
    .eq('veterinario_id', currentUser.id)
    .order('created_at', { ascending: false });

  const container = document.getElementById('listaPacientes');
  if (!data || data.length === 0) {
    container.innerHTML = '<p class="empty-state">No hay pacientes registrados aún.</p>';
    return;
  }

  container.innerHTML = `
    <table class="data-table">
      <thead><tr><th>Nombre</th><th>Raza</th><th>Especie</th><th>Peso</th><th>Propietario</th><th>Registrado</th></tr></thead>
      <tbody>
        ${data.map(p => `<tr>
          <td><strong>${p.nombre}</strong>${p.microchip ? `<br><small style="color:var(--text-muted)">${p.microchip}</small>` : ''}</td>
          <td>${p.raza || '—'}</td>
          <td>${p.especie || '—'}</td>
          <td>${p.peso ? p.peso + ' kg' : '—'}</td>
          <td>${p.propietarios ? `${p.propietarios.nombre} ${p.propietarios.apellidos || ''}` : '—'}</td>
          <td>${new Date(p.created_at).toLocaleDateString()}</td>
        </tr>`).join('')}
      </tbody>
    </table>`;
}

async function cargarHistorial() {
  if (!currentUser) return;
  const { data } = await sb.from('consultas')
    .select('*, pacientes(nombre, raza)')
    .eq('veterinario_id', currentUser.id)
    .order('created_at', { ascending: false });

  const container = document.getElementById('listaHistorial');
  if (!data || data.length === 0) {
    container.innerHTML = '<p class="empty-state">No hay consultas registradas aún.</p>';
    return;
  }

  container.innerHTML = `
    <table class="data-table">
      <thead><tr><th>Fecha</th><th>Paciente</th><th>Motivo</th><th>ISACHC</th><th>Soplo</th></tr></thead>
      <tbody>
        ${data.map(c => `<tr>
          <td>${new Date(c.fecha_consulta).toLocaleDateString()}</td>
          <td><strong>${c.pacientes?.nombre || '—'}</strong>${c.pacientes?.raza ? `<br><small style="color:var(--text-muted)">${c.pacientes.raza}</small>` : ''}</td>
          <td>${c.motivo_consulta || '—'}</td>
          <td>${c.clasificacion_isachc || '—'}</td>
          <td>${c.soplo > 0 ? `Grado ${c.soplo}/VI` : 'No'}</td>
        </tr>`).join('')}
      </tbody>
    </table>`;
}

async function cargarPropietarios() {
  if (!currentUser) return;
  const { data } = await sb.from('propietarios')
    .select('*')
    .eq('veterinario_id', currentUser.id)
    .order('nombre');

  const container = document.getElementById('listaPropietarios');
  if (!data || data.length === 0) {
    container.innerHTML = '<p class="empty-state">No hay propietarios registrados aún.</p>';
    return;
  }

  container.innerHTML = `
    <table class="data-table">
      <thead><tr><th>Nombre</th><th>Teléfono</th><th>Email</th><th>Registrado</th></tr></thead>
      <tbody>
        ${data.map(p => `<tr>
          <td><strong>${p.nombre} ${p.apellidos || ''}</strong></td>
          <td>${p.telefono || '—'}</td>
          <td>${p.email || '—'}</td>
          <td>${new Date(p.created_at).toLocaleDateString()}</td>
        </tr>`).join('')}
      </tbody>
    </table>`;
}

// ============================================================
// TOAST NOTIFICATION
// ============================================================
function showToast(msg, type = 'info') {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position:fixed; bottom:1.5rem; right:1.5rem; z-index:9999;
    background:${type === 'warning' ? '#fef3c7' : '#f0fdf4'};
    border:1px solid ${type === 'warning' ? '#fcd34d' : '#86efac'};
    color:${type === 'warning' ? '#92400e' : '#166534'};
    padding:0.75rem 1.25rem; border-radius:8px;
    font-size:0.875rem; box-shadow:0 4px 12px rgba(0,0,0,0.1);
    animation: fadeIn 0.3s ease;
  `;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

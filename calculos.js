// calculos.js — Motor de cálculos ecocardiográficos
// Soporte: Canino y Felino con referencias específicas por especie

// ============================================================
// REFERENCIAS POR ESPECIE
// ============================================================
const REFS = {
  canino: {
    fs_min: 25, fs_max: 45,
    la_ao_max: 1.6,
    e_a_min: 1.0,
    e_eprime_max: 15,
    tei_max: 0.50,
    paps_max: 30,
    grad_ao_warn: 20, grad_ao_danger: 50,
    lvidd_formula: (peso) => 1.53 * Math.pow(peso, 0.294),
    lvidd_tolerancia: 1.15,
  },
  felino: {
    fs_min: 35, fs_max: 65,
    la_ao_max: 1.5,
    e_a_min: 1.0,
    e_eprime_max: 12,
    tei_max: 0.45,
    paps_max: 30,
    grad_ao_warn: 20, grad_ao_danger: 50,
    lvidd_min: 12, lvidd_max: 18,
    ivsd_hcm: 6,
    lvpwd_hcm: 6,
  }
};

function getNum(id) {
  const v = document.getElementById(id)?.value;
  return (v !== '' && v !== null && v !== undefined && !isNaN(v)) ? parseFloat(v) : null;
}

function getEspecie() {
  const v = document.getElementById('especie')?.value || 'Canino';
  return v.toLowerCase().includes('felin') ? 'felino' : 'canino';
}

function getRefs() { return REFS[getEspecie()]; }

function calcularIndices() {
  const especie = getEspecie();
  const refs    = getRefs();
  const peso    = getNum('peso');
  const lvidd   = getNum('LVIDd');
  const lvids   = getNum('LVIDs');
  const ivsd    = getNum('IVSd');
  const lvpwd   = getNum('LVPWd');
  const la      = getNum('LA');
  const ao      = getNum('Ao');
  const e       = getNum('EMitral');
  const a       = getNum('AMitral');
  const eprime  = getNum('EPrime');
  const vmaxrt  = getNum('VmaxRT');
  const vmaxao  = getNum('VmaxAo');
  const vmaxpul = getNum('VmaxPul');
  const ivct    = getNum('IVCT');
  const ivrt    = getNum('IVRT');
  const et      = getNum('ET');
  const results = { especie };

  if (la && ao && ao > 0)
    results.la_ao = parseFloat((la / ao).toFixed(2));

  if (lvidd && lvids && lvidd > 0 && lvids < lvidd)
    results.fs = parseFloat((((lvidd - lvids) / lvidd) * 100).toFixed(1));

  if (e && a && a > 0)
    results.e_a = parseFloat((e / a).toFixed(2));

  // E y e' ambos en m/s — división directa
  if (e && eprime && eprime > 0)
    results.e_eprime = parseFloat((e / eprime).toFixed(1));

  if (ivct && ivrt && et && et > 0)
    results.tei = parseFloat(((ivct + ivrt) / et).toFixed(3));

  if (lvidd) {
    if (especie === 'canino' && peso) {
      const esp_cm = refs.lvidd_formula(peso);
      const med_cm = lvidd / 10;
      results.lvidd_ref = {
        tipo: 'cornell', medido: parseFloat(med_cm.toFixed(2)),
        esperado: parseFloat(esp_cm.toFixed(2)),
        ratio: parseFloat((med_cm / esp_cm).toFixed(2)),
        dilatado: med_cm > (esp_cm * refs.lvidd_tolerancia),
        label: `${med_cm.toFixed(2)} / ${esp_cm.toFixed(2)} cm`
      };
    } else if (especie === 'felino') {
      results.lvidd_ref = {
        tipo: 'rango', medido: lvidd,
        min: refs.lvidd_min, max: refs.lvidd_max,
        dilatado: lvidd > refs.lvidd_max,
        reducido: lvidd < refs.lvidd_min,
        label: `${lvidd} mm (ref: ${refs.lvidd_min}–${refs.lvidd_max} mm)`
      };
    }
  }

  if (especie === 'felino' && (ivsd || lvpwd)) {
    results.hcm_screening = {
      ivsd_engrosado:  ivsd  ? ivsd  > refs.ivsd_hcm  : null,
      lvpwd_engrosado: lvpwd ? lvpwd > refs.lvpwd_hcm : null,
      sospecha_hcm: (ivsd && ivsd > refs.ivsd_hcm) || (lvpwd && lvpwd > refs.lvpwd_hcm),
      ivsd_val: ivsd, lvpwd_val: lvpwd,
    };
  }

  if (vmaxrt)  results.paps    = parseFloat((4 * Math.pow(vmaxrt, 2) + 5).toFixed(1));
  if (vmaxao)  results.grad_ao = parseFloat((4 * Math.pow(vmaxao, 2)).toFixed(1));
  if (vmaxpul) results.grad_pul= parseFloat((4 * Math.pow(vmaxpul, 2)).toFixed(1));

  return results;
}

function actualizarUIIndices(calcs) {
  const refs    = getRefs();
  const especie = calcs.especie || 'canino';

  const setIdx = (boxId, valId, value, estado) => {
    const box = document.getElementById(boxId);
    const val = document.getElementById(valId);
    if (!box || !val) return;
    val.textContent = value ?? '—';
    box.className = 'index-box' + (estado ? ' ' + estado : '');
  };

  if (calcs.la_ao != null) {
    setIdx('idx-laao','val-laao', calcs.la_ao, calcs.la_ao > refs.la_ao_max ? 'danger' : 'normal');
    const r = document.querySelector('#idx-laao .idx-ref');
    if (r) r.textContent = `Normal ≤ ${refs.la_ao_max}`;
  } else setIdx('idx-laao','val-laao','—','');

  if (calcs.fs != null) {
    const e = calcs.fs < refs.fs_min ? 'danger' : calcs.fs > refs.fs_max ? 'warning' : 'normal';
    setIdx('idx-fs','val-fs', calcs.fs + '%', e);
    const r = document.querySelector('#idx-fs .idx-ref');
    if (r) r.textContent = `Normal ${refs.fs_min}–${refs.fs_max}%`;
  } else setIdx('idx-fs','val-fs','—','');

  if (calcs.e_a != null)
    setIdx('idx-ea','val-ea', calcs.e_a, calcs.e_a < refs.e_a_min ? 'warning' : 'normal');
  else setIdx('idx-ea','val-ea','—','');

  if (calcs.e_eprime != null) {
    setIdx('idx-eeprime','val-eeprime', calcs.e_eprime, calcs.e_eprime > refs.e_eprime_max ? 'danger' : 'normal');
    const r = document.querySelector('#idx-eeprime .idx-ref');
    if (r) r.textContent = `Normal < ${refs.e_eprime_max}`;
  } else setIdx('idx-eeprime','val-eeprime','—','');

  if (calcs.tei != null) {
    setIdx('idx-tei','val-tei', calcs.tei, calcs.tei > refs.tei_max ? 'warning' : 'normal');
    const r = document.querySelector('#idx-tei .idx-ref');
    if (r) r.textContent = `Normal < ${refs.tei_max}`;
  } else setIdx('idx-tei','val-tei','—','');

  if (calcs.lvidd_ref) {
    const rv = calcs.lvidd_ref;
    const e  = rv.dilatado ? 'danger' : (rv.reducido ? 'warning' : 'normal');
    setIdx('idx-lvidd','val-lvidd', rv.label, e);
    const rn = document.querySelector('#idx-lvidd .idx-name');
    if (rn) rn.textContent = especie === 'felino' ? 'LVIDd' : 'LVIDd Cornell';
    const rr = document.querySelector('#idx-lvidd .idx-ref');
    if (rr) rr.textContent = especie === 'felino' ? 'Ref: 12–18 mm' : 'Alométrico (Cornell)';
  } else setIdx('idx-lvidd','val-lvidd','—','');

  if (calcs.paps != null)
    setIdx('idx-paps','val-paps', calcs.paps + ' mmHg', calcs.paps > refs.paps_max ? 'danger' : 'normal');
  else setIdx('idx-paps','val-paps','—','');

  if (calcs.grad_ao != null) {
    const e = calcs.grad_ao > refs.grad_ao_danger ? 'danger' : calcs.grad_ao > refs.grad_ao_warn ? 'warning' : 'normal';
    setIdx('idx-gradao','val-gradao', calcs.grad_ao + ' mmHg', e);
  } else setIdx('idx-gradao','val-gradao','—','');
}

function actualizarFlags(calcs, hallazgos) {
  const refs    = getRefs();
  const especie = calcs.especie || 'canino';

  const setFlag = (id, activo) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.className = 'flag-item' + (activo ? ' active' : ' ok');
  };

  setFlag('flag-laao',    calcs.la_ao    != null && calcs.la_ao > refs.la_ao_max);
  setFlag('flag-fs',      calcs.fs       != null && calcs.fs    < refs.fs_min);
  setFlag('flag-diastol', (calcs.e_a     != null && calcs.e_a   < refs.e_a_min) ||
                          (calcs.e_eprime!= null && calcs.e_eprime > refs.e_eprime_max));
  setFlag('flag-rm',      hallazgos?.jet_rm && hallazgos.jet_rm !== '0');
  setFlag('flag-hp',      calcs.paps     != null && calcs.paps  > refs.paps_max);

  if (especie === 'felino')
    setFlag('flag-hipert', calcs.hcm_screening?.sospecha_hcm === true);
  else
    setFlag('flag-hipert', hallazgos?.hipertrofia && hallazgos.hipertrofia !== '0');

  const lvidd = getNum('LVIDd');
  const lvids = getNum('LVIDs');
  setFlag('flag-coherencia', !!(lvidd && lvids && lvids >= lvidd));
}

function motorDiagnostico(estado, calcs) {
  const especie  = (estado.paciente?.especie || 'Canino').toLowerCase();
  const esFelino = especie.includes('felin');
  const refs     = esFelino ? REFS.felino : REFS.canino;
  const razasDB  = window.dbRazas || {};
  const preds    = razasDB[estado.paciente?.raza] || {};
  let scores = { MMVD: 0, DCM: 0, HP: 0, SAS: 0, HCM: 0 };
  const soplo = parseInt(estado.exploracion?.soplo || 0);

  if (esFelino) {
    if (calcs.hcm_screening?.sospecha_hcm) scores.HCM += 35;
    if (estado.hallazgos?.hipertrofia && estado.hallazgos.hipertrofia !== '0') scores.HCM += 20;
    if (soplo > 0) scores.HCM += 10;
    if (calcs.lvidd_ref?.reducido) scores.HCM += 10;
    if (calcs.paps != null && calcs.paps >= refs.paps_max) scores.HP += 30;
    if (calcs.lvidd_ref?.dilatado) scores.DCM += 25;
    if (calcs.fs != null && calcs.fs < refs.fs_min) scores.DCM += 25;
  } else {
    if (soplo > 0 && estado.exploracion?.localizacion_soplo === 'apical_izq') scores.MMVD += 15;
    if (estado.hallazgos?.engrosamiento_mitral && estado.hallazgos.engrosamiento_mitral !== '0') scores.MMVD += 20;
    if (estado.hallazgos?.prolapso_mitral) scores.MMVD += 15;
    if (estado.hallazgos?.jet_rm && estado.hallazgos.jet_rm !== '0') scores.MMVD += 15;
    if (preds.mmvd) scores.MMVD += 10;
    if (calcs.lvidd_ref?.dilatado) scores.DCM += 25;
    if (calcs.fs != null && calcs.fs < refs.fs_min) scores.DCM += 25;
    if (preds.dcm) scores.DCM += 15;
    if (calcs.paps != null && calcs.paps >= refs.paps_max) scores.HP += 30;
    if (calcs.grad_ao != null && calcs.grad_ao > refs.grad_ao_danger) scores.SAS += 30;
    if (estado.hallazgos?.hipertrofia && estado.hallazgos.hipertrofia !== '0') scores.HCM += 20;
  }

  const diagnosticos = [], recomendaciones = [];

  if (esFelino) {
    if (scores.HCM >= 30) { diagnosticos.push(t('diag_hcm')); recomendaciones.push('Evaluación cardiológica especializada recomendada.'); }
    if (scores.DCM >= 30) diagnosticos.push(t('diag_dcm'));
    if (scores.HP  >= 30) diagnosticos.push(t('diag_hp'));
  } else {
    if (scores.MMVD >= 30) {
      const cardiomegalia = calcs.lvidd_ref?.dilatado || (calcs.la_ao != null && calcs.la_ao >= refs.la_ao_max);
      diagnosticos.push(cardiomegalia ? t('diag_mmvd_b2') : t('diag_mmvd_b1'));
      recomendaciones.push(cardiomegalia ? t('rec_b2') : t('rec_ok'));
    }
    if (scores.DCM  >= 30) diagnosticos.push(t('diag_dcm'));
    if (scores.HP   >= 30) diagnosticos.push(t('diag_hp'));
    if (scores.SAS  >= 30) diagnosticos.push(t('diag_sas'));
    if (scores.HCM  >= 20) diagnosticos.push(t('diag_hcm'));
  }

  if (diagnosticos.length === 0) {
    const hayDatos = calcs.la_ao != null || calcs.fs != null || calcs.lvidd_ref != null;
    diagnosticos.push(hayDatos ? t('diag_ok') : t('diag_warn'));
    if (hayDatos) recomendaciones.push(t('rec_ok'));
  }

  return { diagnosticos, recomendaciones, scores, especie: esFelino ? 'felino' : 'canino' };
}

// app.js - Fase 5: Auth + Motor Clínico + Traducciones

// === CONFIGURACIÓN DE BASE DE DATOS (SUPABASE) ===
const SUPABASE_URL = "https://susdapyygrdtmaqflmde.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1c2RhcHl5Z3JkdG1hcWZsbWRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNzIyMTQsImV4cCI6MjA4OTk0ODIxNH0.aMHIMrm4JrAnVn0243rXjHR3vakRkUyX2-3s_1TNda4";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// === ESTADO GLOBAL ===
let dbRazas = {};
let langData = {};
let lastReportData = null;
let currentVeterinario = null;

/// Diccionario de Traducciones Extendido
const fallbackI18n = {
    es: {
        titulo: "INFORME ECOCARDIOGRÁFICO", paciente: "DATOS DEL PACIENTE", medidas: "MEDIDAS OBTENIDAS", parametros: "PARÁMETROS CALCULADOS", diagnostico: "DIAGNÓSTICO", recomendaciones: "RECOMENDACIONES", disclaimer: "Este informe es una herramienta de apoyo al diagnóstico. No sustituye el criterio clínico del veterinario.",
        lbl_raza: "Raza", lbl_peso: "Peso", lbl_edad: "Edad", lbl_sexo: "Sexo", lbl_fc: "Frecuencia Card.", lbl_soplo: "Soplo", lbl_grado: "Gradique", lbl_anios: "años",
        tbl_param: "Parámetro", tbl_val: "Valor Medido", tbl_inter: "Interpretación",
        p_lvid: "LVIDd Allométrico (Cornell)", p_fs: "Fracción de Acortamiento (FS)", p_laao: "Relación LA/Ao", p_paps: "PAPs (Vmax RT)", p_gradao: "Gradiente Aórtico",
        txt_esp: "Esp", txt_dilatacion: "Aumentado / Dilatación", txt_normal: "Normal", txt_reducida: "Reducida", txt_dilat_auric: "Dilatación Auricular", txt_precaucion_hp: "Precaución HP", txt_estenosis: "Estenosis",
        diag_ok: "Corazón estructural y funcionalmente dentro de los límites fisiológicos.",
        diag_warn: "Datos insuficientes para generar diagnóstico automático.", 
        diag_mmvd: "Enfermedad Mixomatosa de la Válvula Mitral (MMVD)",
        diag_dcm: "Cardiomiopatía Dilatada (DCM) Probable.",
        diag_hcm: "Estructura sugerente de Cardiomiopatía Hipertrófica (HCM).",
        diag_hp: "Signos compatibles con Hipertensión Pulmonar (HP).",
        diag_sas: "Sugerente de Estenosis Aórtica Subvalvular (SAS).",
        rec_ok: "No se requiere tratamiento farmacológico cardíaco en este momento. Revisiones habituales.",
        txt_notas: "NOTAS CLÍNICAS Y PRESCRIPCIONES", txt_editar_aviso: "(Clica en el texto para editarlo libremente ante de imprimir)"
    },
    en: {
        titulo: "ECHOCARDIOGRAPHIC REPORT", paciente: "PATIENT DATA", medidas: "MEASUREMENTS OBTAINED", parametros: "CALCULATED PARAMETERS", diagnostico: "DIAGNOSIS", recomendaciones: "RECOMMENDATIONS", disclaimer: "This report is a diagnostic tool. Does not replace clinical judgment.",
        lbl_raza: "Breed", lbl_peso: "Weight", lbl_edad: "Age", lbl_sexo: "Sex", lbl_fc: "HR", lbl_soplo: "Murmur", lbl_grado: "Grade", lbl_anios: "years",
        tbl_param: "Parameter", tbl_val: "Value", tbl_inter: "Interpretation",
        p_lvid: "Allometric LVIDd (Cornell)", p_fs: "Fractional Shortening (FS)", p_laao: "LA/Ao Ratio", p_paps: "PAPs (TR Vmax)", p_gradao: "Aortic Gradient",
        txt_esp: "Exp", txt_dilatacion: "Dilated / Increased", txt_normal: "Normal", txt_reducida: "Reduced", txt_dilat_auric: "Atrial Dilation", txt_precaucion_hp: "Caution PH", txt_estenosis: "Stenosis",
        diag_ok: "Physiologically normal heart structure and function.",
        diag_warn: "Insufficient data for auto-diagnosis.",
        diag_mmvd: "Myxomatous Mitral Valve Disease (MMVD)",
        diag_dcm: "Probable Dilated Cardiomyopathy (DCM).",
        diag_hcm: "Suggestive of Hypertrophic Cardiomyopathy (HCM).",
        diag_hp: "Signs compatible with Pulmonary Hypertension (PH).",
        diag_sas: "Suggestive of Subaortic Stenosis (SAS).",
        rec_ok: "No cardiac pharmacy required at this time. Routine follow-ups.",
        txt_notas: "CLINICAL NOTES", txt_editar_aviso: "(Click text to edit freely before printing)"
    },
    fr: {
        titulo: "RAPPORT ÉCHOCARDIOGRAPHIQUE", paciente: "DONNÉES DU PATIENT", medidas: "MESURES OBTENUES", parametros: "PARAMÈTRES CALCULÉS", diagnostico: "DIAGNOSTIC", recomendaciones: "RECOMMANDATIONS", disclaimer: "Ce rapport est un outil d'aide au diagnostic clinique.",
        lbl_raza: "Race", lbl_peso: "Poids", lbl_edad: "Âge", lbl_sexo: "Sexe", lbl_fc: "Fréq. Card.", lbl_soplo: "Souffle", lbl_grado: "Grade", lbl_anios: "ans",
        diag_mmvd: "Maladie Valvulaire Mitrale Mixomateuse (MMVD)",
        diag_dcm: "Cardiomyopathie Dilatée (DCM) Probable.",
        diag_hcm: "Suggestif de Cardiomyopathie Hypertrophique (HCM).",
        diag_hp: "Signes d'Hypertension Pulmonaire (HP).",
        diag_sas: "Suggestif de Sténose Aortique Subvalvulaire (SAS).",
        txt_notas: "NOTES CLINIQUES ET PRESCRIPTIONS", txt_editar_aviso: "(Cliquez pour éditer avant l'impression)"
    },
    cat: {
        titulo: "INFORME ECOCARDIÒGRAFIC", paciente: "DADES DEL PACIENT", medidas: "MESURES OBTINGUDES", parametros: "PARÀMETRES CALCULATS", diagnostico: "DIAGNÒSTIC", recomendaciones: "RECOMANACIONS", disclaimer: "Aquest informe és una eina de suport al diagnòstic.",
        lbl_raza: "Raça", lbl_peso: "Pes", lbl_edad: "Edat", lbl_sexo: "Sexe", lbl_fc: "Freq. Cardíaca", lbl_soplo: "Buf", lbl_grado: "Grau", lbl_anios: "anys",
        diag_mmvd: "Malaltia Valvular Mitral Mixomatosa (MMVD)",
        diag_dcm: "Miocardiopatia Dilatada (DCM) Probable.",
        diag_hcm: "Sugerent de Miocardiopatia Hipertròfica (HCM).",
        diag_hp: "Signes d'Hipertensió Pulmonar (HP).",
        diag_sas: "Sugerent d'Estenosi Aòrtica Subvalvular (SAS).",
        txt_notas: "NOTES CLÍNIQUES I PRESCRIPCIONS", txt_editar_aviso: "(Clica al text per editar-lo abans d'imprimir)"
    },
    de: {
        titulo: "ECHOKARDIOGRAPHISCHER BEFUND", paciente: "PATIENTENDATEN", medidas: "MESSERGEBNISSE", parametros: "BERECHNETE PARAMETER", diagnostico: "DIAGNOSE", recomendaciones: "EMPFEHLUNGEN", disclaimer: "Dieser Bericht ist ein diagnostisches Hilfsmittel.",
        lbl_raza: "Rasse", lbl_peso: "Gewicht", lbl_edad: "Alter", lbl_sexo: "Geschlecht", lbl_fc: "Herzfrequenz", lbl_soplo: "Herzgeräusch", lbl_grado: "Grad", lbl_anios: "Jahre",
        diag_mmvd: "Mitralklappen-Endokardiose (MMVD)",
        diag_dcm: "Verdacht auf Dilatative Kardiomyopathie (DCM).",
        diag_hcm: "Hinweis auf Hypertrophe Kardiomyopathie (HCM).",
        diag_hp: "Anzeichen für Pulmonale Hypertonie (PH).",
        diag_sas: "Hinweis auf Subvalvulare Aortenstenose (SAS).",
        txt_notas: "KLINISCHE NOTIZEN & VERSCHREIBUNGEN", txt_editar_aviso: "(Klicken Sie zum Bearbeiten)"
    }
};

function t(key) {
    const langSelect = document.getElementById('langImpresion');
    const lang = langSelect ? langSelect.value : 'es';
    if (langData[lang] && langData[lang][key]) return langData[lang][key];
    if (fallbackI18n[lang] && fallbackI18n[lang][key]) return fallbackI18n[lang][key];
    if (fallbackI18n['es'][key]) return fallbackI18n['es'][key];
    return key;
}

document.addEventListener('DOMContentLoaded', async () => {

    // === NAVEGACIÓN POR PESTAÑAS ===
    const btnTabWizard = document.getElementById('btnTabWizard');
    const btnTabKnowledge = document.getElementById('btnTabKnowledge');
    const viewWizard = document.getElementById('viewWizard');
    const viewKnowledge = document.getElementById('viewKnowledge');

    if(btnTabWizard && btnTabKnowledge) {
        btnTabWizard.addEventListener('click', () => {
            btnTabWizard.classList.add('active');
            btnTabKnowledge.classList.remove('active');
            viewWizard.style.display = 'block';
            viewKnowledge.classList.add('hidden');
        });

        btnTabKnowledge.addEventListener('click', () => {
            btnTabKnowledge.classList.add('active');
            btnTabWizard.classList.remove('active');
            viewWizard.style.display = 'none';
            viewKnowledge.classList.remove('hidden');
        });
    }

    // === MÓDULO RAG (CONOCIMIENTO) ===
    const btnRagSearch = document.getElementById('btnRagSearch');
    const ragSearchInput = document.getElementById('ragSearchInput');
    const ragResults = document.getElementById('ragResults');
    const ragContent = document.getElementById('ragContent');
    const ragEmpty = document.getElementById('ragEmpty');

    if(btnRagSearch) {
        btnRagSearch.addEventListener('click', async () => {
            const query = ragSearchInput.value.trim();
            if(!query) return;

            btnRagSearch.disabled = true;
            btnRagSearch.innerText = "Buscando...";

            try {
                // Para el RAG real necesitamos una Edge Function o un servicio de embeddings.
                // Por ahora, simulamos la llamada a la base de datos (match_conocimiento)
                const { data, error } = await supabaseClient.rpc('match_conocimiento', {
                    query_embedding: null, 
                    match_threshold: 0.5,
                    match_count: 3
                });

                if(error || !data || data.length === 0) {
                    ragResults.classList.add('hidden');
                    ragEmpty.classList.remove('hidden');
                    ragEmpty.innerHTML = `<p>Resultados para "${query}": No se encontró info específica en el repositorio aún.</p>
                                          <p style="font-size:0.8rem;">Info: La búsqueda RAG requiere embeddings vectoriales activos.</p>`;
                } else {
                    ragEmpty.classList.add('hidden');
                    ragResults.classList.remove('hidden');
                    ragContent.innerHTML = data.map(dim => `
                        <div style="margin-bottom:1rem; padding-bottom:1rem; border-bottom:1px solid #ddd;">
                            <strong>${dim.titulo}</strong> (Fuente: ${dim.fuente})<br>
                            <em style="font-size:0.9rem;">"${dim.contenido}"</em>
                        </div>
                    `).join('');
                }
            } catch (e) { console.error(e); } 
            finally {
                btnRagSearch.disabled = false;
                btnRagSearch.innerText = "Consultar IA";
            }
        });
    }

    // === GESTIÓN DE AUTENTICACIÓN (LOGIN/REGISTRO) ===
    const authContainer = document.getElementById('authContainer');
    const mainApp = document.getElementById('mainApp');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    // Mostrar mensaje nativo de auth
    function showAuthMsg(msg, isSuccess=false) {
        const notice = document.getElementById('authNotice');
        notice.innerHTML = msg;
        notice.style.backgroundColor = isSuccess ? '#ecfdf5' : '#fef2f2';
        notice.style.borderColor = isSuccess ? '#10b981' : '#ef4444';
        notice.style.color = isSuccess ? '#047857' : '#b91c1c';
        notice.classList.remove('hidden');
    }

    // Cambiar vistas
    document.getElementById('btn-show-register').addEventListener('click', () => {
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
        document.getElementById('authNotice').classList.add('hidden');
    });
    document.getElementById('btn-show-login').addEventListener('click', () => {
        registerForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
        document.getElementById('authNotice').classList.add('hidden');
    });

    // Forzar comprobación de sesión inicial por si onAuthStateChange se atasca
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
        if (session) {
            authContainer.classList.add('hidden');
            mainApp.classList.remove('hidden');
            cargarRazas();
            const meta = session.user.user_metadata;
            if (meta && meta.nombre_completo) {
                currentVeterinario = meta;
                document.getElementById('userGreeting').innerHTML = `🩺 Hola, <b>${meta.nombre_completo}</b>`;
                supabaseClient.from('perfiles_veterinarios').upsert({
                    id: session.user.id, nombre_completo: meta.nombre_completo, num_colegiado: meta.num_colegiado, clinica: meta.clinica
                }).then().catch(e => {}); // Silencioso
            } else {
                supabaseClient.from('perfiles_veterinarios').select('*').eq('id', session.user.id).single().then(({data: perfil}) => {
                    if (perfil) {
                        currentVeterinario = perfil;
                        document.getElementById('userGreeting').innerHTML = `🩺 Hola, <b>${perfil.nombre_completo}</b>`;
                    }
                });
            }
        }
    });

    supabaseClient.auth.onAuthStateChange(async (event, session) => {
        if (!session) {
            authContainer.classList.remove('hidden');
            mainApp.classList.add('hidden');
        } else {
            // Si la sesión existe en un cambio, aseguramos que la app sea visible
            authContainer.classList.add('hidden');
            mainApp.classList.remove('hidden');
        }
    });

    // Enviar Formulario de Registro
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('regEmail').value;
        const pass = document.getElementById('regPassword').value;
        const nombre = document.getElementById('regNombre').value;
        const colegiado = document.getElementById('regColegiado').value;
        const clinica = document.getElementById('regClinica').value;

        // 1. Crear usuario en Auth nativo, guardando los datos extra en sus metadatos
        const { data, error } = await supabaseClient.auth.signUp({
            email: email, password: pass,
            options: {
                data: {
                    nombre_completo: nombre,
                    num_colegiado: colegiado,
                    clinica: clinica
                }
            }
        });

        if (error) { 
            showAuthMsg("❌ Error: " + error.message);
            return; 
        }

        if (data && data.user) {
            // Si el backend requiere confirmación de email (session es null)
            if (!data.session) {
                showAuthMsg(`⚠️ <b>¡Solo falta un paso!</b><br>Hemos enviado un enlace a <b>${email}</b>.<br>Haz clic en el enlace para confirmar tu cuenta y poder iniciar sesión.<br><i>(Si no lo ves, revisa tu carpeta de Spam)</i>`);
                // Volver a vista de login cargando el email
                registerForm.classList.add('hidden');
                loginForm.classList.remove('hidden');
                document.getElementById('loginEmail').value = email;
            } else {
                showAuthMsg("✅ Cuenta creada con éxito. Entrando...", true);
                
                // Forzar entrada inmediata
                document.getElementById('authContainer').style.display = 'none';
                document.getElementById('mainApp').classList.remove('hidden');
                cargarRazas();

                const meta = data.user.user_metadata;
                if (meta && meta.nombre_completo) {
                    currentVeterinario = meta;
                    document.getElementById('userGreeting').innerHTML = `🩺 Hola, <b>${meta.nombre_completo}</b>`;
                    
                    // INTENTO DE PERSISTENCIA DEFINITIVO (Separado para capturar errores)
                    supabaseClient.from('perfiles_veterinarios').insert({
                        id: data.user.id,
                        nombre_completo: meta.nombre_completo,
                        num_colegiado: meta.num_colegiado,
                        clinica: meta.clinica
                    }).then(({error}) => { 
                        if(error && error.code === '23505') { // Error de duplicado, ya existía
                            supabaseClient.from('perfiles_veterinarios').update({
                                nombre_completo: meta.nombre_completo,
                                num_colegiado: meta.num_colegiado,
                                clinica: meta.clinica
                            }).eq('id', data.user.id).then();
                        } else if(error) {
                            console.error("Error persistencia:", error.message);
                            showAuthMsg("⚠️ Error al guardar perfil: " + error.message);
                        }
                    });
                }
            }
        }
    });

    // Enviar Formulario de Login
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const pass = document.getElementById('loginPassword').value;
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password: pass });
        
        if (error) {
            if (error.message.includes("Email not confirmed")) {
                showAuthMsg("⛔ <b>Acceso denegado:</b> Aún no has confirmado tu correo electrónico.<br>Por favor, revisa tu bandeja de entrada o Spam y haz clic en el enlace de Supabase enviado a tu cuenta.");
            } else if (error.message.includes("Invalid login credentials")) {
                showAuthMsg("❌ Credenciales incorrectas.");
            } else {
                showAuthMsg("❌ Error: " + error.message);
            }
        } else if (data && data.session) {
            showAuthMsg("✅ Sesión iniciada. Entrando...", true);
            
            // Entrar con FUERZA BRUTA (Hiding overlay by class and by ID-style)
            document.getElementById('authContainer').style.display = 'none';
            document.getElementById('mainApp').classList.remove('hidden');
            
            // Cargar datos
            cargarRazas();
            if (meta && meta.nombre_completo) {
                currentVeterinario = meta;
                document.getElementById('userGreeting').innerHTML = `🩺 Hola, <b>${meta.nombre_completo}</b>`;
                
                // Asegurar persistencia en login
                supabaseClient.from('perfiles_veterinarios').insert({
                    id: data.session.user.id,
                    nombre_completo: meta.nombre_completo,
                    num_colegiado: meta.num_colegiado,
                    clinica: meta.clinica
                }).then(({error}) => {
                    if(error && error.code === '23505') {
                        supabaseClient.from('perfiles_veterinarios').update({
                            nombre_completo: meta.nombre_completo,
                            num_colegiado: meta.num_colegiado,
                            clinica: meta.clinica
                        }).eq('id', data.session.user.id).then();
                    }
                });
            }
        }
    });

    // Botón Salir
    document.getElementById('btnLogout').addEventListener('click', async () => {
        await supabaseClient.auth.signOut();
    });

    // === CARGA INICIAL DE DATOS ===
    async function cargarRazas() {
        if (Object.keys(dbRazas).length > 0) return; // Ya cargadas
        try {
            const { data: razas } = await supabaseClient.from('razas_predisposicion').select('*').order('nombre_raza');
            if (razas) {
                const razaList = document.getElementById('razaList');
                razaList.innerHTML = ''; 
                razas.forEach(r => {
                    const opt = document.createElement('option');
                    opt.value = r.nombre_raza;
                    razaList.appendChild(opt);
                    dbRazas[r.nombre_raza] = r;
                });
            }
        } catch (e) { console.error("Error cargando razas:", e); }
    }


    // === INTERFAZ WIZARD ECOCARDIOGRAMA ===
    const accordionHeaders = document.querySelectorAll('.accordion-header');
    accordionHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const content = header.nextElementSibling;
            if (!header.classList.contains('active')) { header.classList.add('active'); content.classList.add('open'); } 
            else { header.classList.remove('active'); content.classList.remove('open'); }
            updateProgressBar();
        });
    });

    function updateProgressBar() {
        const progressBar = document.getElementById('progressBar');
        const inputs = document.querySelectorAll('input:not([type="password"]):not([type="email"]), select:not(#langSelector):not(#langImpresion)');
        let filledCount = 0;
        inputs.forEach(input => {
            if(input.type === 'checkbox') { if(input.checked) filledCount++; } 
            else if (input.value && input.value.trim() !== '') { filledCount++; }
        });
        progressBar.style.width = Math.max(0, Math.min((filledCount / 25) * 100, 100)) + '%';
    }

    document.querySelectorAll('input, select').forEach(input => {
        input.addEventListener('change', updateProgressBar);
        input.addEventListener('keyup', updateProgressBar);
    });

    document.getElementById('btn-limpiar').addEventListener('click', () => {
        if(confirm("¿Limpiar todo el formulario?")) {
            document.getElementById('ecoForm').reset();
            updateProgressBar();
            document.getElementById('informeFinal').classList.add('hidden');
            document.getElementById('ecoForm').style.display = 'block';
        }
    });

    document.getElementById('btn-cerrar-informe').addEventListener('click', () => {
        document.getElementById('informeFinal').classList.add('hidden');
        document.getElementById('ecoForm').style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    document.getElementById('btn-imprimir').addEventListener('click', () => window.print());

    document.getElementById('langImpresion').addEventListener('change', () => {
        if (lastReportData) {
            const diagnosis = motorDiagnostico(lastReportData.state, lastReportData.calcs);
            renderizarInformeHTML(lastReportData.state, lastReportData.calcs, diagnosis);
        }
    });

    // === EXTRACCIÓN Y CÁLCULOS ===
    function getNum(id) { const val = document.getElementById(id)?.value; return (val && !isNaN(val)) ? parseFloat(val) : null; }
    function getStr(id) { return document.getElementById(id)?.value || null; }
    function getCheckbox(id) { return document.getElementById(id)?.checked || false; }

    function getState() {
        return {
            p: { nombre: getStr('nombrePaciente'), raza: getStr('raza'), peso: getNum('peso'), edad: getNum('edad'), sexo: getStr('sexo'), soplo: parseInt(getStr('soplo')||"0"), fc: getNum('fc') },
            mm: { LVIDd: getNum('LVIDd'), LVIDs: getNum('LVIDs'), IVSd: getNum('IVSd'), IVSs: getNum('IVSs'), LVPWd: getNum('LVPWd'), LVPWs: getNum('LVPWs'), LA: getNum('LA'), Ao: getNum('Ao'), EPSS: getNum('EPSS') },
            dop: { Vmax_Ao: getNum('Vmax_Ao'), Vmax_Pul: getNum('Vmax_Pul'), E_mitral: getNum('E_mitral'), A_mitral: getNum('A_mitral'), VmaxRT: getNum('VmaxRT'), e_prime: getNum('e_prime'), IVCT: getNum('IVCT'), IVRT: getNum('IVRT'), ET: getNum('ET') },
            cualitativos: { prolapso: getCheckbox('prolapso_mitral'), aplanamiento_septal: getCheckbox('aplanamiento_septal'), engrosamiento: getStr('engrosamiento_mitral'), jet_rm: getStr('jet_rm'), derrame: getStr('derrame_pericardico') },
            obs: getStr('comentarios_libres')
        };
    }

    function motorDiagnostico(state, calcs) {
        let scores = { MMVD: 0, DCM: 0, HP: 0, SAS: 0 };
        const preds = dbRazas[state.p.raza] || {};
        
        if (state.p.soplo > 0 && getStr('localizacionSoplo') === 'apical_izq') scores.MMVD += 15;
        if (state.cualitativos.engrosamiento && state.cualitativos.engrosamiento !== "0") scores.MMVD += 20;
        if (state.cualitativos.prolapso) scores.MMVD += 15;
        if (state.cualitativos.jet_rm && state.cualitativos.jet_rm !== "0") scores.MMVD += 15;
        if (preds.mmvd) scores.MMVD += 10;
        
        const lang = document.getElementById('langImpresion').value || 'es';
        let tx_mmvd = (lang === 'en') ? "Myxomatous Mitral Valve Disease (MMVD)" : "Enfermedad Mixomatosa de la Válvula Mitral (MMVD)";

        let mmvd_acvim = "";
        let rec_mmvd = "";
        if (scores.MMVD >= 30) {
            const dilatado = calcs.allometricLVIDd?.dilatado || (calcs.la_ao && parseFloat(calcs.la_ao.valor) >= 1.6);
            if (!dilatado) { 
                mmvd_acvim = "Estadio B1"; rec_mmvd = (lang==='es')?"No se requiere tratamiento farmacológico según guías ACVIM.":"No pharmacological treatment required (ACVIM guidelines)."; 
            } else { 
                mmvd_acvim = "Estadio B2 (o superior)"; rec_mmvd = (lang==='es')?"Criterios de cardiomegalia presentes. Considerar inicio de pimobendan.":"Cardiomegaly criteria present. Consider starting pimobendan."; 
            }
        }

        if (calcs.hipertension_pulmonar && parseFloat(calcs.hipertension_pulmonar.paps) >= 30) scores.HP += 25;
        if (calcs.sistolica && parseFloat(calcs.sistolica.fs_porcentaje) < 25) scores.DCM += 25;
        if (preds.dcm) scores.DCM += 15;

        let diagnosticosFinales = [];
        let recomendacionesFinales = [];

        if (scores.MMVD >= 30) { diagnosticosFinales.push(`${tx_mmvd} - ${mmvd_acvim}`); recomendacionesFinales.push(rec_mmvd); }
        if (scores.DCM >= 30) diagnosticosFinales.push(t('diag_dcm'));
        if (scores.HP >= 30) diagnosticosFinales.push(`HP - ${t('txt_precaucion_hp')}`);
        
        if (diagnosticosFinales.length === 0 && calcs.allometricLVIDd) { diagnosticosFinales.push(t('diag_ok')); recomendacionesFinales.push(t('rec_ok')); }
        else if (diagnosticosFinales.length === 0) diagnosticosFinales.push(t('diag_warn'));

        return { diagnosticos: diagnosticosFinales, recomendaciones: recomendacionesFinales };
    }

    function renderizarInformeHTML(state, calcs, diagnosis) {
        let lblV = (val) => val ? val : '-';

        // Estampado del doctor actual
        let drFirmaHTML = "";
        if(currentVeterinario) {
            drFirmaHTML = `<p style="margin:0; font-weight:600;">Especialista: ${currentVeterinario.nombre_completo}</p>
                           <p style="margin:0; font-size:0.9rem; color:var(--text-muted);">Nº Col: ${currentVeterinario.num_colegiado} | Hospital: ${currentVeterinario.clinica}</p>`;
        }

        const reporteHTML = `
            <div class="report-header" style="text-align:left; display:flex; justify-content:space-between; align-items:flex-end;">
                <div>
                    <h2 style="margin-bottom:0.2rem;">🫀 ${t('titulo')}</h2>
                    <p style="margin:0; font-size:1.1rem;"><strong>${t('lbl_raza')}:</strong> ${lblV(state.p.nombre)} | <strong>Fecha:</strong> ${new Date().toLocaleDateString()}</p>
                </div>
                <div style="text-align:right;">
                    ${drFirmaHTML}
                </div>
            </div>

            <div class="report-section" style="margin-top:2rem;">
                <h3>📋 ${t('paciente')}</h3>
                <table class="data-table">
                    <tr><td><strong>${t('lbl_raza')}:</strong> ${lblV(state.p.raza)}</td><td><strong>${t('lbl_peso')}:</strong> ${lblV(state.p.peso)} kg</td><td><strong>${t('lbl_edad')}:</strong> ${lblV(state.p.edad)} ${t('lbl_anios')}</td></tr>
                    <tr><td><strong>${t('lbl_sexo')}:</strong> ${lblV(state.p.sexo)}</td><td><strong>${t('lbl_fc')}:</strong> ${lblV(state.p.fc)} lpm</td><td><strong>${t('lbl_soplo')}:</strong> ${t('lbl_grado')} ${state.p.soplo || '0'}/VI</td></tr>
                </table>
            </div>

            <div class="report-section">
                <h3>🔢 ${t('parametros')}</h3>
                <table class="data-table">
                    <tr><th>${t('tbl_param')}</th><th>${t('tbl_val')}</th><th>${t('tbl_inter')}</th></tr>
                    ${calcs.allometricLVIDd ? `<tr><td><strong>${t('p_lvid')}</strong></td><td>${calcs.allometricLVIDd.med} cm (${t('txt_esp')}: ${calcs.allometricLVIDd.esp})</td><td class="${calcs.allometricLVIDd.dilatado ? 'val-danger' : 'val-normal'}">${calcs.allometricLVIDd.dilatado ? t('txt_dilatacion') : t('txt_normal')}</td></tr>` : ''}
                    ${calcs.sistolica ? `<tr><td><strong>${t('p_fs')}</strong></td><td>${calcs.sistolica.fs_porcentaje} %</td><td class="${(calcs.sistolica.fs_porcentaje < 25) ? 'val-danger' : 'val-normal'}">${(calcs.sistolica.fs_porcentaje < 25) ? t('txt_reducida') : t('txt_normal')}</td></tr>` : ''}
                    ${calcs.la_ao ? `<tr><td><strong>${t('p_laao')}</strong></td><td>${calcs.la_ao.valor}</td><td class="${(calcs.la_ao.valor >= 1.6) ? 'val-danger' : 'val-normal'}">${(calcs.la_ao.valor >= 1.6) ? t('txt_dilat_auric') : t('txt_normal')}</td></tr>` : ''}
                    ${calcs.hipertension_pulmonar ? `<tr><td><strong>${t('p_paps')}</strong></td><td>${calcs.hipertension_pulmonar.paps} mmHg</td><td class="${calcs.hipertension_pulmonar.paps>30?'val-danger':'val-normal'}">${calcs.hipertension_pulmonar.paps>30?t('txt_precaucion_hp'):t('txt_normal')}</td></tr>` : ''}
                    ${calcs.grad_ao ? `<tr><td><strong>${t('p_gradao')}</strong></td><td>${calcs.grad_ao} mmHg</td><td class="${calcs.grad_ao>50?'val-danger':'val-normal'}">${calcs.grad_ao>50?t('txt_estenosis'):t('txt_normal')}</td></tr>` : ''}
                </table>
            </div>

            <div class="report-section">
                <h3>🩺 ${t('diagnostico')} <span class="no-print" style="font-size:0.75rem; color:var(--primary-color); font-weight:normal;">${t('txt_editar_aviso')}</span></h3>
                <div style="background: var(--secondary-color); padding: 1rem; border-radius: 4px; border-left: 4px solid var(--primary-color);">
                    <ul style="margin:0; padding-left: 20px; outline:none;" contenteditable="true" class="editable-content">
                        ${diagnosis.diagnosticos.map(d => `<li style="font-weight: 500; font-size: 1.05rem; margin-bottom: 0.5rem;">${d}</li>`).join('')}
                    </ul>
                </div>
            </div>

            <div class="report-section">
                <h3>💡 ${t('recomendaciones')} <span class="no-print" style="font-size:0.75rem; color:var(--primary-color); font-weight:normal;">${t('txt_editar_aviso')}</span></h3>
                <ul style="padding-left: 20px; outline:none;" contenteditable="true" class="editable-content">
                     ${diagnosis.recomendaciones.map(r => `<li style="margin-bottom: 0.5rem;">${r}</li>`).join('')}
                </ul>
            </div>

            ${state.obs ? `
            <div class="report-section">
                <h3>✍️ ${t('txt_notas')} <span class="no-print" style="font-size:0.75rem; color:var(--primary-color); font-weight:normal;">${t('txt_editar_aviso')}</span></h3>
                <div style="padding: 1rem; border: 1px dashed var(--border-color); white-space: pre-wrap; outline:none;" contenteditable="true" class="editable-content">${state.obs}</div>
            </div>` : ''}

            <div style="margin-top: 3rem; font-size: 0.8rem; color: #666; text-align: center; border-top: 1px solid #eee; padding-top: 1rem;">
                <p>⚠️ ${t('disclaimer')}</p>
            </div>
        `;
        document.getElementById('reporteContenido').innerHTML = reporteHTML;
    }

    // === ACCIÓN PPAL ===
    document.getElementById('btn-generar').addEventListener('click', (e) => {
        e.preventDefault();
        const state = getState();
        if (state.mm.LVIDs && state.mm.LVIDd && state.mm.LVIDs >= state.mm.LVIDd) { alert("❌ Error: LVIDs >= LVIDd."); return; }

        const calcs = {};
        if (state.p.peso && state.mm.LVIDd) {
            const esp = 1.53 * Math.pow(state.p.peso, 0.294);
            const med = state.mm.LVIDd / 10;
            calcs.allometricLVIDd = { dilatado: med > (esp*1.15), med: med.toFixed(2), esp: esp.toFixed(2) };
        }
        if (state.mm.LVIDd && state.mm.LVIDs) { calcs.sistolica = { fs_porcentaje: (((state.mm.LVIDd - state.mm.LVIDs) / state.mm.LVIDd) * 100).toFixed(1) }; }
        if (state.mm.LA && state.mm.Ao) { calcs.la_ao = { valor: (state.mm.LA / state.mm.Ao).toFixed(2) }; }
        if (state.dop.VmaxRT) { calcs.hipertension_pulmonar = { paps: (4 * Math.pow(state.dop.VmaxRT, 2) + 5).toFixed(1) }; }
        if (state.dop.Vmax_Ao) { calcs.grad_ao = (4 * Math.pow(state.dop.Vmax_Ao, 2)).toFixed(1); }

        const diagnosis = motorDiagnostico(state, calcs);
        lastReportData = { state, calcs, diagnosis }; 

        renderizarInformeHTML(state, calcs, diagnosis);

        document.getElementById('ecoForm').style.display = 'none';
        document.getElementById('informeFinal').classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
});

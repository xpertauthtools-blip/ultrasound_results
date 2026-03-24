-- ==========================================
-- ESQUEMA BASE DE DATOS SUPABASE
-- Aplicación: Asistente Ecocardiográfico Vet
-- ==========================================

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLA DE VETERINARIOS (Extiende el Auth nativo de Supabase)
CREATE TABLE IF NOT EXISTS public.perfiles_veterinarios (
    id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
    nombre_completo TEXT,
    num_colegiado TEXT,
    clinica TEXT,
    idioma_preferido TEXT DEFAULT 'ES',
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Configurar RLS (Row Level Security) para perfiles
ALTER TABLE public.perfiles_veterinarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vet puede ver su propio perfil" ON public.perfiles_veterinarios FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Vet puede actualizar su perfil" ON public.perfiles_veterinarios FOR UPDATE USING (auth.uid() = id);


-- 3. TABLA DE RAZAS Y PREDISPOSICIONES
CREATE TABLE IF NOT EXISTS public.razas_predisposicion (
    id SERIAL PRIMARY KEY,
    nombre_raza TEXT UNIQUE NOT NULL,
    mmvd BOOLEAN DEFAULT FALSE,
    dcm BOOLEAN DEFAULT FALSE,
    sas BOOLEAN DEFAULT FALSE,
    ps BOOLEAN DEFAULT FALSE,
    pda BOOLEAN DEFAULT FALSE,
    hp BOOLEAN DEFAULT FALSE,
    vsd BOOLEAN DEFAULT FALSE
);

-- Tabla de lectura pública para que la App cargue el listado (o de lectura autenticada si prefieres)
ALTER TABLE public.razas_predisposicion ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todos pueden leer razas" ON public.razas_predisposicion FOR SELECT USING (true);


-- 4. TABLA DE INFORMES / HISTORIAL DE PACIENTES
CREATE TABLE IF NOT EXISTS public.informes_pacientes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    veterinario_id UUID REFERENCES public.perfiles_veterinarios(id) NOT NULL,
    nombre_paciente TEXT NOT NULL,
    raza_id INTEGER REFERENCES public.razas_predisposicion(id),
    peso_kg DECIMAL(5,2),
    edad_agnos DECIMAL(4,1),
    fecha_informe TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    -- Guardaremos toda la data compleja del corazón en un gran objeto JSON 
    -- (Es mucho más eficiente y flexible que crear 50 columnas SQL).
    datos_eco JSONB NOT NULL,
    diagnostico_principal TEXT,
    estadio_acvim TEXT
);

-- RLS: Cada veterinario solo puede ver/crear los informes de sus perros
ALTER TABLE public.informes_pacientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vet ve sus informes" ON public.informes_pacientes FOR SELECT USING (auth.uid() = veterinario_id);
CREATE POLICY "Vet crea informes" ON public.informes_pacientes FOR INSERT WITH CHECK (auth.uid() = veterinario_id);


-- 5. TABLA DE DICCIONARIO (TRADUCTOR i18n)
CREATE TABLE IF NOT EXISTS public.diccionario_traducciones (
    clave TEXT PRIMARY KEY,
    es TEXT NOT NULL,
    en TEXT,
    fr TEXT,
    de TEXT,
    cat TEXT,
    categoria TEXT -- Ej: 'UI', 'Diagnostico', 'Recomendacion'
);

ALTER TABLE public.diccionario_traducciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todos pueden leer traducciones" ON public.diccionario_traducciones FOR SELECT USING (true);


-- ==========================================
-- DATOS INICIALES (SEMILLA / SEED)
-- ==========================================

-- Insertar algunas razas iniciales con sus predisposiciones
INSERT INTO public.razas_predisposicion (nombre_raza, mmvd, dcm, sas, ps, pda, hp) VALUES
('Cavalier King Charles Spaniel', true, false, false, false, true, false),
('Chihuahua', true, false, false, true, true, false),
('Dóberman', false, true, false, false, false, false),
('Mestizo', false, false, false, false, false, false),
('Gran Danés', false, true, true, false, false, false),
('Bóxer', false, true, true, true, false, false),
('Perro de Aguas Español', true, false, false, false, false, false)
ON CONFLICT (nombre_raza) DO NOTHING;

-- Insertar algunas palabras al diccionario
INSERT INTO public.diccionario_traducciones (clave, es, en, fr, de, cat, categoria) VALUES
('titulo_informe', 'INFORME ECOCARDIOGRÁFICO', 'ECHOCARDIOGRAPHIC REPORT', 'RAPPORT ÉCHOCARDIOGRAPHIQUE', 'ECHOKARDIOGRAPHISCHER BEFUND', 'INFORME ECOCARDIOGRÀFIC', 'UI'),
('lbl_paciente', 'Datos del Paciente', 'Patient Data', 'Données du Patient', 'Patientendaten', 'Dades del Pacient', 'UI'),
('diag_mmvd', 'Enfermedad Mixomatosa de la Válvula Mitral', 'Myxomatous Mitral Valve Disease', 'Maladie Valvulaire Mitrale Myxomateuse', 'Myxomatöse Mitralklappenerkrankung', 'Malaltia Mixomatosa de la Vàlvula Mitral', 'Diagnostico')
ON CONFLICT (clave) DO NOTHING;

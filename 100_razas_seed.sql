-- ==========================================
-- SCRIPT DE INSERCIÓN MASIVA: 100 RAZAS CANINAS
-- ==========================================
-- Ejecutar este archivo en el "SQL Editor" de tu proyecto de Supabase.
-- Añadirá 100 razas automáticamente a la tabla con sus predisposiciones
-- cardiológicas pre-configuradas basándose en la literatura veterinaria (ACVIM).
-- ==========================================

INSERT INTO public.razas_predisposicion (nombre_raza, mmvd, dcm, sas, ps, pda, hp, vsd) VALUES
-- GRUPO 1: PREDISPOSICIÓN A MMVD (Mixomatosa) Y PDA (Ductus Patente) (Perros Pequeños/Toy)
('Caniche Toy', true, false, false, false, true, false, false),
('Caniche Enano', true, false, false, false, true, false, false),
('Chihuahua', true, false, false, true, true, false, false),
('Cavalier King Charles Spaniel', true, false, false, false, true, false, false),
('Bichón Maltés', true, false, false, false, true, false, false),
('Bichón Frisé', true, false, false, false, false, false, false),
('Pomerania', true, false, false, false, true, false, false),
('Yorkshire Terrier', true, false, false, false, true, false, false),
('Shih Tzu', true, false, false, false, false, false, false),
('Lhasa Apso', true, false, false, false, false, false, false),
('Pekinés', true, false, false, false, false, false, false),
('Teckel (Dachshund) Miniatura', true, false, false, false, false, false, false),
('Teckel (Dachshund) Standard', true, false, false, false, false, false, false),
('Jack Russell Terrier', true, false, false, false, false, true, false),
('West Highland White Terrier (Westie)', true, false, false, false, false, true, false),
('Corgi Galés de Pembroke', true, false, false, false, false, false, false),
('Corgi Galés de Cardigan', true, false, false, false, false, false, false),
('Carlino (Pug)', true, false, false, false, false, true, false),
('Boston Terrier', true, false, false, true, false, false, false),
('Schnauzer Miniatura', true, false, false, true, false, false, false),
('Crestado Chino', true, false, false, false, false, false, false),
('Cotón de Tulear', true, false, false, false, false, false, false),

-- GRUPO 2: PREDISPOSICIÓN A DCM (Cardiomiopatía Dilatada) (Perros Gigantes/Grandes)
('Dóberman Pinscher', false, true, false, false, false, false, false),
('Gran Danés', false, true, false, false, false, false, false),
('Bóxer', false, true, true, true, false, false, false),
('Lobero Irlandés', false, true, false, false, false, false, false),
('Leonberger', false, true, false, false, false, false, false),
('Terranova', false, true, true, false, false, false, false),
('San Bernardo', false, true, false, false, false, false, false),
('Afgano', false, true, false, false, false, false, false),
('Cocker Spaniel Inglés', true, true, false, false, false, false, false),
('Cocker Spaniel Americano', true, true, false, false, false, false, false),
('Dálmata', false, true, false, false, false, false, false),

-- GRUPO 3: PREDISPOSICIÓN A SAS (Estenosis Subaórtica) Y PS (Pulmonar)
('Golden Retriever', false, false, true, false, false, false, false),
('Rottweiler', false, false, true, false, false, false, false),
('Pastor Alemán', false, false, true, false, true, false, false),
('Bulldog Inglés', false, false, false, true, false, false, true),
('Bulldog Francés', false, false, false, true, false, false, true),
('Bullmastiff', false, false, true, false, false, false, false),
('Mastín Napolitano', false, true, false, false, false, false, false),
('Mastín Español', false, true, false, false, false, false, false),
('Samoyedo', false, false, false, true, false, false, false),
('American Staffordshire Terrier', false, false, false, true, false, false, false),
('Pitbull Terrier', false, false, false, true, false, false, false),

-- GRUPO 4: RAZAS DE TRABAJO, CAZA Y OTRAS SIN PREDISPOSICIONES MARCADAS (> General)
('Labrador Retriever', false, false, false, false, false, false, false),
('Border Collie', false, false, false, false, false, false, false),
('Pastor Belga Malinois', false, false, false, false, false, false, false),
('Pastor Australiano', false, false, false, false, false, false, false),
('Shetland Sheepdog', false, false, false, false, true, false, false),
('Caniche Gigante', false, false, false, false, false, false, false),
('Husky Siberiano', false, false, false, false, false, false, false),
('Alaskan Malamute', false, false, false, false, false, false, false),
('Akita Inu', false, false, false, false, false, false, false),
('Shiba Inu', false, false, false, false, false, false, false),
('Chow Chow', false, false, false, false, false, false, false),
('Galgo Inglés (Greyhound)', false, false, false, false, false, false, false),
('Galgo Español', false, false, false, false, false, false, false),
('Whippet', false, false, false, false, false, false, false),
('Borzoi', false, false, false, false, false, false, false),
('Saluki', false, false, false, false, false, false, false),
('Podenco Ibicenco', false, false, false, false, false, false, false),
('Perro de Agua Español', true, false, false, false, false, false, false),
('Pointer Inglés', false, false, false, false, false, false, false),
('Setter Irlandés', false, false, false, false, false, false, false),
('Braco Alemán', false, false, false, false, false, false, false),
('Weimaraner', false, false, false, false, false, false, false),
('Vizsla', false, false, false, false, false, false, false),
('Spaniel Bretón', false, false, false, false, false, false, false),
('Basset Hound', false, false, false, false, false, false, false),
('Beagle', false, false, false, true, false, false, false),
('Bloodhound', false, false, false, false, false, false, false),
('Dog de Burdeos', false, true, true, false, false, false, false),
('Presa Canario', false, false, false, false, false, false, false),
('Dogo Argentino', false, false, false, false, false, false, false),
('Schnauzer Gigante', false, false, false, false, false, false, false),
('Schnauzer Mediano', false, false, false, false, false, false, false),
('Boyero de Berna', false, false, false, false, false, false, false),
('Airedale Terrier', false, false, false, false, false, false, false),
('Bull Terrier', false, false, false, false, false, false, false),
('Staffordshire Bull Terrier', false, false, false, false, false, false, false),
('Fox Terrier', false, false, false, false, false, false, false),
('Cairn Terrier', false, false, false, false, false, false, false),
('Border Terrier', false, false, false, false, false, false, false),
('Basenji', false, false, false, false, false, false, false),
('Spitz Alemán', false, false, false, false, false, false, false),

-- GRUPO 5: MESTIZOS Y VARIACIONES GENÉRICAS (Márgenes fisiológicos limpios)
('Mestizo (Pequeño <10kg)', false, false, false, false, false, false, false),
('Mestizo (Mediano 10-25kg)', false, false, false, false, false, false, false),
('Mestizo (Grande >25kg)', false, false, false, false, false, false, false),
('Gato (Referencia Rápida)', false, false, false, false, false, false, false)

ON CONFLICT (nombre_raza) DO NOTHING;

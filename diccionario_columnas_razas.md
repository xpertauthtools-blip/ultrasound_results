# 📖 Diccionario de Datos: Tabla `razas_predisposicion`

Este documento explica las siglas y el significado médico detrás de cada una de las columnas boleanas (True / False) que estructuran el cerebro de la aplicación en Supabase. Estas predisposiciones alimentan al Motor Diagnóstico en `app.js` otorgando puntuación extra cuando un perro pertenece a una raza con alto riesgo de sufrir dicha enfermedad congénita o adquirida.

---

### 1. `id` (Identificador)
**Significado:** Es un número secuencial único que identifica a la fila dentro de la base de datos. Se autogenera al insertar una raza.

### 2. `nombre_raza` (Texto)
**Significado:** El nombre científico o comercial de la raza de perro (Ej. "Dóberman", "Bulldog Francés"). Este es el texto exacto que aparecerá en el menú desplegable del formulario web.

### 3. `mmvd` (Myxomatous Mitral Valve Disease)
**Qué es:** Enfermedad Mixomatosa de la Válvula Mitral (Endocardiosis Mitral).
**Características:** Es la cardiopatía adquirida más común en el perro (aprox. 75% o más). Provoca el engrosamiento de los velos valvulares y posterior regurgitación e insuficiencia cardíaca congestiva.
**Razas predispuestas (Marcadas como TRUE):** Perros de raza pequeña en general; *Cavalier King Charles Spaniel, Teckel (Dachshund), Chihuahua, Caniche, Yorkshire Terrier, Shih Tzu*.

### 4. `dcm` (Dilated Cardiomyopathy)
**Qué es:** Cardiomiopatía Dilatada.
**Características:** Enfermedad del músculo cardíaco caracterizada por una dilatación excesiva de las cámaras (especialmente del ventrículo izquierdo) y una muy baja fracción de acortamiento / reducción en la contractilidad sistólica.
**Razas predispuestas (Marcadas como TRUE):** Perros de raza grande o gigante; *Dóberman Pinscher, Gran Danés, Bóxer, Lobero Irlandés, Cocker Spaniel (por deficiencia de taurina)*.

### 5. `sas` (Subaortic Stenosis)
**Qué es:** Estenosis Subaórtica.
**Características:** Defecto congénito producido por un anillo o reborde de tejido fibroso debajo de la válvula aórtica que obstruye el flujo de salida del ventrículo izquierdo al cuerpo, provocando hipertrofia del ventrículo.
**Razas predispuestas (Marcadas como TRUE):** *Golden Retriever, Rottweiler, Bóxer, Terranova, Pastor Alemán*.

### 6. `ps` (Pulmonic Stenosis)
**Qué es:** Estenosis Pulmonar.
**Características:** Es un estrechamiento congénito en la zona de la válvula pulmonar (vía de salida del ventrículo derecho hacia los pulmones), frecuentemente asimilado a una malformación valvular.
**Razas predispuestas (Marcadas como TRUE):** Fundamentalmente braquicéfalos; *Bulldog Inglés, Bulldog Francés, Schnauzer Miniatura, Beagle, Pinscher Miniatura*.

### 7. `pda` (Patent Ductus Arteriosus)
**Qué es:** Ductus Arterioso Persistente.
**Características:** Anomalía congénita. El conducto que conecta la arteria aorta con la arteria pulmonar en la vida fetal no se cierra tras el nacimiento. Provoca una sobrecarga de volumen irreversible en el lado izquierdo del corazón por el reingreso continuo de sangre desde el sistema aórtico.
**Razas predispuestas (Marcadas como TRUE):** *Bichón Maltés, Caniche Miniatura/Toy, Pomerania, Cavalier King Charles Spaniel, Pastor Alemán*.

### 8. `hp` (Pulmonary Hypertension)
**Qué es:** Hipertensión Pulmonar.
**Características:** Incremento crónico de la presión en las arterias pulmonares (presiones sistólicas >30-45 mmHg) debido a causas pre y post-capilares (MMVD severa, parásitos del corazón "Dirofilaria", fibrosis pulmonar).
**Razas predispuestas (Marcadas como TRUE):** Ciertas razas propensas a enfermedades respiratorias de vías bajas o fibrosis (Ej. *West Highland White Terrier (Westie), Jack Russell*).

### 9. `vsd` (Ventricular Septal Defect)
**Qué es:** Defecto del Septo Ventricular (Comunicación Interventricular).
**Características:** Agujero congénito en la pared que separa el ventrículo izquierdo del ventrículo derecho, generando un soplo pansistólico ruidoso.
**Razas predispuestas (Marcadas como TRUE):** *Springer Spaniel Inglés, Bulldog Inglés, Keeshond*.

---
**Nota de Uso para Supabase:** Al insertar nuevas razas en el sistema, evalúa si la raza tiene una prevalencia literaria alta comprobada para estas patologías y asigna `TRUE`. De lo contrario, por defecto, se designa como `FALSE`, lo que permite al motor diagnóstico depender estrictamente de las mediciones ecocardiográficas neutras.

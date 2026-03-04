/**
 * Librería de diagnósticos más frecuentes en emergencias prehospitalarias.
 * Cada entrada incluye término común (para la UI), código CIE-11 y descripción técnica (para PDF/Firebase).
 */

export interface DiagnosticoCIE {
  termino_comun: string;
  codigo_cie: string;
  descripcion_tecnica: string;
}

/** Lista predefinida de ~100 diagnósticos de emergencias prehospitalarias con CIE-11 */
export const DIAGNOSTICOS_EMERGENCIAS: DiagnosticoCIE[] = [
  { termino_comun: "Infarto agudo de miocardio", codigo_cie: "BA41", descripcion_tecnica: "Infarto agudo de miocardio" },
  { termino_comun: "ACV isquémico", codigo_cie: "8B11", descripcion_tecnica: "Accidente cerebrovascular isquémico" },
  { termino_comun: "ACV hemorrágico", codigo_cie: "8B12", descripcion_tecnica: "Accidente cerebrovascular hemorrágico" },
  { termino_comun: "Politraumatismo", codigo_cie: "NA01", descripcion_tecnica: "Traumatismo múltiple" },
  { termino_comun: "Crisis hipertensiva", codigo_cie: "BA00", descripcion_tecnica: "Crisis hipertensiva" },
  { termino_comun: "Parada cardiorrespiratoria", codigo_cie: "MC82", descripcion_tecnica: "Parada cardiorrespiratoria" },
  { termino_comun: "RCP en curso", codigo_cie: "MC82", descripcion_tecnica: "Reanimación cardiopulmonar en curso" },
  { termino_comun: "Insuficiencia respiratoria aguda", codigo_cie: "CB01", descripcion_tecnica: "Insuficiencia respiratoria aguda" },
  { termino_comun: "Edema agudo de pulmón", codigo_cie: "CB00", descripcion_tecnica: "Edema agudo de pulmón" },
  { termino_comun: "Asma agudo grave", codigo_cie: "CA23", descripcion_tecnica: "Crisis asmática grave" },
  { termino_comun: "EPOC descompensado", codigo_cie: "CA22", descripcion_tecnica: "Exacerbación aguda de EPOC" },
  { termino_comun: "Neumotórax", codigo_cie: "CB93", descripcion_tecnica: "Neumotórax" },
  { termino_comun: "Taponamiento cardíaco", codigo_cie: "BA42", descripcion_tecnica: "Taponamiento cardíaco" },
  { termino_comun: "Fibrilación ventricular", codigo_cie: "BC81", descripcion_tecnica: "Fibrilación ventricular" },
  { termino_comun: "Taquicardia ventricular", codigo_cie: "BC80", descripcion_tecnica: "Taquicardia ventricular" },
  { termino_comun: "Fibrilación auricular de novo", codigo_cie: "BC81.0", descripcion_tecnica: "Fibrilación auricular de reciente inicio" },
  { termino_comun: "Shock hipovolémico", codigo_cie: "MG10", descripcion_tecnica: "Shock hipovolémico" },
  { termino_comun: "Shock séptico", codigo_cie: "1D41", descripcion_tecnica: "Shock séptico" },
  { termino_comun: "Shock anafiláctico", codigo_cie: "4A84", descripcion_tecnica: "Reacción anafiláctica con shock" },
  { termino_comun: "Anafilaxia", codigo_cie: "4A84", descripcion_tecnica: "Reacción anafiláctica" },
  { termino_comun: "Traumatismo craneoencefálico", codigo_cie: "NA07", descripcion_tecnica: "Traumatismo craneoencefálico" },
  { termino_comun: "TCE grave", codigo_cie: "NA07.1", descripcion_tecnica: "Traumatismo craneoencefálico grave" },
  { termino_comun: "Traumatismo torácico", codigo_cie: "NB30", descripcion_tecnica: "Traumatismo de tórax" },
  { termino_comun: "Traumatismo abdominal", codigo_cie: "NB31", descripcion_tecnica: "Traumatismo abdominal" },
  { termino_comun: "Fractura de fémur", codigo_cie: "NC72", descripcion_tecnica: "Fractura de fémur" },
  { termino_comun: "Fractura de pelvis", codigo_cie: "NC71", descripcion_tecnica: "Fractura de pelvis" },
  { termino_comun: "Fractura de columna", codigo_cie: "NC60", descripcion_tecnica: "Fractura de columna vertebral" },
  { termino_comun: "Lesión medular", codigo_cie: "NA06", descripcion_tecnica: "Traumatismo de médula espinal" },
  { termino_comun: "Amputación traumática", codigo_cie: "NC90", descripcion_tecnica: "Amputación traumática" },
  { termino_comun: "Hemorragia masiva", codigo_cie: "NA92", descripcion_tecnica: "Hemorragia masiva externa" },
  { termino_comun: "Coma", codigo_cie: "MB20", descripcion_tecnica: "Coma" },
  { termino_comun: "Convulsión / Crisis convulsiva", codigo_cie: "8A60", descripcion_tecnica: "Crisis epiléptica convulsiva" },
  { termino_comun: "Status epiléptico", codigo_cie: "8A62", descripcion_tecnica: "Estado epiléptico" },
  { termino_comun: "Síncope", codigo_cie: "MB20.1", descripcion_tecnica: "Síncope" },
  { termino_comun: "Hipotensión severa", codigo_cie: "BA00.1", descripcion_tecnica: "Hipotensión arterial severa" },
  { termino_comun: "Diabetes descompensada / Hiperglucemia", codigo_cie: "5A21", descripcion_tecnica: "Hiperglucemia severa" },
  { termino_comun: "Hipoglucemia severa", codigo_cie: "5A21.0", descripcion_tecnica: "Hipoglucemia severa" },
  { termino_comun: "Cetoacidosis diabética", codigo_cie: "5A21", descripcion_tecnica: "Cetoacidosis diabética" },
  { termino_comun: "Intoxicación etílica aguda", codigo_cie: "NE61", descripcion_tecnica: "Intoxicación por alcohol" },
  { termino_comun: "Sobredosis / Intoxicación", codigo_cie: "NE60", descripcion_tecnica: "Intoxicación por sustancias" },
  { termino_comun: "Intento de suicidio", codigo_cie: "NA00", descripcion_tecnica: "Autolesión intencional" },
  { termino_comun: "Quemadura grave", codigo_cie: "ND91", descripcion_tecnica: "Quemadura de espesor completo" },
  { termino_comun: "Quemadura extensa", codigo_cie: "ND90", descripcion_tecnica: "Quemadura de gran superficie corporal" },
  { termino_comun: "Ahogamiento / Casi ahogamiento", codigo_cie: "NE23", descripcion_tecnica: "Ahogamiento y sumersión" },
  { termino_comun: "Hipotermia", codigo_cie: "NF02", descripcion_tecnica: "Hipotermia accidental" },
  { termino_comun: "Golpe de calor", codigo_cie: "NF01", descripcion_tecnica: "Golpe de calor" },
  { termino_comun: "Parto inminente / Parto en vía pública", codigo_cie: "JA00", descripcion_tecnica: "Parto no institucional" },
  { termino_comun: "Hemorragia posparto", codigo_cie: "JA02", descripcion_tecnica: "Hemorragia posparto" },
  { termino_comun: "Preeclampsia / Eclampsia", codigo_cie: "JA24", descripcion_tecnica: "Preeclampsia y eclampsia" },
  { termino_comun: "Dolor torácico", codigo_cie: "ME84", descripcion_tecnica: "Dolor torácico no especificado" },
  { termino_comun: "Síndrome coronario agudo", codigo_cie: "BA40", descripcion_tecnica: "Síndrome coronario agudo" },
  { termino_comun: "Angina inestable", codigo_cie: "BA40.0", descripcion_tecnica: "Angina inestable" },
  { termino_comun: "Embolia pulmonar", codigo_cie: "DB96", descripcion_tecnica: "Embolia pulmonar" },
  { termino_comun: "Disección aórtica", codigo_cie: "BD10", descripcion_tecnica: "Disección de aorta" },
  { termino_comun: "Obstrucción vía aérea", codigo_cie: "CA42", descripcion_tecnica: "Obstrucción de vía aérea superior" },
  { termino_comun: "Cuerpo extraño vía aérea", codigo_cie: "CA42.0", descripcion_tecnica: "Cuerpo extraño en vía aérea" },
  { termino_comun: "Reacción alérgica grave", codigo_cie: "4A84", descripcion_tecnica: "Reacción de hipersensibilidad tipo I grave" },
  { termino_comun: "Edema de glotis", codigo_cie: "CA42.1", descripcion_tecnica: "Edema de glotis" },
  { termino_comun: "Sepsis", codigo_cie: "1D40", descripcion_tecnica: "Sepsis" },
  { termino_comun: "Meningitis", codigo_cie: "1C81", descripcion_tecnica: "Meningitis bacteriana" },
  { termino_comun: "Encefalitis", codigo_cie: "1C80", descripcion_tecnica: "Encefalitis" },
  { termino_comun: "Hemorragia digestiva alta", codigo_cie: "DA60", descripcion_tecnica: "Hemorragia digestiva alta" },
  { termino_comun: "Hemorragia digestiva baja", codigo_cie: "DA61", descripcion_tecnica: "Hemorragia digestiva baja" },
  { termino_comun: "Abdomen agudo", codigo_cie: "DA01", descripcion_tecnica: "Dolor abdominal agudo" },
  { termino_comun: "Apendicitis aguda", codigo_cie: "DA00", descripcion_tecnica: "Apendicitis aguda" },
  { termino_comun: "Peritonitis", codigo_cie: "DA02", descripcion_tecnica: "Peritonitis" },
  { termino_comun: "Obstrucción intestinal", codigo_cie: "DA63", descripcion_tecnica: "Obstrucción intestinal" },
  { termino_comun: "Cólico renal / Cólico nefrítico", codigo_cie: "GB00", descripcion_tecnica: "Cólico renal" },
  { termino_comun: "Pielonefritis aguda", codigo_cie: "GB40", descripcion_tecnica: "Pielonefritis aguda" },
  { termino_comun: "Crisis de ansiedad / Pánico", codigo_cie: "6B00", descripcion_tecnica: "Trastorno de pánico" },
  { termino_comun: "Agitación psicomotriz", codigo_cie: "6A00", descripcion_tecnica: "Agitación en contexto psiquiátrico" },
  { termino_comun: "Ideación suicida", codigo_cie: "MB25", descripcion_tecnica: "Ideación suicida" },
  { termino_comun: "Accidente de tráfico", codigo_cie: "NA01.0", descripcion_tecnica: "Traumatismo por accidente de tráfico" },
  { termino_comun: "Atropello", codigo_cie: "NA01.1", descripcion_tecnica: "Traumatismo por atropello" },
  { termino_comun: "Caída de altura", codigo_cie: "NA02", descripcion_tecnica: "Traumatismo por caída" },
  { termino_comun: "Herida por arma blanca", codigo_cie: "NA90", descripcion_tecnica: "Herida por objeto cortante o punzante" },
  { termino_comun: "Herida por arma de fuego", codigo_cie: "NA91", descripcion_tecnica: "Herida por arma de fuego" },
  { termino_comun: "Electrocución", codigo_cie: "NF03", descripcion_tecnica: "Traumatismo por corriente eléctrica" },
  { termino_comun: "Reacción adversa a medicamento", codigo_cie: "NE60", descripcion_tecnica: "Reacción adversa a medicamento" },
  { termino_comun: "Alteración del nivel de consciencia", codigo_cie: "MB20", descripcion_tecnica: "Alteración del nivel de consciencia" },
  { termino_comun: "Cefalea brusca / Cefalea en trueno", codigo_cie: "8A00", descripcion_tecnica: "Cefalea de aparición brusca" },
  { termino_comun: "Hemorragia subaracnoidea", codigo_cie: "8B12.0", descripcion_tecnica: "Hemorragia subaracnoidea" },
  { termino_comun: "Arritmia cardíaca", codigo_cie: "BC80", descripcion_tecnica: "Arritmia cardíaca" },
  { termino_comun: "Bradicardia sintomática", codigo_cie: "BC80.1", descripcion_tecnica: "Bradicardia sintomática" },
  { termino_comun: "Taquicardia supraventricular", codigo_cie: "BC80.0", descripcion_tecnica: "Taquicardia supraventricular" },
  { termino_comun: "Insuficiencia cardíaca aguda", codigo_cie: "BA01", descripcion_tecnica: "Insuficiencia cardíaca aguda" },
  { termino_comun: "TEP", codigo_cie: "DB96", descripcion_tecnica: "Tromboembolismo pulmonar" },
  { termino_comun: "Neumonía grave", codigo_cie: "CA40", descripcion_tecnica: "Neumonía adquirida en la comunidad grave" },
  { termino_comun: "COVID-19 grave", codigo_cie: "RA01", descripcion_tecnica: "COVID-19 con neumonía grave" },
  { termino_comun: "Deshidratación severa", codigo_cie: "5A70", descripcion_tecnica: "Deshidratación severa" },
  { termino_comun: "Shock cardiógeno", codigo_cie: "BA42.1", descripcion_tecnica: "Shock cardiógeno" },
  { termino_comun: "Reacción vagal", codigo_cie: "MB20.1", descripcion_tecnica: "Síncope vasovagal" },
  { termino_comun: "Traumatismo ocular", codigo_cie: "9A00", descripcion_tecnica: "Traumatismo del globo ocular" },
  { termino_comun: "Fractura abierta", codigo_cie: "NC72.1", descripcion_tecnica: "Fractura abierta" },
  { termino_comun: "Luxación", codigo_cie: "NC80", descripcion_tecnica: "Luxación articular" },
  { termino_comun: "Esguince grave", codigo_cie: "NC83", descripcion_tecnica: "Esguince y distensión ligamentosa grave" },
  { termino_comun: "Contusión torácica", codigo_cie: "NB30.0", descripcion_tecnica: "Contusión de tórax" },
  { termino_comun: "Traumatismo facial", codigo_cie: "NB20", descripcion_tecnica: "Traumatismo facial" },
  { termino_comun: "Paciente politraumatizado", codigo_cie: "NA01", descripcion_tecnica: "Traumatismo múltiple grave" },
  { termino_comun: "Emergencia psiquiátrica", codigo_cie: "6A00", descripcion_tecnica: "Crisis en contexto de trastorno mental" },
  { termino_comun: "Crisis de asma", codigo_cie: "CA23", descripcion_tecnica: "Exacerbación aguda de asma" },
  { termino_comun: "Dolor abdominal agudo", codigo_cie: "DA01", descripcion_tecnica: "Dolor abdominal agudo" },
  { termino_comun: "Cefalea aguda", codigo_cie: "8A00", descripcion_tecnica: "Cefalea aguda" },
  { termino_comun: "Dolor lumbar agudo", codigo_cie: "ME84.1", descripcion_tecnica: "Dolor lumbar agudo" },
  { termino_comun: "Otro / No especificado", codigo_cie: "MA00", descripcion_tecnica: "Diagnóstico pendiente de codificación" },
];

/** Mínimo de caracteres para mostrar resultados (evita listas enormes con 1 letra). */
const MIN_CARACTERES_BUSQUEDA = 2;

/** Filtra diagnósticos por término común (búsqueda en tiempo real, case-insensitive). */
export function filtrarDiagnosticos(query: string): DiagnosticoCIE[] {
  const q = query.trim().toLowerCase();
  if (!q) return DIAGNOSTICOS_EMERGENCIAS.slice(0, 20);
  if (q.length < MIN_CARACTERES_BUSQUEDA) return [];
  return DIAGNOSTICOS_EMERGENCIAS.filter(
    (d) =>
      d.termino_comun.toLowerCase().includes(q) ||
      d.codigo_cie.toLowerCase().includes(q) ||
      d.descripcion_tecnica.toLowerCase().includes(q)
  ).slice(0, 15);
}

import type { ReportSummaryData } from "@/lib/report-summary";

// ---------------------------------------------------------------------------
// Estándar FHIR (Encounter + Observation) — nomenclatura universal
// Referencia: https://hl7.org/fhir/encounter.html, https://hl7.org/fhir/observation.html
// ---------------------------------------------------------------------------

/** Código de recurso FHIR. */
export const FHIR_ENCOUNTER_RESOURCE_TYPE = "Encounter" as const;
export const FHIR_OBSERVATION_RESOURCE_TYPE = "Observation" as const;

/** Referencia a un recurso (paciente, organización, etc.). */
export interface FhirReference {
  reference?: string;
  display?: string;
}

/** Período de tiempo (inicio/fin). */
export interface FhirPeriod {
  start?: string;
  end?: string;
}

/** Cantidad con unidad (para signos vitales). */
export interface FhirQuantity {
  value?: number;
  unit?: string;
  system?: string;
  code?: string;
}

/** Recurso FHIR Observation (signos vitales, hallazgos). */
export interface FhirObservation {
  resourceType: typeof FHIR_OBSERVATION_RESOURCE_TYPE;
  id?: string;
  status?: "registered" | "preliminary" | "final" | "amended" | "cancelled";
  code?: { coding?: Array<{ system?: string; code?: string; display?: string }> };
  subject?: FhirReference;
  effectiveDateTime?: string;
  valueQuantity?: FhirQuantity;
  /** Para TA: component con sistólica y diastólica. */
  component?: Array<{ code?: { coding?: Array<{ code?: string }> }; valueQuantity?: FhirQuantity }>;
}

/** Recurso FHIR Encounter (encuentro/atención clínica). */
export interface FhirEncounter {
  resourceType: typeof FHIR_ENCOUNTER_RESOURCE_TYPE;
  id?: string;
  status?: "planned" | "in-progress" | "discharged" | "cancelled";
  class?: { system?: string; code?: string; display?: string };
  subject?: FhirReference;
  participant?: Array<{ individual?: FhirReference }>;
  period?: FhirPeriod;
  reasonCode?: Array<{ coding?: Array<{ system?: string; code?: string; display?: string }> }>;
  diagnosis?: Array<{ condition?: FhirReference; use?: { coding?: Array<{ code?: string }> } }>;
}

/** Atención vista como Encounter FHIR + observaciones (signos vitales) opcionales. */
export interface AtencionFhir {
  encounter: FhirEncounter;
  observations?: FhirObservation[];
}

// ---------------------------------------------------------------------------
// API actual (compatible con GET /api/atenciones)
// ---------------------------------------------------------------------------

/**
 * Estructura de una atención devuelta por GET /api/atenciones (Neon vía Prisma).
 * Coincide con lo que usa el frontend (Historial, Manager Exportar).
 * Los campos tienen nombres claros y son compatibles con mapeo a FHIR.
 */
export interface AtencionFromApi {
  /** ID público para mostrar/enlazar (report_id ofuscado o id de Prisma). */
  id: string;
  /** PK en Neon; usar para DELETE. */
  atencionId: string;
  /** Fecha de creación (ISO 8601). */
  createdAt: string;
  /** Nombre del paciente. */
  nombrePaciente: string;
  /** Identificador del paciente. */
  pacienteId: string;
  operadorId?: string;
  unidadId?: string;
  sintomas_texto?: string;
  diagnostico_codigo?: string;
  /** Payload completo: triaje, signos vitales, Glasgow, eventos (mapeable a Observations). */
  data: ReportSummaryData;
}

/**
 * Convierte una AtencionFromApi a representación FHIR (Encounter + Observations).
 * Útil para interoperabilidad y mercados que exigen FHIR.
 */
export function atencionToFhir(aten: AtencionFromApi): AtencionFhir {
  const periodStart = aten.data?.hora_inicio_atencion ?? aten.createdAt;
  const encounter: FhirEncounter = {
    resourceType: FHIR_ENCOUNTER_RESOURCE_TYPE,
    id: aten.id,
    status: "discharged",
    class: { system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", code: "EMER", display: "emergency" },
    subject: { reference: `Patient/${aten.pacienteId}`, display: aten.nombrePaciente },
    period: { start: periodStart, end: aten.createdAt },
    reasonCode: aten.sintomas_texto
      ? [{ coding: [{ system: "http://snomed.info/sct", code: "finding", display: aten.sintomas_texto }] }]
      : undefined,
    diagnosis:
      aten.diagnostico_codigo || aten.data?.diagnostico?.codigo_cie
        ? [
            {
              condition: {
                reference: undefined,
                display: aten.data?.diagnostico?.termino_comun ?? aten.diagnostico_codigo ?? undefined,
              },
              use: { coding: [{ code: "DD" }] },
            },
          ]
        : undefined,
  };

  const sv = aten.data?.signos_vitales ?? {};
  const observations: FhirObservation[] = [];

  const fc = sv.frecuenciaCardiaca ?? aten.data?.pulse;
  if (fc != null && typeof fc === "number") {
    observations.push({
      resourceType: FHIR_OBSERVATION_RESOURCE_TYPE,
      code: { coding: [{ system: "http://loinc.org", code: "8867-4", display: "Heart rate" }] },
      subject: { reference: `Patient/${aten.pacienteId}` },
      effectiveDateTime: aten.createdAt,
      valueQuantity: { value: fc, unit: "beats/minute", code: "/min" },
    });
  }
  const temp = sv.temperatura ?? (aten.data as Record<string, unknown>).temperatura;
  if (temp != null && typeof temp === "number") {
    observations.push({
      resourceType: FHIR_OBSERVATION_RESOURCE_TYPE,
      code: { coding: [{ system: "http://loinc.org", code: "8310-5", display: "Body temperature" }] },
      subject: { reference: `Patient/${aten.pacienteId}` },
      effectiveDateTime: aten.createdAt,
      valueQuantity: { value: temp, unit: "Cel", code: "Cel" },
    });
  }
  const sat = sv.saturacionOxigeno;
  if (sat != null && typeof sat === "number") {
    observations.push({
      resourceType: FHIR_OBSERVATION_RESOURCE_TYPE,
      code: { coding: [{ system: "http://loinc.org", code: "59408-5", display: "Oxygen saturation" }] },
      subject: { reference: `Patient/${aten.pacienteId}` },
      effectiveDateTime: aten.createdAt,
      valueQuantity: { value: sat, unit: "%", code: "%" },
    });
  }
  const fr = sv.frecuenciaRespiratoria ?? aten.data?.respiration_rate;
  if (fr != null && typeof fr === "number") {
    observations.push({
      resourceType: FHIR_OBSERVATION_RESOURCE_TYPE,
      code: { coding: [{ system: "http://loinc.org", code: "9279-1", display: "Respiratory rate" }] },
      subject: { reference: `Patient/${aten.pacienteId}` },
      effectiveDateTime: aten.createdAt,
      valueQuantity: { value: fr, unit: "breaths/minute", code: "/min" },
    });
  }
  const sys = aten.data?.bp_systolic;
  const dia = aten.data?.bp_diastolic;
  if (sys != null || dia != null) {
    observations.push({
      resourceType: FHIR_OBSERVATION_RESOURCE_TYPE,
      code: { coding: [{ system: "http://loinc.org", code: "85354-9", display: "Blood pressure" }] },
      subject: { reference: `Patient/${aten.pacienteId}` },
      effectiveDateTime: aten.createdAt,
      component: [
        sys != null ? { code: { coding: [{ code: "8480-6" }] }, valueQuantity: { value: sys, unit: "mmHg" } } : undefined,
        dia != null ? { code: { coding: [{ code: "8462-4" }] }, valueQuantity: { value: dia, unit: "mmHg" } } : undefined,
      ].filter(Boolean) as FhirObservation["component"],
    });
  }

  return { encounter, observations };
}

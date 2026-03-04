"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiDashboardPacientes = exports.apiTriage = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const express_1 = __importDefault(require("express"));
const types_1 = require("./lib/types");
const triage_llm_1 = require("./lib/triage-llm");
const triage_logic_1 = require("./lib/triage-logic");
admin.initializeApp();
const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    "Content-Type": "application/json",
};
const COLECCION_TRIAJES = "triajes";
/** Envía respuesta JSON con CORS. */
function sendJson(res, status, data) {
    res.set(CORS_HEADERS);
    res.status(status).json(data);
}
/** Responde a preflight OPTIONS. */
function handleOptions(res) {
    res.set(CORS_HEADERS);
    res.status(204).send("");
}
/** Objeto a documento Firestore: quitar undefined (Firestore no los acepta). */
function toFirestoreDoc(obj) {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
        if (v !== undefined)
            out[k] = v;
    }
    return out;
}
/**
 * POST: recibe body JSON de triaje, categoriza con LLM, guarda en Firestore y devuelve registro.
 * URL: https://<region>-<project>.cloudfunctions.net/apiTriage
 */
const appTriage = (0, express_1.default)();
appTriage.use(express_1.default.json());
appTriage.use((_req, res, next) => {
    res.set(CORS_HEADERS);
    next();
});
appTriage.options("*", (_req, res) => handleOptions(res));
appTriage.post("/", async (req, res) => {
    var _a, _b, _c, _d;
    let data;
    try {
        if (req.body && typeof req.body === "object") {
            data = req.body;
        }
        else {
            const raw = typeof req.body === "string" ? req.body : "{}";
            data = JSON.parse(raw);
        }
    }
    catch (_e) {
        sendJson(res, 400, { error: "Error de parseo" });
        return;
    }
    if (!data || typeof data !== "object") {
        sendJson(res, 400, { error: "Datos incompletos", recibido: data });
        return;
    }
    const nombreVal = String(((_b = (_a = data.nombre_paciente) !== null && _a !== void 0 ? _a : data.nombre) !== null && _b !== void 0 ? _b : "").toString()).trim();
    const dniVal = String(((_c = data.dni) !== null && _c !== void 0 ? _c : "").toString()).trim();
    const tienePacienteId = "paciente_id" in data && data.paciente_id != null && String(data.paciente_id).trim() !== "";
    const tieneSintomas = "sintomas_texto" in data && data.sintomas_texto != null && String(data.sintomas_texto).trim().length >= types_1.MIN_SINTOMAS_CARACTERES;
    const tieneNombre = nombreVal !== "";
    const tieneDni = dniVal !== "";
    const tieneAlgunIdentificador = tieneNombre || tieneDni;
    if (!tienePacienteId || !tieneSintomas || !tieneAlgunIdentificador) {
        sendJson(res, 400, { error: "Datos incompletos", recibido: data });
        return;
    }
    const entrada = data;
    const paciente_id = String(entrada.paciente_id).trim();
    const sintomas_texto = String(entrada.sintomas_texto).trim();
    const signos_vitales = (entrada.signos_vitales && typeof entrada.signos_vitales === "object") ? entrada.signos_vitales : {};
    const nombre_paciente = typeof entrada.nombre_paciente === "string" && entrada.nombre_paciente.trim()
        ? entrada.nombre_paciente.trim()
        : paciente_id;
    const dni = typeof entrada.dni === "string" && entrada.dni.trim() ? entrada.dni.trim() : undefined;
    const glasgow = entrada.glasgow &&
        typeof entrada.glasgow.puntaje_glasgow === "number" &&
        typeof entrada.glasgow.E === "number" &&
        typeof entrada.glasgow.V === "number" &&
        typeof entrada.glasgow.M === "number"
        ? {
            E: entrada.glasgow.E,
            V: entrada.glasgow.V,
            M: entrada.glasgow.M,
            puntaje_glasgow: entrada.glasgow.puntaje_glasgow,
        }
        : undefined;
    const hora_inicio_atencion = typeof entrada.hora_inicio_atencion === "string" && entrada.hora_inicio_atencion.trim()
        ? entrada.hora_inicio_atencion.trim()
        : undefined;
    const blood_loss = typeof entrada.blood_loss === "string" && entrada.blood_loss.trim() ? entrada.blood_loss.trim() : undefined;
    const airway_status = typeof entrada.airway_status === "string" && entrada.airway_status.trim() ? entrada.airway_status.trim() : undefined;
    const respiration_rate = typeof entrada.respiration_rate === "number" ? entrada.respiration_rate : undefined;
    const pulse = typeof entrada.pulse === "number" ? entrada.pulse : undefined;
    const bp_systolic = typeof entrada.bp_systolic === "number" ? entrada.bp_systolic : undefined;
    const bp_diastolic = typeof entrada.bp_diastolic === "number" ? entrada.bp_diastolic : undefined;
    const glasgow_score = typeof entrada.glasgow_score === "number" ? entrada.glasgow_score : glasgow === null || glasgow === void 0 ? void 0 : glasgow.puntaje_glasgow;
    try {
        const resultadoLLM = await (0, triage_llm_1.categorizarConLLM)(sintomas_texto, signos_vitales, glasgow);
        const nivel_gravedad = (_d = resultadoLLM.nivel_gravedad) !== null && _d !== void 0 ? _d : (0, triage_llm_1.nivelNombreAGravedad)(resultadoLLM.nivel);
        const recomendacion = typeof resultadoLLM.recomendacion_inmediata === "string" && resultadoLLM.recomendacion_inmediata.trim()
            ? resultadoLLM.recomendacion_inmediata.trim()
            : (0, triage_logic_1.generarRecomendacion)(nivel_gravedad);
        const MENSAJE_FALLBACK = "Clasificación automática no disponible, diríjase a recepción";
        const registro = {
            paciente_id,
            sintomas_texto,
            nivel_gravedad,
            recomendacion,
            signos_vitales,
            fecha: new Date().toISOString(),
            nivel: resultadoLLM.nivel,
            explicacion_tecnica: resultadoLLM.explicacion_tecnica,
            pasos_a_seguir: resultadoLLM.pasos_a_seguir,
            ...(nombre_paciente ? { nombre_paciente } : {}),
            ...(dni ? { dni } : {}),
            ...(glasgow ? { glasgow } : {}),
            ...(resultadoLLM.diagnostico_presuntivo != null && resultadoLLM.diagnostico_presuntivo !== "" ? { diagnostico_presuntivo: resultadoLLM.diagnostico_presuntivo } : {}),
            ...(resultadoLLM.justificacion != null && resultadoLLM.justificacion !== "" ? { justificacion: resultadoLLM.justificacion } : {}),
            ...(resultadoLLM.recomendacion_inmediata != null && resultadoLLM.recomendacion_inmediata !== "" ? { recomendacion_inmediata: resultadoLLM.recomendacion_inmediata } : {}),
            ...(resultadoLLM.fallback ? { mensaje_fallback: MENSAJE_FALLBACK } : {}),
            ...(hora_inicio_atencion ? { hora_inicio_atencion } : {}),
            ...(blood_loss != null ? { blood_loss } : {}),
            ...(airway_status != null ? { airway_status } : {}),
            ...(respiration_rate != null ? { respiration_rate } : {}),
            ...(pulse != null ? { pulse } : {}),
            ...(bp_systolic != null ? { bp_systolic } : {}),
            ...(bp_diastolic != null ? { bp_diastolic } : {}),
            ...(glasgow_score != null ? { glasgow_score } : {}),
        };
        const db = admin.firestore();
        const docRef = await db.collection(COLECCION_TRIAJES).add(toFirestoreDoc(registro));
        sendJson(res, 200, { success: true, registro: { id: docRef.id, ...registro } });
    }
    catch (err) {
        console.error("Error al procesar triaje:", err);
        sendJson(res, 500, { error: "Error al procesar el triaje" });
    }
});
exports.apiTriage = functions.region("us-central1").runWith({
    timeoutSeconds: 60,
    memory: "512MB",
}).https.onRequest(appTriage);
/**
 * GET: lista de pacientes en espera (triajes) ordenados por nivel de gravedad descendente.
 * URL: https://<region>-<project>.cloudfunctions.net/apiDashboardPacientes
 */
const appDashboard = (0, express_1.default)();
appDashboard.use((_req, res, next) => {
    res.set(CORS_HEADERS);
    next();
});
appDashboard.options("*", (_req, res) => handleOptions(res));
appDashboard.get("/", async (_req, res) => {
    try {
        const snapshot = await admin.firestore().collection(COLECCION_TRIAJES).get();
        const todos = snapshot.docs.map((d) => {
            var _a, _b, _c, _d, _e, _f;
            const data = d.data();
            return {
                ...data,
                paciente_id: (_a = data.paciente_id) !== null && _a !== void 0 ? _a : "",
                sintomas_texto: (_b = data.sintomas_texto) !== null && _b !== void 0 ? _b : "",
                nivel_gravedad: (_c = data.nivel_gravedad) !== null && _c !== void 0 ? _c : 3,
                recomendacion: (_d = data.recomendacion) !== null && _d !== void 0 ? _d : "",
                signos_vitales: (_e = data.signos_vitales) !== null && _e !== void 0 ? _e : {},
                fecha: (_f = data.fecha) !== null && _f !== void 0 ? _f : new Date().toISOString(),
            };
        });
        const ordenados = [...todos].sort((a, b) => b.nivel_gravedad - a.nivel_gravedad);
        sendJson(res, 200, ordenados);
    }
    catch (err) {
        console.error("Error al obtener pacientes:", err);
        sendJson(res, 500, { error: "Error al obtener la lista de pacientes" });
    }
});
exports.apiDashboardPacientes = functions.region("us-central1").https.onRequest(appDashboard);

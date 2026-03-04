/**
 * Función global para limpiar cualquier objeto antes de enviarlo a Firebase.
 * Recorre todas las propiedades: si encuentra undefined o null, lo convierte en string vacío "".
 * Firebase prohíbe undefined (p. ej. sintomas_texto); usar "" evita el error.
 */
export function cleanObject(value: unknown): unknown {
  if (value === undefined || value === null) return "";
  if (typeof value === "number" && !Number.isFinite(value)) return "";
  if (Array.isArray(value)) return value.map((item) => cleanObject(item));
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = v === undefined || v === null ? "" : cleanObject(v);
    }
    return out;
  }
  return value;
}

/** Alias para uso en formularios de triaje/atención: sanitiza datos antes de addDoc/setDoc en Firestore. */
export function sanitizeFirestoreData<T>(data: T): T {
  return cleanObject(data) as T;
}

/** Alias global solicitado: mismo comportamiento que cleanObject (recursivo, undefined/null → ""). */
export function cleanFirestoreObject<T>(data: T): T {
  return cleanObject(data) as T;
}

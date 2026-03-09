/**
 * IDs ofuscados para reportes públicos (seguridad por diseño).
 * No secuenciales ni predecibles; uso de entropía criptográfica.
 */

const PREFIX = "rpt_";
const BYTES_LENGTH = 12;
const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

function getRandomBytes(length: number): Uint8Array {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const arr = new Uint8Array(length);
    crypto.getRandomValues(arr);
    return arr;
  }
  const arr = new Uint8Array(length);
  for (let i = 0; i < length; i++) arr[i] = Math.floor(Math.random() * 256);
  return arr;
}

/**
 * Genera un ID de reporte no secuencial ni predecible.
 * Formato: rpt_<base62> (ej. rpt_K7x2mN9pQ1wZ).
 * Usar en PDF, URLs públicas y report_id en base de datos.
 */
export function generateReportId(): string {
  const bytes = getRandomBytes(BYTES_LENGTH);
  let result = "";
  for (let i = 0; i < bytes.length; i++) {
    result += BASE62[bytes[i] % 62];
  }
  return PREFIX + result;
}

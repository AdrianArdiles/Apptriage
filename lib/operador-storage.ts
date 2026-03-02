const OPERADOR_ID_KEY = "ambulancia-pro-operador-id";
const UNIDAD_ID_KEY = "ambulancia-pro-unidad-id";
const ATENDIDO_POR_KEY = "ambulancia-pro-atendido-por";

export function getOperadorId(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(OPERADOR_ID_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setOperadorId(id: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(OPERADOR_ID_KEY, (id || "").trim());
  } catch {
    // ignore
  }
}

export function getUnidadId(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(UNIDAD_ID_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setUnidadId(id: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(UNIDAD_ID_KEY, (id || "").trim());
  } catch {
    // ignore
  }
}

export function clearOperadorId(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(OPERADOR_ID_KEY);
    localStorage.removeItem(UNIDAD_ID_KEY);
    localStorage.removeItem(ATENDIDO_POR_KEY);
  } catch {
    // ignore
  }
}

/** Firma del profesional para PDF y Firebase (Nombre Apellido - Matrícula). Se establece al completar perfil. */
export function getAtendidoPor(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(ATENDIDO_POR_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setAtendidoPor(value: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ATENDIDO_POR_KEY, (value || "").trim());
  } catch {
    // ignore
  }
}

/** Sincroniza localStorage con el perfil del profesional logueado (tras login o completar perfil). */
export function syncFromProfile(profile: { nombre: string; apellido: string; matricula: string }): void {
  const nombreCompleto = `${(profile.nombre || "").trim()} ${(profile.apellido || "").trim()}`.trim();
  setOperadorId(nombreCompleto || "Paramédico");
  setUnidadId((profile.matricula || "").trim());
  setAtendidoPor(nombreCompleto && profile.matricula ? `${nombreCompleto} - Matrícula ${profile.matricula.trim()}` : nombreCompleto || "");
}

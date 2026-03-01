const OPERADOR_ID_KEY = "ambulancia-pro-operador-id";
const UNIDAD_ID_KEY = "ambulancia-pro-unidad-id";

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
  } catch {
    // ignore
  }
}

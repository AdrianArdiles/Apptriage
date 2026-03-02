/** Clave en sessionStorage para indicar que el usuario entró con Clave de Manager. Solo se setea tras validar PIN. */

const MANAGER_SESSION_KEY = "ambulancia-pro-manager-session";

export function setManagerSession(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(MANAGER_SESSION_KEY, "1");
  } catch {
    // ignore
  }
}

export function hasManagerSession(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(MANAGER_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function clearManagerSession(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(MANAGER_SESSION_KEY);
  } catch {
    // ignore
  }
}

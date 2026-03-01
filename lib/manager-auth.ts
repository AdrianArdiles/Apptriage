/** Clave de 4 dígitos para acceso al panel de Gestión (Manager). Por defecto: 1234 */
const MANAGER_PIN_DEFAULT = "1234";

export function validateManagerPin(input: string): boolean {
  const normalized = input.replace(/\D/g, "").slice(0, 4);
  return normalized === MANAGER_PIN_DEFAULT;
}

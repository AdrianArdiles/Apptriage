import type { RegistroTriage } from "./types";

/** Almacén en memoria (mock). En producción usar DB con cifrado y control de acceso. */
const store: RegistroTriage[] = [];

export function guardarTriage(registro: RegistroTriage): void {
  store.push(registro);
}

export function obtenerTriajesPorPaciente(pacienteId: string): RegistroTriage[] {
  return store.filter((r) => r.paciente_id === pacienteId);
}

export function obtenerUltimoTriage(pacienteId: string): RegistroTriage | undefined {
  const delPaciente = obtenerTriajesPorPaciente(pacienteId);
  return delPaciente[delPaciente.length - 1];
}

/** Devuelve todos los registros de triaje (para dashboard). Ordenar por nivel_gravedad en el cliente. */
export function obtenerTodosTriajes(): RegistroTriage[] {
  return [...store];
}

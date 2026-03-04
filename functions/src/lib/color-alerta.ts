import type { NivelGravedad } from "./types";

export const GRAVEDAD_A_COLOR: Record<NivelGravedad, string> = {
  1: "green",
  2: "yellow",
  3: "orange",
  4: "red",
  5: "darkred",
};

export function gravedadToColorAlerta(gravedad: NivelGravedad): string {
  return GRAVEDAD_A_COLOR[gravedad];
}

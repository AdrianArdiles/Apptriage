"use client";

import * as React from "react";

const RED_EMERGENCY = "#dc2626";
const BLUE_MEDICAL = "#2563eb";

/** Línea EKG estilizada que termina en flecha hacia la derecha (velocidad/avance). Degradado rojo → azul. */
const EKG_PATH =
  "M 6 32 L 12 32 L 14 28 L 16 32 L 18 32 L 20 32 L 22 22 L 24 42 L 26 32 L 28 32 L 30 30 L 32 32 L 42 32 L 50 32 L 46 28 L 46 36 L 50 32";

/** SVG completo del logo como string para serializar (p. ej. generar imagen para PDF). */
export const LOGO_EKG_SVG_STRING = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="logo-ekg-grad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="${RED_EMERGENCY}"/><stop offset="100%" stop-color="${BLUE_MEDICAL}"/></linearGradient></defs><path d="${EKG_PATH}" fill="none" stroke="url(#logo-ekg-grad)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const GRADIENT_ID = "logo-ekg-gradient";

export function LogoEkg({ className }: { className?: string }): React.ReactElement {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id={GRADIENT_ID} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={RED_EMERGENCY} />
          <stop offset="100%" stopColor={BLUE_MEDICAL} />
        </linearGradient>
      </defs>
      <path
        d={EKG_PATH}
        fill="none"
        stroke={`url(#${GRADIENT_ID})`}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SpinnerMedicoProps {
  className?: string;
  /** Texto bajo el spinner (ej. "Evaluando con IA...") */
  label?: string;
}

/** Spinner con icono de cruz médica y animación de pulso. */
export function SpinnerMedico({ className, label }: SpinnerMedicoProps): React.ReactElement {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 text-[var(--medical-slate-blue)]",
        className
      )}
      role="status"
      aria-label={label ?? "Procesando"}
    >
      <div className="relative flex h-14 w-14 items-center justify-center">
        <span className="absolute inline-flex h-14 w-14 animate-ping rounded-full bg-sky-400/30" />
        <span className="relative flex h-12 w-12 items-center justify-center rounded-full border-2 border-[var(--medical-slate-blue)] bg-white">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-[var(--medical-slate-blue)]"
          >
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" />
          </svg>
        </span>
      </div>
      {label ? (
        <p className="text-sm font-medium">{label}</p>
      ) : null}
    </div>
  );
}

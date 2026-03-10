"use client";

import * as React from "react";

export interface StickyFooterProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  /** Si false, no usa position:fixed (para meter dentro de un wrapper fijo que tenga el FAB encima). Default true. */
  fixed?: boolean;
}

const FOOTER_CLASSES =
  "flex w-full gap-2 border-t border-slate-700 bg-slate-900/95 px-4 pt-4 backdrop-blur-md pb-[env(safe-area-inset-bottom)]";

/**
 * Barra fija inferior (position: fixed; bottom: 0). Siempre visible al final del viewport.
 * Respeta safe-area (barra de gestos iOS/Android). Backdrop para ergonomía nativa.
 * Con fixed={false} solo aplica estilos de barra (para usarse dentro de un wrapper fixed que lleve el FAB).
 */
export function StickyFooter({ children, className = "", style, fixed = true }: StickyFooterProps): React.ReactElement {
  return (
    <footer
      role="navigation"
      aria-label="Navegación del checklist"
      className={fixed ? `fixed bottom-0 left-0 right-0 z-50 ${FOOTER_CLASSES} ${className}` : `${FOOTER_CLASSES} ${className}`}
      style={{ boxShadow: fixed ? "0 -4px 12px rgba(0,0,0,0.25)" : undefined, ...style }}
    >
      {children}
    </footer>
  );
}

"use client";

import * as React from "react";

export interface StickyFooterProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Barra fija inferior (position: fixed; bottom: 0). Fuera del flujo de scroll.
 * Respeta safe-area y deja espacio para que el contenido no quede tapado.
 */
export function StickyFooter({ children, className = "", style }: StickyFooterProps): React.ReactElement {
  return (
    <footer
      role="navigation"
      aria-label="Navegación del checklist"
      className={`fixed bottom-0 left-0 right-0 z-50 flex w-full gap-2 bg-slate-900 border-t border-slate-700 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 px-4 ${className}`}
      style={{ boxShadow: "0 -4px 12px rgba(0,0,0,0.25)", ...style }}
    >
      {children}
    </footer>
  );
}

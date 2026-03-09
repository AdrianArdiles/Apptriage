"use client";

import * as React from "react";

export interface StickyFooterProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Barra fija inferior (position: fixed; bottom: 0). Fuera del flujo de scroll.
 * Fondo sólido o backdrop-blur para que el contenido que pase por detrás no tape los botones.
 */
export function StickyFooter({ children, className = "", style }: StickyFooterProps): React.ReactElement {
  return (
    <footer
      role="navigation"
      aria-label="Navegación del checklist"
      className={`fixed bottom-0 left-0 right-0 z-30 flex w-full gap-2 border-t p-2 backdrop-blur-md ${className}`}
      style={{
        backgroundColor: "rgba(30, 41, 59, 0.98)",
        borderColor: "rgba(37, 99, 235, 0.25)",
        boxShadow: "0 -4px 12px rgba(0,0,0,0.25)",
        paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))",
        ...style,
      }}
    >
      {children}
    </footer>
  );
}

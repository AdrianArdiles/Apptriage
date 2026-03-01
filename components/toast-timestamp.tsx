"use client";

import * as React from "react";

export interface ToastTimestampProps {
  message: string | null;
  onDismiss: () => void;
}

/**
 * Toast breve en la parte superior: "Evento Registrado: [Nombre] - [Hora]"
 */
export function ToastTimestamp({ message, onDismiss }: ToastTimestampProps): React.ReactElement {
  React.useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDismiss, 2500);
    return () => clearTimeout(t);
  }, [message, onDismiss]);

  if (!message) return <></>;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-4 right-4 top-4 z-[100] animate-timestamp-in rounded-xl border border-blue-500/50 bg-slate-900 px-4 py-3 text-center text-sm font-medium text-slate-100 shadow-lg"
      style={{ backgroundColor: "rgba(15, 23, 42, 0.98)", boxShadow: "0 0 24px rgba(37, 99, 235, 0.3)" }}
    >
      {message}
    </div>
  );
}

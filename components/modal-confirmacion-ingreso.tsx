"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { RegistroTriage } from "@/lib/types";

const ETIQUETAS: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: "No urgente",
  2: "Prioritario",
  3: "Urgencia",
  4: "Emergencia",
  5: "Resucitación (Inmediato)",
};

export interface ModalConfirmacionIngresoProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  registro: RegistroTriage | null;
  onConfirmar: () => void;
}

export function ModalConfirmacionIngreso({
  open,
  onOpenChange,
  registro,
  onConfirmar,
}: ModalConfirmacionIngresoProps): React.ReactElement {
  const handleConfirmar = React.useCallback(() => {
    onConfirmar();
    onOpenChange(false);
  }, [onConfirmar, onOpenChange]);

  if (!registro) return <></>;

  const nivelTexto = registro.nivel ?? ETIQUETAS[registro.nivel_gravedad];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-teal-800">
            Resumen del triaje — Confirmar ingreso
          </DialogTitle>
          <DialogDescription>
            Revise el resultado de la evaluación antes de confirmar el ingreso del paciente.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          {registro.mensaje_fallback ? (
            <Alert variant="warning" className="border-amber-300 bg-amber-50">
              <AlertTitle>Clasificación automática no disponible</AlertTitle>
              <AlertDescription>{registro.mensaje_fallback}</AlertDescription>
            </Alert>
          ) : null}
          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 space-y-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Paciente
              </p>
              <p className="mt-0.5 font-mono font-medium text-slate-800">{registro.paciente_id}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Nivel de gravedad
              </p>
              <p className="mt-0.5 font-semibold text-teal-800">
                {nivelTexto} (nivel {registro.nivel_gravedad})
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Recomendación
              </p>
              <p className="mt-0.5 text-slate-700">{registro.recomendacion}</p>
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={handleConfirmar}>
            Confirmar ingreso
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

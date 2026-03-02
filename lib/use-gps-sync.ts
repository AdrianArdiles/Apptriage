"use client";

import { useEffect, useRef } from "react";
import { Geolocation } from "@capacitor/geolocation";
import { syncUbicacionToFirebase } from "@/lib/firebase-intervenciones";

const INTERVAL_MS = 30_000;

/**
 * Obtiene la posición actual y la sincroniza con Firebase en intervenciones/[movilId]/ubicacion.
 * Solo se ejecuta en el cliente y cuando hay movilId.
 */
export function useGpsSync(movilId: string, active: boolean): void {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !movilId.trim() || !active) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const syncPosition = () => {
      Geolocation.getCurrentPosition({ enableHighAccuracy: true })
        .then((pos) => {
          const { latitude, longitude } = pos.coords;
          syncUbicacionToFirebase(movilId, latitude, longitude);
        })
        .catch((err) => {
          console.warn("[GPS] No se pudo obtener posición:", err?.message ?? err);
        });
    };

    syncPosition();
    intervalRef.current = setInterval(syncPosition, INTERVAL_MS);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [movilId, active]);
}

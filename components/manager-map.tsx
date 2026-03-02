"use client";

import * as React from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { IntervencionPayload } from "@/lib/firebase-intervenciones";

const DEFAULT_CENTER: [number, number] = [40.42, -3.7];
const DEFAULT_ZOOM = 10;

type MarkerEntry = {
  key: string;
  ubicacion: { lat: number; lng: number };
  unidadId?: string;
  operadorId?: string;
  nombre_paciente?: string;
  paciente_id?: string;
};

if (typeof window !== "undefined") {
  const iconUrl = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png";
  const iconRetinaUrl = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png";
  const shadowUrl = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png";
  const DefaultIcon = L.icon({ iconUrl, iconRetinaUrl, shadowUrl, iconSize: [25, 41], iconAnchor: [12, 41] });
  L.Marker.prototype.options.icon = DefaultIcon;
}

interface ManagerMapProps {
  entries: Array<{ key: string } & IntervencionPayload>;
  className?: string;
}

function FitBounds({ markers }: { markers: MarkerEntry[] }) {
  const map = useMap();
  const prevLen = React.useRef(0);
  React.useEffect(() => {
    if (markers.length === 0) return;
    if (markers.length !== prevLen.current) {
      prevLen.current = markers.length;
      if (markers.length === 1) {
        map.setView([markers[0].ubicacion.lat, markers[0].ubicacion.lng], 14);
      } else {
        const bounds = L.latLngBounds(markers.map((e) => [e.ubicacion.lat, e.ubicacion.lng] as L.LatLngExpression));
        map.fitBounds(bounds, { padding: [24, 24], maxZoom: 14 });
      }
    }
  }, [map, markers]);
  return null;
}

export function ManagerMap({ entries, className }: ManagerMapProps): React.ReactElement {
  const markers = React.useMemo(
    (): MarkerEntry[] =>
      entries
        .filter(
          (e) =>
            e.ubicacion &&
            typeof e.ubicacion.lat === "number" &&
            typeof e.ubicacion.lng === "number"
        )
        .map((e) => ({ key: e.key, ubicacion: e.ubicacion!, unidadId: e.unidadId, operadorId: e.operadorId, nombre_paciente: e.nombre_paciente, paciente_id: e.paciente_id })),
    [entries]
  );

  return (
    <div className={`h-full min-h-[320px] w-full ${className ?? ""}`}>
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        className="h-full min-h-[320px] w-full rounded-xl z-0"
        scrollWheelZoom
        style={{ minHeight: 320 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds markers={markers} />
        {markers.map((entry) => (
          <Marker
            key={entry.key}
            position={[entry.ubicacion.lat, entry.ubicacion.lng]}
          >
            <Popup>
              <span className="font-semibold">
                Unidad: {entry.unidadId || entry.operadorId || entry.key}
              </span>
              <br />
              <span className="text-sm text-slate-600">
                {entry.nombre_paciente || entry.paciente_id || "—"}
              </span>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

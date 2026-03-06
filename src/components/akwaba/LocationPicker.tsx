"use client";

import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const orangeIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface LocationPickerProps {
  position: { lat: number; lng: number } | null;
  onChange: (pos: { lat: number; lng: number }) => void;
}

const DEFAULT_CENTER: [number, number] = [5.3484, -4.0305]; // Abidjan

// Sous-composant pour intercepter les clics sur la carte
function MapEvents({ onChange }: { onChange: (pos: { lat: number; lng: number }) => void }) {
  useMapEvents({
    click(e) {
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

export default function LocationPicker({ position, onChange }: LocationPickerProps) {
  const center = position ? [position.lat, position.lng] : DEFAULT_CENTER;

  return (
    <div className="h-[300px] w-full rounded-xl overflow-hidden border border-slate-200 z-0 relative">
      <MapContainer center={center as [number, number]} zoom={13} className="h-full w-full">
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapEvents onChange={onChange} />
        {position && (
          <Marker position={[position.lat, position.lng]} icon={orangeIcon} />
        )}
      </MapContainer>
      
      {/* Petit guide visuel */}
      <div className="absolute top-2 right-2 z-[1000] bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-sm border border-slate-200 pointer-events-none">
        <p className="text-xs font-bold text-slate-700">📍 Cliquez sur la carte pour placer le bien</p>
      </div>
    </div>
  );
}

"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Link from "next/link";

// Icône personnalisée orange pour matcher ton branding
const orangeIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export default function MapComponent({ listings }: { listings: any[] }) {
  const center: [number, number] = listings.length > 0 
    ? [listings[0].latitude, listings[0].longitude] 
    : [5.3484, -4.0305]; // Abidjan par défaut

  return (
    <div className="h-full w-full relative">
      {/* Filtre CSS pour le Dark Mode sur les tuiles OpenStreetMap */}
      <style>{`
        .leaflet-container {
          background: #0B1120 !important;
        }
        .dark-tiles {
          filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%);
        }
      `}</style>

      <MapContainer center={center} zoom={13} className="h-full w-full z-0">
        <TileLayer
          className="dark-tiles"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {listings.map((item) => (
          <Marker key={item.id} position={[item.latitude, item.longitude]} icon={orangeIcon}>
            <Popup>
              <Link href={`/akwaba/listings/${item.id}`} className="block w-48 bg-[#0B1120] rounded-lg overflow-hidden border border-white/10">
                  <img src={item.images[0]} className="h-24 w-full object-cover" alt={item.title} />
                  <div className="p-3">
                      <p className="text-[10px] font-black text-white uppercase truncate">{item.title}</p>
                      <p className="text-xs font-bold text-orange-500 mt-1">
                          {item.pricePerNight.toLocaleString()} FCFA
                      </p>
                  </div>
              </Link>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

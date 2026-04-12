"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Link from "next/link";
import { ListingItem } from "./ListingDiscovery"; // ✅ 1. Import du typage strict

// ✅ 2. Marqueur 100% CSS (Rapide, sans image externe, aux couleurs de ta charte)
const babiMarkerIcon = new L.DivIcon({
  className: "bg-transparent",
  html: `<div class="w-auto px-3 py-1.5 bg-orange-600 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white font-black text-xs whitespace-nowrap hover:bg-orange-500 transition-colors">
            📍 Babi
         </div>`,
  iconSize: [60, 30],
  iconAnchor: [30, 30],
  popupAnchor: [0, -34],
});

interface MapComponentProps {
  listings: ListingItem[];
}

export default function MapComponent({ listings }: MapComponentProps) {
  // Sécurisation : on centre sur le premier bien qui possède de vraies coordonnées
  const validListing = listings.find(l => l.latitude != null && l.longitude != null);
  const center: [number, number] = validListing 
    ? [validListing.latitude as number, validListing.longitude as number] 
    : [5.3484, -4.0305]; // Abidjan par défaut

  return (
    <div className="h-full w-full relative">
      {/* Modification du CSS de base Leaflet pour que TON Popup s'intègre au mode sombre */}
      <style>{`
        .leaflet-popup-content-wrapper, .leaflet-popup-tip {
          background: #0B1120;
          padding: 0;
          border: 1px solid rgba(255,255,255,0.1);
        }
        .leaflet-popup-content {
          margin: 0;
          width: 192px !important; /* Force la largeur pour correspondre à ton w-48 */
        }
        a.leaflet-popup-close-button {
          color: white !important;
          padding: 4px 4px 0 0 !important;
        }
      `}</style>

      <MapContainer center={center} zoom={13} className="h-full w-full z-0 bg-[#0B1120]">
        
        {/* ✅ 3. Fond de carte natif en Dark Mode (CartoDB Dark Matter) */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        
        {listings.map((item) => {
          if (!item.latitude || !item.longitude) return null;

          return (
            <Marker key={item.id} position={[item.latitude, item.longitude]} icon={babiMarkerIcon}>
              <Popup>
                {/* 4. Conservation intacte de TON design de Popup */}
                <Link href={`/akwaba/listings/${item.id}`} className="block rounded-lg overflow-hidden">
                    <img 
                        src={item.images?.[0] || "/images/placeholder.jpg"} 
                        className="h-24 w-full object-cover" 
                        alt={item.title} 
                    />
                    <div className="p-3">
                        <p className="text-[10px] font-black text-white uppercase truncate">{item.title}</p>
                        <p className="text-xs font-bold text-orange-500 mt-1">
                            {item.pricePerNight.toLocaleString()} FCFA
                        </p>
                    </div>
                </Link>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}

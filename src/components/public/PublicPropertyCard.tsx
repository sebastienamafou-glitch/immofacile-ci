import { MapPin, Ruler } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image"; // ✅ Import Next/Image
import { Property, Lease } from "@prisma/client";

interface PublicPropertyCardProps {
  property: Property & { leases: Lease[] };
  primaryColor?: string;
}

export default function PublicPropertyCard({ property, primaryColor = "#FF7900" }: PublicPropertyCardProps) {
  const mainImage = property.images?.[0] || "/placeholder-house.jpg";
  
  // Si un bail est actif, le bien n'est pas dispo
  const isAvailable = property.leases?.length === 0;

  return (
    <div className="group bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col h-full relative">
      {!isAvailable && (
          <div className="absolute inset-0 z-20 bg-white/60 backdrop-blur-[2px] flex items-center justify-center">
              <Badge className="bg-slate-900 text-white text-lg px-6 py-2 shadow-lg">DÉJÀ LOUÉ</Badge>
          </div>
      )}

      {/* IMAGE */}
      <div className="h-48 relative overflow-hidden bg-slate-100">
        <Image 
            src={mainImage} 
            alt={property.title} 
            fill
            className="object-cover group-hover:scale-110 transition duration-700"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        <div className="absolute bottom-3 left-3 bg-slate-900 text-white px-3 py-1 rounded-lg text-sm font-bold shadow-lg z-10">
             {property.price.toLocaleString()} FCFA <span className="font-normal text-xs text-slate-300">/ mois</span>
        </div>
      </div>

      {/* BODY */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
            <div className="flex items-center justify-between mb-2">
                 <Badge variant="outline" className="text-[10px] uppercase tracking-wider">{property.type}</Badge>
                 {property.surface && <span className="text-xs text-slate-500 flex items-center gap-1"><Ruler size={12}/> {property.surface} m²</span>}
            </div>
            
            <h3 className="font-bold text-slate-900 text-lg line-clamp-2 mb-2 group-hover:text-orange-600 transition-colors">
                {property.title}
            </h3>
            
            <p className="text-sm text-slate-500 flex items-center gap-1">
                <MapPin size={14} style={{ color: primaryColor }} />
                {property.commune}
            </p>
        </div>

        <Link href={`/properties/${property.id}`} className="block mt-4">
            <Button variant="outline" className="w-full border-slate-300 hover:bg-slate-50 hover:text-slate-900 font-bold">
                Voir les détails
            </Button>
        </Link>
      </div>
    </div>
  );
}

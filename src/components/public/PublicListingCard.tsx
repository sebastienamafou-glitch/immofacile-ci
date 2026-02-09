import { MapPin, Users, Bed, Bath } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image"; // ✅ Import Next/Image
import { Listing } from "@prisma/client";

interface PublicListingCardProps {
  listing: Listing;
  primaryColor?: string; 
}

export default function PublicListingCard({ listing, primaryColor = "#FF7900" }: PublicListingCardProps) {
  // Sécurité si le tableau images est vide
  const mainImage = listing.images?.[0] || "/placeholder-house.jpg";

  return (
    <div className="group bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-xl transition-all duration-300 h-full flex flex-col">
      {/* IMAGE */}
      <div className="h-48 relative overflow-hidden bg-slate-100">
        <Image 
            src={mainImage} 
            alt={listing.title} 
            fill // Remplit le conteneur parent
            className="object-cover group-hover:scale-110 transition duration-700"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" // Optimisation Mobile
        />
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur text-slate-900 px-3 py-1 rounded-full text-xs font-bold shadow-sm z-10">
             {listing.pricePerNight.toLocaleString()} FCFA <span className="font-normal text-slate-500">/ nuit</span>
        </div>
      </div>

      {/* BODY */}
      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-center gap-1 text-slate-500 text-xs mb-2">
            <MapPin size={12} style={{ color: primaryColor }} />
            {listing.city} {listing.neighborhood && `• ${listing.neighborhood}`}
        </div>
        
        <h3 className="font-bold text-slate-900 text-lg line-clamp-1 mb-3 group-hover:text-slate-700">
            {listing.title}
        </h3>

        {/* FEATURES */}
        <div className="flex items-center gap-4 text-slate-500 text-xs mb-4">
             <span className="flex items-center gap-1"><Users size={14}/> {listing.maxGuests} pers.</span>
             <span className="flex items-center gap-1"><Bed size={14}/> {listing.bedrooms} ch.</span>
             <span className="flex items-center gap-1"><Bath size={14}/> {listing.bathrooms} sdb.</span>
        </div>

        <div className="mt-auto">
            <Link href={`/listings/${listing.id}`} className="block">
                <Button className="w-full text-white font-bold" style={{ backgroundColor: primaryColor }}>
                    Réserver maintenant
                </Button>
            </Link>
        </div>
      </div>
    </div>
  );
}

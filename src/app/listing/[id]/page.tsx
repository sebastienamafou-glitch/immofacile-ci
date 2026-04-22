import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { MapPin, Users, Bed, Bath, Star } from "lucide-react";

// ✅ 1. IMPORT DU NOUVEAU WIDGET INTERACTIF
import BookingWidget from "@/components/listing/BookingWidget";

export const dynamic = 'force-dynamic';

export default async function PublicListingPage({ params }: { params: { id: string } }) {
  // Récupération du bien (seulement s'il est publié)
  const listing = await prisma.listing.findUnique({
    where: { 
      id: params.id,
      isPublished: true 
    },
    include: {
      host: { select: { name: true, image: true } },
      agency: { select: { name: true, logoUrl: true, phone: true } },
      reviews: true
    }
  });

  if (!listing) return notFound();

  const mainImage = listing.images[0] || "https://placehold.co/1200x600/1e293b/cbd5e1?text=Akwaba";
  const secondaryImages = listing.images.slice(1, 5); 

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white border-b border-slate-200 py-4 px-6 md:px-12 flex items-center justify-between sticky top-0 z-50">
        <div className="font-black text-xl text-slate-900">BABIMMO</div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-8 pt-8 space-y-8">
        
        {/* TITRE & LOCALISATION */}
        <div>
          <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight mb-2">
            {listing.title}
          </h1>
          <div className="flex items-center gap-4 text-slate-600 font-medium">
            <span className="flex items-center gap-1"><MapPin className="w-4 h-4 text-orange-500" /> {listing.city}, {listing.neighborhood}</span>
            <span>•</span>
            <span className="flex items-center gap-1"><Star className="w-4 h-4 text-yellow-500" /> {listing.reviews.length > 0 ? "4.8" : "Nouveau"}</span>
          </div>
        </div>

        {/* GRILLE PHOTOS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 md:gap-4 rounded-3xl overflow-hidden h-[40vh] md:h-[60vh]">
          <div className="md:col-span-2 relative h-full">
             <img src={mainImage} alt="Main" className="w-full h-full object-cover hover:scale-105 transition duration-500" />
          </div>
          <div className="hidden md:grid col-span-2 grid-cols-2 gap-4 h-full">
            {secondaryImages.map((img, idx) => (
              <div key={idx} className="relative h-full">
                <img src={img} alt={`Pic ${idx}`} className="w-full h-full object-cover hover:scale-105 transition duration-500" />
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          
          {/* COLONNE GAUCHE (Détails) */}
          <div className="lg:col-span-2 space-y-10">
            <div className="flex items-center justify-between pb-6 border-b border-slate-200">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-slate-900">Logement entier géré par {listing.agency?.name || listing.host.name}</h2>
                <div className="flex items-center gap-4 text-slate-600">
                  <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {listing.maxGuests} voyageurs</span>
                  <span className="flex items-center gap-1"><Bed className="w-4 h-4" /> {listing.bedrooms} ch.</span>
                  <span className="flex items-center gap-1"><Bath className="w-4 h-4" /> {listing.bathrooms} sdb</span>
                </div>
              </div>
              <div className="w-16 h-16 rounded-full overflow-hidden bg-slate-200 border-2 border-white shadow-lg">
                {(listing.agency?.logoUrl || listing.host.image) ? (
                   <img src={listing.agency?.logoUrl || listing.host.image!} alt="Host" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-bold text-slate-500">PRO</div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-xl font-bold text-slate-900 mb-4">À propos de ce logement</h3>
              <p className="text-slate-600 leading-relaxed whitespace-pre-line text-lg">
                {listing.description}
              </p>
            </div>
          </div>

          {/* ✅ 2. COLONNE DROITE : INJECTION DU COMPOSANT CLIENT */}
          <div className="relative">
             <BookingWidget 
                listingId={listing.id} 
                pricePerNight={listing.pricePerNight} 
             />
          </div>

        </div>
      </main>
    </div>
  );
}

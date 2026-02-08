import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { MapPin, Star, Heart, Share, Wifi, Tv, Car, Coffee, Wind, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import ImageGallery from "@/components/akwaba/ImageGallery";
import BookingWidget from "@/components/akwaba/BookingWidget";

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { id: string } }) {
  const listing = await prisma.listing.findUnique({
    where: { id: params.id },
    select: { title: true, description: true }
  });
  if (!listing) return { title: "Bien introuvable" };
  return { title: `${listing.title} | Akwaba`, description: listing.description };
}

export default async function ListingPage({ params }: { params: { id: string } }) {
  
  const listing = await prisma.listing.findUnique({
    where: { id: params.id },
    include: {
      host: {
        select: { name: true, image: true, createdAt: true, isVerified: true }
      },
      reviews: {
        include: { author: { select: { name: true, image: true } } },
        orderBy: { createdAt: 'desc' },
        take: 3
      }
    }
  });

  if (!listing) return notFound();

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 pb-20 font-sans">
      
      {/* HEADER & TITRE */}
      <div className="max-w-7xl mx-auto pt-8 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-4">
            <div>
                <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-3 tracking-tight">{listing.title}</h1>
                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
                    <BadgeRating rating={4.92} count={listing.reviews.length} />
                    <span className="hidden md:inline">·</span>
                    <span className="flex items-center gap-1 text-slate-300 font-medium">
                        <MapPin className="w-4 h-4 text-orange-500" /> {listing.city}, {listing.neighborhood || "Abidjan"}
                    </span>
                </div>
            </div>
            <div className="flex gap-3">
                <Button variant="outline" size="sm" className="border-white/10 text-slate-300 hover:bg-white/10 hover:text-white gap-2 rounded-full">
                    <Share className="w-4 h-4" /> <span className="hidden sm:inline">Partager</span>
                </Button>
                <Button variant="outline" size="sm" className="border-white/10 text-slate-300 hover:bg-white/10 hover:text-white gap-2 rounded-full">
                    <Heart className="w-4 h-4" /> <span className="hidden sm:inline">Sauvegarder</span>
                </Button>
            </div>
        </div>

        <ImageGallery images={listing.images} />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 grid grid-cols-1 lg:grid-cols-3 gap-16 relative">
        
        {/* COLONNE GAUCHE */}
        <div className="lg:col-span-2 space-y-10">
            <div className="flex justify-between items-center pb-8 border-b border-white/10">
                <div className="space-y-1">
                    <h2 className="text-2xl font-bold text-white">
                        Logement entier : hébergé par {listing.host.name}
                    </h2>
                    <p className="text-slate-400 text-base">
                        {/* ✅ CORRECTION ICI : On a retiré listing.beds qui n'existe pas */}
                        {listing.maxGuests} voyageurs · {listing.bedrooms} chambres · {listing.bathrooms} salles de bain
                    </p>
                </div>
                <Avatar className="h-16 w-16 border-2 border-orange-500/50 shadow-xl shadow-orange-500/10">
                    {/* ✅ CORRECTION ICI : class 'object-cover' au lieu de la prop objectFit */}
                    <AvatarImage src={listing.host.image || ""} className="object-cover" />
                    <AvatarFallback className="bg-orange-600 text-white font-bold text-xl">
                        {listing.host.name?.charAt(0)}
                    </AvatarFallback>
                </Avatar>
            </div>

            {/* ... Reste du contenu inchangé ... */}
            <div className="space-y-6 pb-8 border-b border-white/10">
                <div className="flex gap-4 items-start">
                    <ShieldCheck className="w-7 h-7 text-orange-500 mt-0.5" />
                    <div>
                        <h3 className="font-bold text-white text-lg">Hôte vérifié Akwaba™</h3>
                        <p className="text-slate-400 leading-relaxed">L'identité et la qualité de ce logement ont été validées par nos équipes.</p>
                    </div>
                </div>
            </div>

            <div className="pb-8 border-b border-white/10">
                <h3 className="text-2xl font-bold text-white mb-6">À propos de ce logement</h3>
                <div className="text-slate-300 leading-relaxed whitespace-pre-line text-lg">
                    {listing.description}
                </div>
            </div>

            <div className="pb-8 border-b border-white/10">
                <h3 className="text-2xl font-bold text-white mb-6">Ce que propose ce logement</h3>
                <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                    <AmenityItem icon={<Wifi />} label="Wifi haut débit (Fibre)" />
                    <AmenityItem icon={<Tv />} label="Smart TV 4K avec Netflix" />
                    <AmenityItem icon={<Wind />} label="Climatisation intégrale" />
                    <AmenityItem icon={<Car />} label="Parking privé gratuit" />
                    <AmenityItem icon={<Coffee />} label="Machine Nespresso" />
                    <AmenityItem icon={<ShieldCheck />} label="Gardiennage 24h/24" />
                </div>
            </div>
        </div>

        {/* COLONNE DROITE */}
        <div className="relative w-full">
            <BookingWidget 
                listingId={listing.id}
                pricePerNight={listing.pricePerNight}
                maxGuests={listing.maxGuests}
            />
        </div>

      </div>
    </div>
  );
}

function BadgeRating({ rating, count }: { rating: number, count: number }) {
    return (
        <div className="flex items-center gap-1.5 bg-orange-500/10 text-orange-400 px-2 py-1 rounded-md font-bold">
             <Star className="w-4 h-4 fill-orange-500" />
             <span>{rating}</span>
             <span className="text-slate-500 font-medium ml-1">({count} avis)</span>
        </div>
    )
}

function AmenityItem({ icon, label }: { icon: any, label: string }) {
    return (
        <div className="flex items-center gap-4 text-slate-300 p-2 rounded-lg hover:bg-white/5 transition">
            <span className="text-orange-500">{icon}</span>
            <span className="text-lg">{label}</span>
        </div>
    );
}

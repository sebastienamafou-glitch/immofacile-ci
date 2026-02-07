import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import PublicSearchBar from "@/components/akwaba/PublicSearchBar";
import { Star, MapPin, Heart, UserCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Listing, Review } from "@prisma/client";
import { auth } from "@/auth";
import { Metadata } from "next";

export const revalidate = 60;

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const params = await searchParams;
  const location = params.city || "Côte d'Ivoire";
  return {
    title: `Séjours d'exception à ${location} | ImmoFacile Akwaba`,
    description: "Réservez les meilleures villas et studios sécurisés pour vos vacances ou voyages d'affaires."
  };
}

interface SearchPageProps {
  searchParams: Promise<{ city?: string; guests?: string; }>;
}

export default async function AkwabaPublicPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const session = await auth();

  // 1. RÉCUPÉRATION DES VILLES UNIQUES POUR L'AUTO-COMPLÉTION
  const uniqueCitiesData = await prisma.listing.findMany({
    where: { isPublished: true },
    select: { city: true },
    distinct: ['city'],
  });
  const availableCities = uniqueCitiesData.map(c => c.city);

  // FILTRAGE
  const whereClause: any = { isPublished: true };
  if (params.city) {
    whereClause.OR = [
        { city: { contains: params.city, mode: 'insensitive' } },
        { address: { contains: params.city, mode: 'insensitive' } },
        { neighborhood: { contains: params.city, mode: 'insensitive' } }
    ];
  }
  if (params.guests) {
    const guestCount = parseInt(params.guests);
    if (!isNaN(guestCount)) whereClause.maxGuests = { gte: guestCount };
  }

  let listings: (Listing & { reviews: Review[] })[] = []; 
  try {
      listings = await prisma.listing.findMany({
        where: whereClause,
        include: { reviews: true },
        orderBy: { updatedAt: 'desc' },
        take: 12 
      });
  } catch (error) {
      console.error("DB Error (Homepage):", error);
  }

  return (
    <div className="min-h-screen bg-[#0B1120] pb-20 font-sans selection:bg-orange-500/30">
      
      <nav className="fixed top-0 w-full z-50 px-6 py-4 flex justify-between items-center bg-[#0B1120]/60 backdrop-blur-md border-b border-white/5">
        <div className="text-white font-black text-2xl tracking-tighter flex items-center gap-2">
            IMMO<span className="text-orange-500 font-extrabold">FACILE</span>
            <Badge variant="outline" className="text-[10px] border-orange-500/50 text-orange-500 ml-2">AKWABA</Badge>
        </div>
        <div className="flex items-center gap-4">
            {session ? (
                <Link href="/dashboard"> 
                    <Button variant="ghost" className="text-white hover:bg-white/10 gap-2 font-bold rounded-full border border-white/10">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center">
                             <UserCircle size={16} className="text-white" />
                        </div>
                        Mon Espace
                    </Button>
                </Link>
            ) : (
                <Link href="/akwaba/login">
                    <Button className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-8 rounded-full shadow-lg shadow-orange-900/20">
                        Connexion
                    </Button>
                </Link>
            )}
        </div>
      </nav>

      {/* --- STRUCTURE CORRIGÉE : WRAPPER SANS OVERFLOW POUR LA BARRE --- */}
      <div className="relative w-full">
        
        {/* HERO CONTENT (Coins arrondis et image masquée) */}
        <div className="relative h-[700px] w-full flex flex-col items-center justify-center text-center px-4 overflow-hidden rounded-b-[4rem] shadow-2xl">
          <div className="absolute inset-0 z-0">
              <Image 
                  src="/images/akwaba-hero.jpg" 
                  alt="Afrique Luxe" 
                  fill 
                  className="object-cover scale-105" 
                  priority 
              />
              <div className="absolute inset-0 bg-gradient-to-b from-[#0B1120]/40 via-[#0B1120]/80 to-[#0B1120]"></div>
          </div>

          <div className="relative z-10 max-w-5xl mx-auto space-y-6">
              <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-full backdrop-blur-md">
                  <Sparkles size={14} className="text-orange-400" />
                  <span className="text-xs font-black text-white uppercase tracking-widest">Akwaba bienvenue en Côte d'Ivoire</span>
              </div>
              <h1 className="text-6xl md:text-9xl font-black text-white tracking-tighter leading-[0.85]">
                  Vivez <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-300">L'Exception.</span>
              </h1>
              <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto font-medium">
                  Découvrez notre sélection de résidences de prestige. <br/>
                  Sécurité, confort et authenticité garantis.
              </p>
          </div>
        </div>

        {/* --- BARRE DE RECHERCHE (Positionnée hors du overflow-hidden) --- */}
        <div className="absolute left-1/2 -translate-x-1/2 -bottom-10 w-full max-w-4xl px-4 z-30">
            <PublicSearchBar availableCities={availableCities} />
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 pt-32">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-4 border-l-4 border-orange-500 pl-6">
            <div>
                <h2 className="text-4xl font-black text-white uppercase tracking-tight">
                    {listings.length > 0 ? "Résidences Disponibles" : "Aucun résultat"}
                </h2>
                <p className="text-slate-500 font-bold mt-1 uppercase text-xs tracking-widest">
                    {params.city ? `Secteur : ${params.city}` : "Sélection Premium WebappCI"}
                </p>
            </div>
        </div>

        <Link href="/akwaba/listings">
          <Button variant="outline" className="border-orange-500 text-orange-500 rounded-full px-10 py-6 font-black uppercase text-xs tracking-widest hover:bg-orange-500 hover:text-white transition-all">
           Explorer toutes nos pépites
         </Button>
        </Link>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
            {listings.map((listing, index) => {
                const avgRating = listing.reviews.length > 0 
                    ? (listing.reviews.reduce((acc, rev) => acc + rev.rating, 0) / listing.reviews.length).toFixed(1)
                    : "Nouveau";

                return (
                    <Link key={listing.id} href={`/akwaba/listings/${listing.id}`} className="group relative">
                        <div className="relative aspect-[4/5] w-full rounded-[2.5rem] overflow-hidden bg-slate-800 mb-6 shadow-xl border border-white/5 group-hover:border-orange-500/50 transition-all duration-500">
                            {listing.images[0] && (
                                <Image 
                                    src={listing.images[0]} 
                                    alt={listing.title} 
                                    fill 
                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                                    className="object-cover group-hover:scale-110 transition-transform duration-700" 
                                    priority={index < 4} 
                                />
                            )}
                            <div className="absolute top-6 left-6">
                                <Badge className="bg-orange-500/90 text-white border-none font-black px-3 py-1 shadow-lg">
                                    {listing.city}
                                </Badge>
                            </div>
                            <button className="absolute top-6 right-6 p-3 rounded-full bg-black/20 hover:bg-red-500 text-white backdrop-blur-md transition-all">
                                <Heart className="w-5 h-5" />
                            </button>
                            <div className="absolute bottom-6 left-6 right-6 p-4 bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 translate-y-2 group-hover:translate-y-0 transition-transform">
                                <div className="flex justify-between items-center">
                                    <p className="text-white font-black text-lg">
                                        {listing.pricePerNight.toLocaleString('fr-FR')} <span className="text-[10px] text-orange-400">FCFA</span>
                                    </p>
                                    <div className="flex items-center gap-1 text-xs font-bold text-amber-400">
                                        <Star size={12} className="fill-amber-400" /> {avgRating}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="px-2 space-y-1">
                            <h3 className="font-bold text-white text-xl line-clamp-1 group-hover:text-orange-400 transition-colors uppercase tracking-tight">
                                {listing.title}
                            </h3>
                            <p className="text-slate-500 text-sm font-semibold flex items-center gap-1">
                                <MapPin size={14} /> {listing.neighborhood || listing.city}
                            </p>
                        </div>
                    </Link>
                );
            })}
        </div>
      </div>
    </div>
  );
}

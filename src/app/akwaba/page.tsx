import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import PublicSearchBar from "@/components/akwaba/PublicSearchBar";
import { Star, MapPin, Heart, UserCircle, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getServerSession } from "next-auth";
// ✅ IMPORT DES TYPES PRISMA NÉCESSAIRES
import { Listing, Review } from "@prisma/client";

export const revalidate = 60; 

interface SearchPageProps {
  searchParams: Promise<{ city?: string; guests?: string; }>;
}

export default async function AkwabaPublicPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const session = await getServerSession();

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
    if (!isNaN(guestCount)) {
        whereClause.maxGuests = { gte: guestCount };
    }
  }

  // ✅ CORRECTION TYPESCRIPT : On définit le type explicitement
  // "Un tableau de Listings qui contiennent aussi des Reviews"
  let listings: (Listing & { reviews: Review[] })[] = []; 
  
  try {
      listings = await prisma.listing.findMany({
        where: whereClause,
        include: { reviews: true },
        orderBy: { updatedAt: 'desc' },
        take: 20
      });
  } catch (error) {
      console.error("DB Error (Homepage):", error);
  }

  return (
    <div className="min-h-screen bg-[#0B1120] pb-20 font-sans">
      
      {/* NAVBAR */}
      <nav className="absolute top-0 w-full z-50 px-6 py-6 flex justify-between items-center bg-transparent">
        <div className="text-white font-black text-2xl tracking-tighter flex items-center gap-2">
            IMMO<span className="text-orange-500">FACILE</span>
        </div>
        <div className="flex gap-4">
            {session ? (
                <Link href="/dashboard"> 
                    <Button variant="ghost" className="text-white hover:bg-white/10 gap-2 font-bold rounded-full">
                        <UserCircle size={20} /> Mon Espace
                    </Button>
                </Link>
            ) : (
                <Link href="/akwaba/login">
                    <Button className="bg-white text-[#0B1120] hover:bg-slate-200 font-bold px-6 rounded-full gap-2">
                        <LogIn size={16}/> Connexion
                    </Button>
                </Link>
            )}
        </div>
      </nav>

      {/* HERO SECTION */}
      <div className="relative h-[600px] w-full bg-slate-900 flex flex-col items-center justify-center text-center px-4 overflow-hidden rounded-b-[3rem] shadow-2xl shadow-black/50">
        <div className="absolute inset-0">
            <div className="absolute inset-0 bg-slate-800 animate-pulse" /> 
            <Image 
                src="/images/akwaba-hero.jpg" 
                alt="Vacances Abidjan" 
                fill 
                className="object-cover opacity-60" 
                priority 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B1120] via-[#0B1120]/20 to-black/40"></div>
        </div>

        <div className="relative z-10 max-w-4xl mx-auto space-y-8 mt-10">
            <Badge className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-1.5 text-xs uppercase tracking-[0.25em] font-black border-none shadow-[0_0_20px_rgba(249,115,22,0.4)] animate-in fade-in slide-in-from-bottom-4 duration-700">
                Akwaba • Bienvenue
            </Badge>
            <h1 className="text-5xl md:text-8xl font-black text-white tracking-tighter leading-[0.9] drop-shadow-2xl animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-100">
                L'Afrique, <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-300">Chez Vous.</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-300 max-w-xl mx-auto drop-shadow-md font-medium leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
                Villas d'exception, studios chics et résidences sécurisées.<br/>Réservez votre prochain séjour en toute confiance.
            </p>
        </div>
        
        <div className="absolute -bottom-8 w-full max-w-4xl px-4 z-30 animate-in fade-in zoom-in-95 duration-1000 delay-300">
            <PublicSearchBar />
        </div>
      </div>

      {/* LISTINGS SECTION */}
      <div className="max-w-[1400px] mx-auto px-6 pt-28">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
                <h2 className="text-3xl font-black text-white tracking-tight">
                    {listings.length > 0 ? "Nos pépites du moment" : "Aucun résultat trouvé"}
                </h2>
                <p className="text-slate-400 font-medium mt-2 text-sm">
                    {params.city 
                        ? `${listings.length} hébergements trouvés à "${params.city}"` 
                        : "Sélection exclusive triée sur le volet."}
                </p>
            </div>
            {listings.length > 0 && (
                 <Link href="/akwaba/explore" className="text-orange-400 hover:text-orange-300 font-bold text-sm underline underline-offset-4 decoration-2">
                    Voir tout le catalogue
                 </Link>
            )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-16">
            {listings.map((listing) => (
                <Link key={listing.id} href={`/akwaba/listings/${listing.id}`} className="group block">
                    {/* IMAGE CARD */}
                    <div className="relative aspect-[4/5] w-full rounded-[2rem] overflow-hidden bg-slate-800 mb-5 shadow-2xl ring-1 ring-white/10 group-hover:ring-orange-500/50 transition-all duration-500">
                        {listing.images[0] ? (
                            <Image 
                                src={listing.images[0]} 
                                alt={listing.title} 
                                fill 
                                className="object-cover group-hover:scale-110 transition-transform duration-700 ease-out" 
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-600 bg-slate-900">
                                <span className="font-bold uppercase tracking-widest text-xs">Image manquante</span>
                            </div>
                        )}
                        
                        <div className="absolute top-4 left-4">
                             {listing.city && (
                                <Badge className="bg-black/40 backdrop-blur-md text-white border-none font-bold">
                                    {listing.city}
                                </Badge>
                             )}
                        </div>
                        <button className="absolute top-4 right-4 p-3 rounded-full bg-white/10 hover:bg-orange-500 text-white backdrop-blur-md transition-all active:scale-90">
                            <Heart className="w-5 h-5" />
                        </button>
                    </div>

                    {/* TEXTE CARD */}
                    <div className="space-y-3 px-2">
                        <div className="flex justify-between items-start gap-4">
                            <h3 className="font-bold text-white text-lg leading-tight line-clamp-1 group-hover:text-orange-400 transition-colors">
                                {listing.title}
                            </h3>
                            <div className="flex items-center gap-1.5 text-xs font-black bg-white/10 px-2 py-1 rounded-md shrink-0">
                                <Star className="w-3 h-3 text-orange-400 fill-orange-400" />
                                <span className="text-white">4.92</span>
                            </div>
                        </div>
                        
                        <p className="text-slate-500 text-sm font-medium line-clamp-1 flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-slate-600 shrink-0" /> 
                            {listing.neighborhood || listing.address || "Abidjan"}
                        </p>
                        
                        <div className="pt-2 flex items-baseline gap-1.5 border-t border-white/5 mt-2">
                            <span className="font-black text-white text-xl tracking-tight">
                                {listing.pricePerNight.toLocaleString('fr-FR')}
                            </span>
                            <span className="text-orange-500 text-xs font-bold">FCFA</span>
                            <span className="text-slate-600 text-xs font-bold uppercase tracking-wide ml-auto">/ nuit</span>
                        </div>
                    </div>
                </Link>
            ))}
        </div>
      </div>
    </div>
  );
}

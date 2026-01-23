import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import PublicSearchBar from "@/components/akwaba/PublicSearchBar";
import { Star, MapPin, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

interface SearchPageProps {
  searchParams: Promise<{
    city?: string;
    guests?: string;
  }>;
}

export default async function AkwabaPublicPage({ searchParams }: SearchPageProps) {
  
  // Await des params (Next.js 15)
  const params = await searchParams;

  // 1. FILTRAGE DB (Moteur de recherche)
  const whereClause: any = {
    isPublished: true, 
  };

  if (params.city) {
    whereClause.OR = [
        { city: { contains: params.city, mode: 'insensitive' } },
        { address: { contains: params.city, mode: 'insensitive' } },
        { neighborhood: { contains: params.city, mode: 'insensitive' } }
    ];
  }

  const listings = await prisma.listing.findMany({
    where: whereClause,
    include: { reviews: true },
    orderBy: { updatedAt: 'desc' }
  });

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      
      {/* --- HERO SECTION --- */}
      <div className="relative h-[500px] w-full bg-slate-900 flex flex-col items-center justify-center text-center px-4">
        
        {/* Wrapper Image */}
        <div className="absolute inset-0 overflow-hidden">
            {/* ✅ VOTRE IMAGE LOCALE RESTAURÉE */}
            <Image 
                src="/images/akwaba-hero.jpg" 
                alt="Abidjan Luxury Villa" 
                fill 
                className="object-cover"
                priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-black/30"></div>
        </div>

        {/* Contenu Hero */}
        <div className="relative z-10 max-w-3xl mx-auto space-y-6">
            <Badge className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-1.5 text-sm uppercase tracking-widest mb-4 border-none shadow-lg animate-in zoom-in duration-500">
                Akwaba • Bienvenue
            </Badge>
            <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-tight drop-shadow-xl">
                Trouvez votre <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-yellow-400">
                    pied-à-terre idéal
                </span>
            </h1>
            <p className="text-lg text-slate-200 max-w-xl mx-auto drop-shadow-md">
                Des villas de luxe aux studios cosy. Vivez l'expérience locale avec le confort d'un hôtel.
            </p>
        </div>

        {/* Barre de recherche */}
        <div className="absolute -bottom-8 w-full px-4 z-30">
            <PublicSearchBar />
        </div>
      </div>

      {/* --- LISTING SECTION --- */}
      <div className="max-w-7xl mx-auto px-6 pt-24">
        <div className="flex items-end justify-between mb-8">
            <div>
                <h2 className="text-2xl font-bold text-slate-900">
                    {listings.length > 0 ? "Logements à la une" : "Aucun résultat"}
                </h2>
                <p className="text-slate-500 mt-1">
                    {params.city 
                        ? `${listings.length} résultats pour "${params.city}"`
                        : "Explorez nos meilleures pépites en Côte d'Ivoire"
                    }
                </p>
            </div>
            
            <div className="hidden md:flex gap-2">
                {["Piscine", "Wifi", "Bord de mer", "Climatisé"].map(tag => (
                    <Button key={tag} variant="outline" size="sm" className="rounded-full border-slate-300 text-slate-600 hover:border-orange-500 hover:text-orange-600">
                        {tag}
                    </Button>
                ))}
            </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
            {listings.map((listing) => (
                <Link key={listing.id} href={`/akwaba/${listing.id}`} className="group block">
                    <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-slate-200 mb-3">
                        {listing.images[0] ? (
                            <img 
                                src={listing.images[0]} 
                                alt={listing.title} 
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                            />
                        ) : (
                            <div className="flex items-center justify-center h-full text-slate-400">Pas d'image</div>
                        )}
                        <button className="absolute top-3 right-3 p-2 rounded-full bg-black/10 hover:bg-white text-white hover:text-red-500 backdrop-blur-sm transition-all">
                            <Heart className="w-5 h-5" />
                        </button>
                        <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur px-2 py-1 rounded-lg text-xs font-bold text-slate-900 shadow-sm md:hidden">
                            {listing.pricePerNight.toLocaleString()} F
                        </div>
                    </div>
                    <div className="space-y-1">
                        <div className="flex justify-between items-start">
                            <h3 className="font-bold text-slate-900 truncate pr-2 group-hover:text-orange-600 transition-colors">
                                {listing.title}
                            </h3>
                            <div className="flex items-center gap-1 text-sm font-medium">
                                <Star className="w-3.5 h-3.5 text-black fill-black" />
                                <span>4.9</span>
                            </div>
                        </div>
                        <p className="text-slate-500 text-sm truncate flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {listing.city}
                        </p>
                        <div className="flex items-baseline gap-1 pt-1">
                            <span className="font-bold text-slate-900 text-lg">
                                {listing.pricePerNight.toLocaleString()} FCFA
                            </span>
                            <span className="text-slate-500 text-sm"> par nuit</span>
                        </div>
                    </div>
                </Link>
            ))}
        </div>

        {listings.length === 0 && (
            <div className="text-center py-20">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
                    <MapPin className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Aucun logement trouvé</h3>
                <p className="text-slate-500 max-w-sm mx-auto mt-2">
                    Essayez de modifier vos filtres ou cherchez une autre ville.
                </p>
                
                {/* ✅ CORRECTION : Utilisation de Link au lieu de onClick */}
                <Link href="/akwaba">
                    <Button className="mt-6 bg-orange-600 text-white hover:bg-orange-700">
                        Voir toutes les annonces
                    </Button>
                </Link>
            </div>
        )}
      </div>
    </div>
  );
}

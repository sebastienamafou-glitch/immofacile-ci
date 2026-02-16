import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import PublicSearchBar from "@/components/akwaba/PublicSearchBar";
import { Star, MapPin, Heart, UserCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { auth } from "@/auth";
import { Metadata } from "next";
import { searchListings } from "@/actions/listings"; // ✅ On utilise l'action centralisée

export const revalidate = 60;

interface SearchPageProps {
  searchParams: Promise<{ city?: string; guests?: string; q?: string }>;
}

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const params = await searchParams;
  const location = params.city || "Côte d'Ivoire";
  return {
    title: `Séjours d'exception à ${location} | ImmoFacile Akwaba`,
    description: "Réservez les meilleures villas et studios sécurisés pour vos vacances ou voyages d'affaires."
  };
}

export default async function AkwabaPublicPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const session = await auth();

  // 1. RÉCUPÉRATION DES VILLES UNIQUES (Pour l'auto-complétion uniquement)
  const uniqueCitiesData = await prisma.listing.findMany({
    where: { isPublished: true },
    select: { city: true },
    distinct: ['city'],
  });
  const availableCities = uniqueCitiesData.map(c => c.city);

  // 2. RÉCUPÉRATION DES ANNONCES VIA SERVER ACTION
  // On priorise la recherche "q", sinon la ville
  const query = params.q || params.city || "";
  
  // Cette action nous renvoie les listings AVEC l'état "isFavorite" correct pour l'utilisateur connecté
  const { listings } = await searchListings(query);

  return (
    <div className="min-h-screen bg-[#0B1120] pb-20 font-sans selection:bg-orange-500/30">
      
      {/* NAVBAR */}
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
                <Link href="/login">
                    <Button className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-8 rounded-full shadow-lg shadow-orange-900/20">
                        Connexion
                    </Button>
                </Link>
            )}
        </div>
      </nav>

      {/* HERO SECTION */}
      <div className="relative w-full">
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

        {/* BARRE DE RECHERCHE FLOTTANTE */}
        <div className="absolute left-1/2 -translate-x-1/2 -bottom-10 w-full max-w-4xl px-4 z-30">
            <PublicSearchBar availableCities={availableCities} />
        </div>
      </div>

      {/* SECTION LISTING */}
      <div className="max-w-[1400px] mx-auto px-6 pt-32">
        
        {/* EN-TÊTE SECTION */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-4 border-l-4 border-orange-500 pl-6">
            <div>
                <h2 className="text-4xl font-black text-white uppercase tracking-tight">
                    {listings && listings.length > 0 ? "Résidences Disponibles" : "Aucun résultat"}
                </h2>
                <p className="text-slate-500 font-bold mt-1 uppercase text-xs tracking-widest">
                    {params.city ? `Secteur : ${params.city}` : "Sélection Premium WebappCI"}
                </p>
            </div>
            
            <Link href="/akwaba/listings">
                <Button variant="outline" className="border-orange-500 text-orange-500 rounded-full px-10 py-6 font-black uppercase text-xs tracking-widest hover:bg-orange-500 hover:text-white transition-all">
                    Explorer toutes nos pépites
                </Button>
            </Link>
        </div>

        {/* GRILLE DES CARTES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
            {listings?.map((listing) => (
                <div key={listing.id} className="group relative">
                    {/* Lien vers la page détail (corrigé) */}
                    <Link href={`/akwaba/${listing.id}`}>
                        <div className="relative aspect-[4/5] w-full rounded-[2.5rem] overflow-hidden bg-slate-800 mb-6 shadow-xl border border-white/5 group-hover:border-orange-500/50 transition-all duration-500">
                            {listing.image ? (
                                <Image 
                                    src={listing.image} 
                                    alt={listing.title} 
                                    fill 
                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                                    className="object-cover group-hover:scale-110 transition-transform duration-700" 
                                />
                            ) : (
                                <div className="w-full h-full bg-slate-900 flex items-center justify-center text-slate-700">Image manquante</div>
                            )}
                            
                            {/* Badge Localisation */}
                            <div className="absolute top-6 left-6">
                                <Badge className="bg-orange-500/90 text-white border-none font-black px-3 py-1 shadow-lg">
                                    {listing.location.split(',')[0]}
                                </Badge>
                            </div>

                            {/* PRIX & NOTE */}
                            <div className="absolute bottom-6 left-6 right-6 p-4 bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 translate-y-2 group-hover:translate-y-0 transition-transform">
                                <div className="flex justify-between items-center">
                                    <p className="text-white font-black text-lg">
                                        {listing.price.toLocaleString('fr-FR')} <span className="text-[10px] text-orange-400">FCFA</span>
                                    </p>
                                    <div className="flex items-center gap-1 text-xs font-bold text-amber-400">
                                        <Star size={12} className="fill-amber-400" /> {listing.rating || "Nouveau"}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Link>

                    {/* INFOS TEXTE & COEUR */}
                    <div className="px-2 space-y-1 relative">
                        <Link href={`/akwaba/${listing.id}`}>
                            <h3 className="font-bold text-white text-xl line-clamp-1 group-hover:text-orange-400 transition-colors uppercase tracking-tight">
                                {listing.title}
                            </h3>
                            <p className="text-slate-500 text-sm font-semibold flex items-center gap-1">
                                <MapPin size={14} /> {listing.location}
                            </p>
                        </Link>

                        {/* COEUR VISUEL (Indicateur uniquement ici, l'action se fait sur la page détail) */}
                        <div className="absolute -top-[360px] right-6 z-20 pointer-events-none">
                            <div className={`p-3 rounded-full backdrop-blur-md transition-all ${listing.isFavorite ? 'bg-white text-red-500 shadow-red-500/20 shadow-lg' : 'bg-black/20 text-white'}`}>
                                <Heart className={`w-5 h-5 ${listing.isFavorite ? 'fill-current' : ''}`} />
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>

      </div>
    </div>
  );
}

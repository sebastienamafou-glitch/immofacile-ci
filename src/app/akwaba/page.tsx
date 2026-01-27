import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma"; //
import PublicSearchBar from "@/components/akwaba/PublicSearchBar";
import { Star, MapPin, Heart, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getServerSession } from "next-auth";

export const dynamic = "force-dynamic";

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

  const listings = await prisma.listing.findMany({
    where: whereClause,
    include: { reviews: true },
    orderBy: { updatedAt: 'desc' }
  });

  return (
    <div className="min-h-screen bg-[#0B1120] pb-20">
      <nav className="absolute top-0 w-full z-50 px-6 py-4 flex justify-between items-center bg-transparent">
        <div className="text-white font-black text-xl tracking-tighter">IMMOFACILE</div>
        <div className="flex gap-4">
            {session ? (
                <Link href="/dashboard/guest">
                    <Button variant="ghost" className="text-white hover:bg-white/10 gap-2 font-bold">
                        <UserCircle size={18} /> Mon Profil
                    </Button>
                </Link>
            ) : (
                <Link href="/akwaba/login">
                    <Button variant="outline" className="text-white border-white/20 bg-white/10 backdrop-blur-md font-bold px-6">
                        Connexion
                    </Button>
                </Link>
            )}
        </div>
      </nav>

      <div className="relative h-[550px] w-full bg-slate-900 flex flex-col items-center justify-center text-center px-4">
        <div className="absolute inset-0 overflow-hidden">
            <Image src="/images/akwaba-hero.jpg" alt="Hero" fill className="object-cover opacity-60" priority />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B1120] via-transparent to-black/30"></div>
        </div>

        <div className="relative z-10 max-w-3xl mx-auto space-y-6">
            <Badge className="bg-orange-500 text-white px-4 py-1.5 text-xs uppercase tracking-[0.2em] font-black border-none shadow-2xl">
                Akwaba • Côte d'Ivoire
            </Badge>
            <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight leading-[0.9] drop-shadow-2xl">
                L'Afrique, <br/> <span className="text-orange-400">Chez Vous.</span>
            </h1>
            <p className="text-lg text-slate-300 max-w-xl mx-auto drop-shadow-md font-medium">
                Découvrez des séjours authentiques. Villas de luxe ou studios urbains, votre confort est notre mission.
            </p>
        </div>
        <div className="absolute -bottom-8 w-full px-4 z-30">
            <PublicSearchBar />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-24">
        <div className="flex items-end justify-between mb-12">
            <div>
                <h2 className="text-3xl font-black text-white tracking-tight">
                    {listings.length > 0 ? "Nos pépites locales" : "Recherche infructueuse"}
                </h2>
                <p className="text-slate-400 font-medium mt-1">
                    {params.city ? `${listings.length} résidences à "${params.city}"` : "Sélectionnées pour leur charme et confort."}
                </p>
            </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-12">
            {listings.map((listing) => (
                <Link key={listing.id} href={`/akwaba/${listing.id}`} className="group block">
                    <div className="relative aspect-[4/5] w-full rounded-[2rem] overflow-hidden bg-slate-800 mb-4 shadow-xl ring-1 ring-white/5">
                        {listing.images[0] ? (
                            <Image src={listing.images[0]} alt={listing.title} fill className="object-cover group-hover:scale-110 transition-transform duration-1000" />
                        ) : (
                            <div className="flex items-center justify-center h-full text-slate-600 font-bold uppercase tracking-widest text-xs">Akwaba Residence</div>
                        )}
                        <button className="absolute top-4 right-4 p-3 rounded-full bg-black/20 hover:bg-orange-500 text-white backdrop-blur-md transition-all">
                            <Heart className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between items-start px-1">
                            <h3 className="font-bold text-white text-lg truncate group-hover:text-orange-400 transition-colors">
                                {listing.title}
                            </h3>
                            <div className="flex items-center gap-1.5 text-sm font-bold bg-white/5 px-2 py-1 rounded-lg">
                                <Star className="w-3.5 h-3.5 text-orange-400 fill-orange-400" />
                                <span className="text-white">4.9</span>
                            </div>
                        </div>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider px-1 flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-orange-500" /> {listing.city}
                        </p>
                        <div className="flex items-baseline gap-1 pt-2 px-1">
                            <span className="font-black text-white text-xl">
                                {listing.pricePerNight.toLocaleString()} <span className="text-xs text-orange-500">FCFA</span>
                            </span>
                            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest"> / nuit</span>
                        </div>
                    </div>
                </Link>
            ))}
        </div>
      </div>
    </div>
  );
}

import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { 
  Plus, 
  MapPin, 
  Calendar, 
  Eye, 
  EyeOff, 
  TrendingUp,
  BedDouble
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function AkwabaDashboardPage() {
  // 1. AUTHENTIFICATION
  const headersList = headers();
  const userEmail = headersList.get("x-user-email");
  
  if (!userEmail) redirect("/login");

  const owner = await prisma.user.findUnique({
    where: { email: userEmail },
    select: { id: true, name: true }
  });

  if (!owner) redirect("/login");

  // 2. RÉCUPÉRATION DES ANNONCES "COURTE DURÉE"
  const listings = await prisma.listing.findMany({
    where: {
      hostId: owner.id,
    },
    include: {
      bookings: {
        where: {
            // On compte les réservations futures ou en cours
            endDate: { gte: new Date() },
            status: { in: ['CONFIRMED', 'PAID'] }
        }
      },
      property: {
        select: { title: true } // Si lié à un bien long terme
      }
    },
    orderBy: { updatedAt: 'desc' }
  });

  return (
    <div className="space-y-8 p-8 max-w-7xl mx-auto pb-24">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            Espace <span className="text-orange-500">AKWABA</span>
          </h1>
          <p className="text-slate-400 mt-2">
            Gérez vos locations saisonnières, disponibilités et tarifs.
          </p>
        </div>
        <Link href="/dashboard/owner/akwaba/create">
          <Button className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-6 py-6 rounded-xl shadow-lg shadow-orange-500/20">
            <Plus className="w-5 h-5 mr-2" />
            Créer une annonce
          </Button>
        </Link>
      </div>

      {/* STATS BANDEAU (Optionnel pour plus tard) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-white/10 p-6 rounded-2xl">
            <div className="text-slate-400 text-sm font-medium mb-1">Annonces actives</div>
            <div className="text-3xl font-bold text-white">
                {listings.filter(l => l.isPublished).length}
            </div>
        </div>
        <div className="bg-slate-900 border border-white/10 p-6 rounded-2xl">
            <div className="text-slate-400 text-sm font-medium mb-1">Réservations à venir</div>
            <div className="text-3xl font-bold text-blue-400">
                {listings.reduce((acc, curr) => acc + curr.bookings.length, 0)}
            </div>
        </div>
        <div className="bg-gradient-to-br from-orange-600/20 to-orange-900/20 border border-orange-500/20 p-6 rounded-2xl">
            <div className="text-orange-400 text-sm font-medium mb-1">Revenus ce mois</div>
            <div className="text-3xl font-bold text-orange-500">
                0 FCFA
            </div>
            <p className="text-xs text-slate-500 mt-1">Donnée simulée (Module Finance à venir)</p>
        </div>
      </div>

      {/* LISTE DES ANNONCES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Empty State */}
        {listings.length === 0 && (
            <div className="col-span-full py-16 flex flex-col items-center justify-center text-center border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/50">
                <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6">
                    <BedDouble className="w-10 h-10 text-slate-600" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Aucune annonce Akwaba</h3>
                <p className="text-slate-400 max-w-md mb-8">
                    Boostez vos revenus en louant vos biens en court séjour. Créez votre première annonce en moins de 5 minutes.
                </p>
                <Link href="/dashboard/owner/akwaba/create">
                    <Button variant="outline" className="border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white">
                        Commencer maintenant
                    </Button>
                </Link>
            </div>
        )}

        {/* Listing Cards */}
        {listings.map((listing) => (
          <Link 
            key={listing.id} 
            href={`/dashboard/owner/akwaba/${listing.id}`}
            className="group relative bg-slate-900 border border-white/10 rounded-2xl overflow-hidden hover:border-orange-500/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
          >
            {/* Image Cover */}
            <div className="relative h-56 w-full bg-slate-800">
                {listing.images && listing.images.length > 0 ? (
                    <Image 
                        src={listing.images[0]} 
                        alt={listing.title} 
                        fill 
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                ) : (
                    <div className="flex items-center justify-center h-full text-slate-600">
                        <Image src="/logo.png" width={40} height={40} className="opacity-20 grayscale" alt="No image" />
                    </div>
                )}
                
                {/* Badge Statut */}
                <div className="absolute top-3 left-3">
                    {listing.isPublished ? (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/50 backdrop-blur-md">
                            <Eye className="w-3 h-3 mr-1" /> En ligne
                        </Badge>
                    ) : (
                        <Badge className="bg-slate-900/80 text-slate-400 border-slate-700 backdrop-blur-md">
                            <EyeOff className="w-3 h-3 mr-1" /> Brouillon
                        </Badge>
                    )}
                </div>

                {/* Badge Prix */}
                <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-md text-white px-3 py-1 rounded-lg text-sm font-bold border border-white/10">
                    {listing.pricePerNight.toLocaleString('fr-FR')} FCFA <span className="text-xs font-normal text-slate-300">/nuit</span>
                </div>
            </div>

            {/* Content */}
            <div className="p-5">
                <h3 className="text-lg font-bold text-white mb-1 truncate">{listing.title}</h3>
                <div className="flex items-center text-slate-400 text-sm mb-4">
                    <MapPin className="w-4 h-4 mr-1 text-orange-500" />
                    {listing.city}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <div className="flex items-center text-sm text-slate-300">
                        <Calendar className="w-4 h-4 mr-2 text-blue-400" />
                        {listing.bookings.length > 0 ? (
                            <span className="font-bold text-white">{listing.bookings.length} résa. à venir</span>
                        ) : (
                            <span className="opacity-50">Aucune résa.</span>
                        )}
                    </div>
                    
                    {/* Indicateur de performance (Fake pour le moment) */}
                    <div className="flex items-center text-xs font-bold text-green-400 bg-green-500/10 px-2 py-1 rounded">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        100%
                    </div>
                </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

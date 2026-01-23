import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Palmtree, MapPin, Eye, Calendar, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const dynamic = 'force-dynamic';

export default async function OwnerListingsPage() {
  const userEmail = headers().get("x-user-email");
  if (!userEmail) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { email: userEmail },
  });

  if (!user || user.role !== "OWNER") redirect("/dashboard");

  const listings = await prisma.listing.findMany({
    where: { hostId: user.id },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { bookings: true } } }
  });

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h1 className="text-3xl font-black text-white flex items-center gap-3">
                 <Palmtree className="text-emerald-500" /> Mes Annonces Akwaba
            </h1>
            <p className="text-slate-400 mt-1">
                Gérez vos locations saisonnières (Airbnb-style).
            </p>
        </div>
        {/* On peut ajouter un bouton pour créer une annonce de zéro plus tard */}
      </div>

      {listings.length === 0 ? (
         <div className="text-center py-20 bg-slate-900/50 border border-slate-800 rounded-3xl border-dashed">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Palmtree className="text-emerald-500 w-8 h-8" />
            </div>
            <h3 className="text-white font-bold text-lg">Aucune annonce courte durée</h3>
            <p className="text-slate-500 max-w-md mx-auto mt-2">
                Vous n'avez pas encore publié d'annonce sur Akwaba. 
                Allez dans "Mes Propriétés" et cliquez sur "Publier sur Akwaba" pour transformer un bien existant.
            </p>
            <Link href="/dashboard/owner/properties">
                <Button className="mt-6 bg-slate-800 hover:bg-slate-700 text-white">
                    Aller à mes propriétés
                </Button>
            </Link>
         </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map(listing => (
                <div key={listing.id} className="group bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-emerald-500/50 transition duration-300">
                    <div className="h-48 relative bg-slate-800">
                        {listing.images[0] && (
                            <img src={listing.images[0]} alt={listing.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                        )}
                        <div className="absolute top-3 right-3">
                             <Badge className="bg-emerald-600 text-white border-none shadow-lg">
                                {listing.pricePerNight.toLocaleString()} F / nuit
                             </Badge>
                        </div>
                    </div>
                    
                    <div className="p-5">
                        <h3 className="text-lg font-bold text-white truncate mb-1">{listing.title}</h3>
                        <p className="text-xs text-slate-400 flex items-center gap-1 mb-4">
                            <MapPin size={12} /> {listing.city}
                        </p>

                        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                            <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                                <Calendar size={12} /> {listing._count.bookings} Réservations
                            </span>
                            <Link href={`/akwaba/${listing.id}`} target="_blank">
                                <Button size="sm" variant="ghost" className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10">
                                    <Eye className="w-4 h-4 mr-2" /> Voir
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            ))}
        </div>
      )}
    </div>
  );
}

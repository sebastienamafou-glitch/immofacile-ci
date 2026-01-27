"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import Link from "next/link";
import { Palmtree, MapPin, Eye, Calendar, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Listing } from "@prisma/client";
import { toast } from "sonner";

// Type étendu pour inclure le count des réservations
type ListingWithCount = Listing & {
    _count: { bookings: number };
};

export default function OwnerListingsPage() {
  const router = useRouter();
  const [listings, setListings] = useState<ListingWithCount[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. CHARGEMENT SÉCURISÉ (Zero Trust)
  useEffect(() => {
    const fetchListings = async () => {
        try {
            // ✅ APPEL API (Auth via Cookie)
            const res = await api.get('/owner/listings');
            
            if (res.data.success) {
                setListings(res.data.listings);
            }
        } catch (error: any) {
            console.error("Erreur chargement annonces", error);
            if (error.response?.status === 401) {
                router.push('/login');
            } else {
                toast.error("Impossible de charger vos annonces Akwaba.");
            }
        } finally {
            setLoading(false);
        }
    };
    fetchListings();
  }, [router]);

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#0B1120] gap-4">
        <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
        <p className="text-slate-500 font-mono text-sm">Synchronisation Akwaba...</p>
    </div>
  );

  return (
    <div className="p-6 lg:p-10 bg-[#0B1120] min-h-screen text-white pb-20">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
            <h1 className="text-3xl font-black text-white flex items-center gap-3">
                 <Palmtree className="text-emerald-500 w-8 h-8" /> Mes Annonces Akwaba
            </h1>
            <p className="text-slate-400 mt-1 text-sm">
                Gérez vos locations saisonnières et courte durée.
            </p>
        </div>
        
        {/* Note: La création se fait depuis "Mes Propriétés" pour l'instant */}
        <Link href="/dashboard/owner/properties">
            <Button className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20">
                <Plus className="w-4 h-4 mr-2" /> Transformer un bien
            </Button>
        </Link>
      </div>

      {/* GRILLE D'ANNONCES */}
      {listings.length === 0 ? (
         /* EMPTY STATE */
         <div className="flex flex-col items-center justify-center py-20 bg-slate-900/50 border border-slate-800 rounded-3xl border-dashed">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6 border border-emerald-500/20">
                <Palmtree className="text-emerald-500 w-10 h-10" />
            </div>
            <h3 className="text-white font-bold text-xl mb-2">Aucune annonce active</h3>
            <p className="text-slate-500 max-w-md text-center text-sm mb-8">
                Vous n'avez pas encore publié d'annonce sur le réseau Akwaba. 
                Sélectionnez une de vos propriétés existantes pour commencer à louer à la nuitée.
            </p>
            <Link href="/dashboard/owner/properties">
                <Button variant="outline" className="border-slate-700 text-emerald-400 hover:bg-slate-800 hover:text-white">
                    Aller à mes propriétés
                </Button>
            </Link>
         </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map(listing => (
                <div key={listing.id} className="group bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-emerald-500/50 transition duration-300 shadow-xl hover:shadow-2xl hover:shadow-emerald-500/10 flex flex-col">
                    
                    {/* IMAGE COVER */}
                    <div className="h-48 relative bg-slate-800 overflow-hidden">
                        {listing.images && listing.images[0] ? (
                            <img src={listing.images[0]} alt={listing.title} className="w-full h-full object-cover group-hover:scale-110 transition duration-700" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-600">
                                <Palmtree size={32} />
                            </div>
                        )}
                        <div className="absolute top-3 right-3">
                             <Badge className="bg-emerald-600 text-white border-none shadow-lg font-bold text-xs backdrop-blur-md bg-opacity-90">
                                {listing.pricePerNight.toLocaleString()} F <span className="font-normal opacity-80 ml-1">/ nuit</span>
                             </Badge>
                        </div>
                        {listing.isPublished && (
                            <div className="absolute bottom-3 left-3">
                                <Badge variant="outline" className="bg-black/50 text-white border-white/20 backdrop-blur-sm text-[10px] uppercase font-bold tracking-widest">
                                    En Ligne
                                </Badge>
                            </div>
                        )}
                    </div>
                    
                    {/* DETAILS */}
                    <div className="p-5 flex flex-col flex-1">
                        <h3 className="text-lg font-bold text-white truncate mb-1 group-hover:text-emerald-400 transition">{listing.title}</h3>
                        <p className="text-xs text-slate-400 flex items-center gap-1 mb-4 font-medium">
                            <MapPin size={12} className="text-emerald-500" /> {listing.city}
                        </p>

                        <div className="mt-auto pt-4 border-t border-slate-800 flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-500 flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                                <Calendar size={12} className="text-emerald-500"/> 
                                {listing._count?.bookings || 0} Réservations
                            </span>
                            
                            {/* Lien externe vers la page publique de l'annonce */}
                            <Link href={`/akwaba/${listing.id}`} target="_blank" className="flex items-center gap-1 text-emerald-400 text-xs font-bold hover:underline">
                                <Eye className="w-3 h-3" /> Voir
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

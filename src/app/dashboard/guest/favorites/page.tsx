import Link from "next/link";
import Image from "next/image";
import { auth } from "@/auth"; // ✅ On utilise l'auth officielle
import { prisma } from "@/lib/prisma";
import { Heart, MapPin, Star, ArrowRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function GuestFavoritesPage() {
  // 1. Récupération sécurisée de la session
  const session = await auth();
  const userEmail = session?.user?.email;

  // Sécurité : Si pas connecté, on redirige au lieu de faire planter Prisma
  if (!userEmail) {
    redirect("/login?callbackUrl=/dashboard/guest/favorites");
  }

  // 2. Requête Base de données
  const user = await prisma.user.findUnique({ 
    where: { email: userEmail }, // ✅ Ici userEmail est garanti d'être un string
    include: { 
        wishlists: {
            include: {
                listing: {
                    include: { reviews: { select: { rating: true } } }
                }
            }
        }
    }
  });

  if (!user) return null;

  const favorites = user.wishlists;

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen">
       <div className="flex items-center justify-between mb-8">
            <div>
                <h1 className="text-3xl font-black text-white flex items-center gap-3">
                    <Heart className="w-8 h-8 text-red-500 fill-red-500" /> Mes Favoris
                </h1>
                <p className="text-slate-400 mt-2">
                    {favorites.length} logement{favorites.length > 1 ? 's' : ''} sauvegardé{favorites.length > 1 ? 's' : ''}
                </p>
            </div>
       </div>

       {favorites.length === 0 ? (
           <div className="text-center py-32 bg-slate-900/30 rounded-3xl border border-dashed border-slate-800">
               <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                   <Heart className="w-8 h-8 text-slate-600" />
               </div>
               <h3 className="text-white font-bold text-xl mb-2">Votre liste est vide</h3>
               <p className="text-slate-500 mb-8 max-w-md mx-auto">
                 Explorez nos logements et cliquez sur le cœur pour les retrouver ici.
               </p>
               <Link href="/dashboard/guest" className="px-8 py-4 bg-white text-black font-bold rounded-xl hover:bg-slate-200 transition">
                  Explorer Akwaba
               </Link>
           </div>
       ) : (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {favorites.map((fav) => (
                   <div key={fav.id} className="group bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-orange-500/50 transition-all duration-300 relative">
                        {/* Image */}
                        <div className="h-56 bg-slate-800 relative">
                            {fav.listing.images[0] ? (
                                <Image src={fav.listing.images[0]} alt={fav.listing.title} fill className="object-cover group-hover:scale-105 transition duration-500" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-600">No Image</div>
                            )}
                            <div className="absolute top-3 right-3">
                                {/* Bouton Supprimer (Simulé pour l'instant) */}
                                <button className="p-2 bg-black/50 backdrop-blur rounded-full text-white hover:bg-red-500 transition">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Contenu */}
                        <div className="p-5">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-white text-lg leading-tight truncate pr-4">{fav.listing.title}</h3>
                                <div className="flex items-center gap-1 text-xs font-bold text-slate-300 bg-slate-800 px-2 py-1 rounded">
                                    <Star className="w-3 h-3 text-orange-500 fill-orange-500" /> 
                                    {fav.listing.reviews.length > 0 ? "4.9" : "New"}
                                </div>
                            </div>
                            
                            <p className="text-slate-500 text-sm flex items-center gap-1 mb-4">
                                <MapPin className="w-3 h-3" /> {fav.listing.city}
                            </p>

                            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                                <div>
                                    <span className="text-lg font-black text-white">{fav.listing.pricePerNight.toLocaleString()} F</span>
                                    <span className="text-slate-500 text-xs"> / nuit</span>
                                </div>
                                <Link href={`/akwaba/${fav.listing.id}`}>
                                    <Button size="sm" className="bg-white/10 text-white hover:bg-white/20">
                                        Voir <ArrowRight className="w-4 h-4 ml-1" />
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

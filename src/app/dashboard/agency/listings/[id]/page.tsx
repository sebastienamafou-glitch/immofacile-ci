import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { 
  ArrowLeft, Edit, MapPin, Users, Bed, Bath, 
  Palmtree, Calendar, CreditCard
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const dynamic = 'force-dynamic';

export default async function AgencyListingManagePage({ params }: { params: { id: string } }) {
  // 1. VÉRIFICATION DE SÉCURITÉ
  const session = await auth();
  if (!session?.user?.id) return redirect("/auth/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { agencyId: true }
  });

  if (!user?.agencyId) return redirect("/dashboard");

  // 2. RÉCUPÉRATION DU BIEN SAISONNIER (ISOLÉ POUR L'AGENCE)
  const listing = await prisma.listing.findUnique({
    where: {
      id: params.id,
      agencyId: user.agencyId, 
    },
    include: {
      host: { select: { name: true, image: true, email: true, phone: true } },
      bookings: {
        orderBy: { startDate: 'desc' },
        take: 5, // Affiche les 5 dernières réservations
        include: { guest: { select: { name: true } } }
      }
    }
  });

  // 3. PAGE 404 SI LE BIEN N'EXISTE PAS OU N'APPARTIENT PAS À L'AGENCE
  if (!listing) {
    return notFound();
  }

  const mainImage = listing.images[0] || "https://placehold.co/1200x400/1e293b/cbd5e1?text=Akwaba";

  return (
    <div className="space-y-6 p-6 pb-20 max-w-6xl mx-auto">
      {/* BOUTON RETOUR */}
      <Link href="/dashboard/agency/listings" className="inline-flex items-center text-slate-400 hover:text-white transition text-sm font-medium">
        <ArrowLeft className="w-4 h-4 mr-2" /> Retour aux annonces
      </Link>

      {/* HEADER VISUEL */}
      <div className="relative h-64 md:h-80 w-full rounded-3xl overflow-hidden shadow-2xl border border-slate-800">
        <img 
          src={mainImage} 
          alt={listing.title} 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B1120] via-[#0B1120]/60 to-transparent"></div>
        
        <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end">
          <div>
            <div className="flex items-center gap-3 mb-2">
              {listing.isPublished ? (
                <Badge className="bg-emerald-500 text-white border-none shadow-lg">EN LIGNE</Badge>
              ) : (
                <Badge variant="secondary" className="bg-slate-200 text-slate-900 shadow-lg">BROUILLON</Badge>
              )}
              <span className="text-emerald-400 font-bold text-xl bg-emerald-950/50 px-3 py-1 rounded-lg backdrop-blur-md border border-emerald-500/20">
                {listing.pricePerNight.toLocaleString()} FCFA / nuit
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white line-clamp-1">{listing.title}</h1>
            <p className="text-slate-300 flex items-center gap-2 mt-2">
              <MapPin className="w-4 h-4 text-orange-500" />
              {listing.address}, {listing.city} {listing.neighborhood && `(${listing.neighborhood})`}
            </p>
          </div>

          <Link href={`/dashboard/agency/listings/${listing.id}/edit`}>
            <Button className="bg-orange-600 hover:bg-orange-700 text-white hidden md:flex">
              <Edit className="w-4 h-4 mr-2" /> Modifier l&apos;annonce
            </Button>
          </Link>
        </div>
      </div>

      {/* CONTENU PRINCIPAL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLONNE GAUCHE : DÉTAILS */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl space-y-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Palmtree className="text-orange-500 w-5 h-5" /> Caractéristiques
            </h2>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-[#0B1120] p-4 rounded-xl border border-slate-800 text-center">
                <Users className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                <p className="text-lg font-bold text-white">{listing.maxGuests}</p>
                <p className="text-xs text-slate-500">Voyageurs</p>
              </div>
              <div className="bg-[#0B1120] p-4 rounded-xl border border-slate-800 text-center">
                <Bed className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                <p className="text-lg font-bold text-white">{listing.bedrooms}</p>
                <p className="text-xs text-slate-500">Chambres</p>
              </div>
              <div className="bg-[#0B1120] p-4 rounded-xl border border-slate-800 text-center">
                <Bath className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                <p className="text-lg font-bold text-white">{listing.bathrooms}</p>
                <p className="text-xs text-slate-500">Salles de bain</p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800">
              <h3 className="text-sm font-bold text-slate-400 uppercase mb-3">Description</h3>
              <p className="text-slate-300 leading-relaxed whitespace-pre-line">
                {listing.description}
              </p>
            </div>
          </div>
        </div>

        {/* COLONNE DROITE : RÉSERVATIONS & PROPRIÉTAIRE */}
        <div className="space-y-6">
          {/* PROPRIÉTAIRE */}
          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
            <h2 className="text-sm font-bold text-slate-400 uppercase mb-4">Propriétaire du bien</h2>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-slate-800 overflow-hidden">
                {listing.host.image ? (
                  <img src={listing.host.image} alt={listing.host.name || "Propriétaire"} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold">
                    {listing.host.name?.charAt(0) || "?"}
                  </div>
                )}
              </div>
              <div>
                <p className="text-white font-bold">{listing.host.name || "Non renseigné"}</p>
                <p className="text-xs text-slate-500">{listing.host.phone || "Pas de téléphone"}</p>
              </div>
            </div>
          </div>

          {/* DERNIÈRES RÉSERVATIONS */}
          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
            <h2 className="text-sm font-bold text-slate-400 uppercase mb-4 flex items-center justify-between">
              Dernières Réservations
              <Badge variant="outline" className="border-slate-700 text-slate-300">{listing.bookings.length}</Badge>
            </h2>
            
            <div className="space-y-4">
              {listing.bookings.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">Aucune réservation pour le moment.</p>
              ) : (
                listing.bookings.map((booking) => (
                  <div key={booking.id} className="bg-[#0B1120] p-3 rounded-xl border border-slate-800">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-sm font-bold text-white line-clamp-1">{booking.guest.name}</p>
                      <span className="text-xs font-bold text-emerald-500">{booking.totalPrice.toLocaleString()} F</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Calendar className="w-3 h-3" />
                      {new Date(booking.startDate).toLocaleDateString()} - {new Date(booking.endDate).toLocaleDateString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

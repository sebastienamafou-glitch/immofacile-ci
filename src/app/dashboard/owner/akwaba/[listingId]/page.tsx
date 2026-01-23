import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { 
  ArrowLeft, MapPin, Settings, Share2, Ban, User 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import BookingCalendar from "@/components/akwaba/BookingCalendar";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { listingId: string };
}

export default async function ListingDetailsPage({ params }: PageProps) {
  // 1. SÉCURITÉ
  const headersList = headers();
  const userEmail = headersList.get("x-user-email");
  if (!userEmail) redirect("/login");

  const owner = await prisma.user.findUnique({ where: { email: userEmail } });
  if (!owner) redirect("/login");

  // 2. DATA FETCHING (Optimisé)
  const listing = await prisma.listing.findUnique({
    where: { id: params.listingId, hostId: owner.id },
    include: {
      bookings: {
        where: { 
            status: { in: ["CONFIRMED", "PAID"] },
            endDate: { gte: new Date() } // On charge le futur + un peu de passé récent si besoin
        },
        orderBy: { startDate: 'asc' },
        include: { guest: { select: { name: true, image: true } } }
      }
    }
  });

  if (!listing) return notFound();

  // 3. CALCUL DES STATISTIQUES RÉELLES (Mois en cours)
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const daysInMonth = endOfMonth.getDate();

  // Récupérer toutes les résas du mois (payées uniquement pour le revenu)
  const monthBookings = await prisma.booking.findMany({
    where: {
        listingId: listing.id,
        status: { in: ['PAID', 'CONFIRMED'] },
        startDate: { lte: endOfMonth },
        endDate: { gte: startOfMonth }
    }
  });

  let occupiedDays = 0;
  let monthlyRevenue = 0;

  monthBookings.forEach(booking => {
    // Calcul jours occupés (en gérant les débordements de mois)
    const start = booking.startDate < startOfMonth ? startOfMonth : booking.startDate;
    const end = booking.endDate > endOfMonth ? endOfMonth : booking.endDate;
    const duration = Math.max(0, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    occupiedDays += duration;

    // Calcul revenu (Uniquement si payé et pas un blocage proprio à 0F)
    if (booking.totalPrice > 0) {
        // On pourrait proratiser, mais pour l'instant on compte tout
        monthlyRevenue += booking.totalPrice; 
    }
  });

  const occupancyRate = Math.round((occupiedDays / daysInMonth) * 100);

  // 4. PRÉPARATION DONNÉES CLIENT
  const calendarBookings = listing.bookings.map(b => ({
    id: b.id,
    startDate: b.startDate,
    endDate: b.endDate,
    status: b.status,
    guestName: b.totalPrice === 0 ? "Bloqué (Vous)" : (b.guest.name || "Client"),
    isBlock: b.totalPrice === 0
  }));

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8 pb-24">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <Link href="/dashboard/owner/akwaba">
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                <ArrowLeft className="w-6 h-6" />
            </Button>
        </Link>
        <div className="flex-1">
            <div className="flex items-center gap-3">
                <h1 className="text-2xl font-black text-white truncate max-w-lg">{listing.title}</h1>
                <Badge variant="outline" className={listing.isPublished ? "text-green-400 border-green-500/50" : "text-slate-500"}>
                    {listing.isPublished ? "En Ligne" : "Brouillon"}
                </Badge>
            </div>
            <p className="text-slate-400 text-sm flex items-center gap-1 mt-1">
                <MapPin className="w-3 h-3" /> {listing.address}, {listing.city}
            </p>
        </div>
        
        <div className="flex gap-2">
            <Link href={`/properties/public/${listing.id}`} target="_blank">
                <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800 hidden md:flex">
                    <Share2 className="w-4 h-4 mr-2" /> Voir l'annonce
                </Button>
            </Link>
            <Link href={`/dashboard/owner/akwaba/${params.listingId}/settings`}>
            <Button className="bg-orange-600 hover:bg-orange-500 text-white cursor-pointer">
                <Settings className="w-4 h-4 mr-2" /> Configurer
            </Button>
            </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* CALENDRIER INTERACTIF */}
        <div className="lg:col-span-2">
            <BookingCalendar 
                listingId={listing.id}
                bookings={calendarBookings} 
                pricePerNight={listing.pricePerNight} 
            />
        </div>

        {/* COLONNE STATS & PHOTOS */}
        <div className="space-y-6">
            
            {/* PHOTO */}
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl group">
                {listing.images[0] ? (
                    <Image src={listing.images[0]} alt="Cover" fill className="object-cover group-hover:scale-105 transition-transform duration-700" />
                ) : (
                    <div className="bg-slate-800 w-full h-full flex items-center justify-center text-slate-500">Sans image</div>
                )}
            </div>

            {/* PERFORMANCE RÉELLE */}
            <div className="bg-slate-900 border border-white/10 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Performance ce mois</h3>
                
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <span className="text-slate-300">Taux d'occupation</span>
                        <span className={`font-bold ${occupancyRate > 50 ? 'text-green-400' : 'text-white'}`}>{occupancyRate}%</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div 
                            className="bg-orange-500 h-full transition-all duration-1000" 
                            style={{ width: `${occupancyRate}%` }} 
                        />
                    </div>
                    
                    <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                        <span className="text-slate-300">Revenu estimé</span>
                        <span className="text-2xl font-bold text-white">{monthlyRevenue.toLocaleString()} F</span>
                    </div>
                </div>
            </div>

            {/* PROCHAINES ARRIVÉES */}
            <div className="bg-slate-900 border border-white/10 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">À venir</h3>
                
                {calendarBookings.length === 0 ? (
                    <p className="text-slate-500 text-sm italic">Aucune réservation future.</p>
                ) : (
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {calendarBookings.map(b => (
                            <div key={b.id} className="flex items-center gap-3 p-3 bg-black/20 rounded-xl border border-white/5">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${b.isBlock ? 'bg-slate-700 text-slate-400' : 'bg-orange-500/20 text-orange-500'}`}>
                                    {b.isBlock ? <Ban className="w-5 h-5" /> : <User className="w-5 h-5" />}
                                </div>
                                <div>
                                    <div className="text-white font-bold text-sm">{b.guestName}</div>
                                    <div className="text-slate-400 text-xs">
                                        {new Date(b.startDate).toLocaleDateString('fr-FR', {day: 'numeric', month: 'short'})} - {new Date(b.endDate).toLocaleDateString('fr-FR', {day: 'numeric', month: 'short'})}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>

      </div>
    </div>
  );
}

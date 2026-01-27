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
  // 1. SÉCURITÉ ZERO TRUST (Server Side)
  // On récupère l'ID injecté par le middleware
  const headersList = headers();
  const userId = headersList.get("x-user-id");
  
  if (!userId) redirect("/login");

  // 2. DATA FETCHING BLINDÉ
  // On cherche le listing correspondant à cet ID ET appartenant à l'utilisateur
  const listing = await prisma.listing.findUnique({
    where: { 
        id: params.listingId, 
        hostId: userId // 🔒 Verrouillage direct
    },
    include: {
      bookings: {
        where: { 
            status: { in: ["CONFIRMED", "PAID"] },
            // On charge un peu de passé pour l'historique récent + futur
            startDate: { gte: new Date(new Date().setMonth(new Date().getMonth() - 1)) }
        },
        orderBy: { startDate: 'asc' },
        include: { guest: { select: { name: true, image: true } } }
      }
    }
  });

  if (!listing) return notFound();

  // 3. STATISTIQUES (KPIs du mois)
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const daysInMonth = endOfMonth.getDate();

  // Requête optimisée pour les stats
  const monthBookings = await prisma.booking.findMany({
    where: {
        listingId: listing.id,
        status: { in: ['PAID', 'CONFIRMED'] },
        OR: [
            { startDate: { lte: endOfMonth }, endDate: { gte: startOfMonth } } // Chevauchement mois
        ]
    }
  });

  let occupiedDays = 0;
  let monthlyRevenue = 0;

  monthBookings.forEach(booking => {
    const start = booking.startDate < startOfMonth ? startOfMonth : booking.startDate;
    const end = booking.endDate > endOfMonth ? endOfMonth : booking.endDate;
    
    // Durée en jours (ms -> jours)
    const duration = Math.max(0, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    occupiedDays += duration;

    if (booking.totalPrice > 0) {
        // Revenu simple (non proratisé pour l'instant)
        monthlyRevenue += booking.totalPrice; 
    }
  });

  const occupancyRate = Math.round((occupiedDays / daysInMonth) * 100);

  // 4. FORMATAGE CALENDRIER
  const calendarBookings = listing.bookings.map(b => ({
    id: b.id,
    startDate: b.startDate,
    endDate: b.endDate,
    status: b.status,
    guestName: b.totalPrice === 0 ? "Bloqué (Vous)" : (b.guest.name || "Client"),
    isBlock: b.totalPrice === 0
  }));

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8 pb-24 bg-[#0B1120] min-h-screen text-slate-200">
      
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
                <Badge variant="outline" className={listing.isPublished ? "text-emerald-400 border-emerald-500/50 bg-emerald-500/10" : "text-slate-500 border-slate-700 bg-slate-800"}>
                    {listing.isPublished ? "En Ligne" : "Brouillon"}
                </Badge>
            </div>
            <p className="text-slate-400 text-sm flex items-center gap-1 mt-1">
                <MapPin className="w-3 h-3 text-orange-500" /> {listing.address}, {listing.city}
            </p>
        </div>
        
        <div className="flex gap-3">
            <Link href={`/properties/public/${listing.id}`} target="_blank">
                <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white hidden md:flex h-10 rounded-xl">
                    <Share2 className="w-4 h-4 mr-2" /> Voir l'annonce
                </Button>
            </Link>
            <Link href={`/dashboard/owner/akwaba/${params.listingId}/settings`}>
                <Button className="bg-orange-600 hover:bg-orange-500 text-white font-bold h-10 rounded-xl shadow-lg shadow-orange-600/20">
                    <Settings className="w-4 h-4 mr-2" /> Configurer
                </Button>
            </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* CALENDRIER INTERACTIF (Client Component) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <BookingCalendar 
                listingId={listing.id}
                bookings={calendarBookings} 
                pricePerNight={listing.pricePerNight} 
            />
        </div>

        {/* COLONNE DROITE */}
        <div className="space-y-6">
            
            {/* COVER IMAGE */}
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-slate-700 shadow-2xl group">
                {listing.images[0] ? (
                    <Image src={listing.images[0]} alt="Cover" fill className="object-cover group-hover:scale-105 transition-transform duration-700" />
                ) : (
                    <div className="bg-slate-800 w-full h-full flex items-center justify-center text-slate-500 font-bold uppercase tracking-widest text-xs">Aucune image</div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
            </div>

            {/* PERFORMANCE */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Performance du mois</h3>
                
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <span className="text-slate-400 text-sm font-bold">Taux d'occupation</span>
                        <span className={`font-black ${occupancyRate > 50 ? 'text-emerald-400' : 'text-white'}`}>{occupancyRate}%</span>
                    </div>
                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                        <div 
                            className={`h-full transition-all duration-1000 ${occupancyRate > 50 ? 'bg-emerald-500' : 'bg-orange-500'}`}
                            style={{ width: `${occupancyRate}%` }} 
                        />
                    </div>
                    
                    <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
                        <span className="text-slate-400 text-sm font-bold">Revenu estimé</span>
                        <span className="text-2xl font-black text-white tracking-tight">{monthlyRevenue.toLocaleString()} <span className="text-sm text-orange-500">F</span></span>
                    </div>
                </div>
            </div>

            {/* ARRIVÉES */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Prochains Clients</h3>
                
                {calendarBookings.filter(b => new Date(b.endDate) >= new Date()).length === 0 ? (
                    <div className="text-center py-4">
                        <p className="text-slate-600 text-sm font-medium italic">Calendrier vide.</p>
                    </div>
                ) : (
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {calendarBookings
                            .filter(b => new Date(b.endDate) >= new Date()) // Futur uniquement
                            .slice(0, 5) // Top 5
                            .map(b => (
                            <div key={b.id} className="flex items-center gap-3 p-3 bg-slate-950/50 rounded-xl border border-slate-800/50 hover:border-slate-700 transition">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-inner ${b.isBlock ? 'bg-slate-800 text-slate-500' : 'bg-orange-500/10 text-orange-500 border border-orange-500/20'}`}>
                                    {b.isBlock ? <Ban className="w-4 h-4" /> : <User className="w-4 h-4" />}
                                </div>
                                <div className="min-w-0">
                                    <div className="text-white font-bold text-sm truncate">{b.guestName}</div>
                                    <div className="text-slate-500 text-[10px] font-mono font-medium">
                                        {new Date(b.startDate).toLocaleDateString('fr-FR', {day: 'numeric', month: 'short'})} ➔ {new Date(b.endDate).toLocaleDateString('fr-FR', {day: 'numeric', month: 'short'})}
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

"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  Loader2, Calendar, MapPin, CheckCircle2, 
  XCircle, Clock, User, Phone, BadgeCheck, Filter
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

// --- TYPES ---
type BookingStatus = 'PENDING' | 'PAID' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'DISPUTED';

interface Booking {
  id: string;
  startDate: string;
  endDate: string;
  totalPrice: number;
  status: BookingStatus;
  guest: {
    name: string;
    email: string;
    image?: string;
    phone?: string;
    kycStatus: string;
  };
  listing: {
    title: string;
    address: string;
    images: string[];
  };
  payment?: {
    hostPayout: number;
  };
}

export default function BookingsPage() {
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'UPCOMING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'>('ALL');
  const [stats, setStats] = useState({ upcoming: 0, active: 0, completed: 0, revenue: 0 });

  // 1. FETCH DATA
  useEffect(() => {
    async function fetchBookings() {
      try {
        const res = await fetch('/api/owner/akwaba/bookings');
        const data = await res.json();
        if (data.success) {
            setBookings(data.bookings);
            setStats(data.stats);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    fetchBookings();
  }, []);

  // 2. FILTRAGE
  const filteredBookings = bookings.filter(b => {
    const now = new Date();
    const start = new Date(b.startDate);
    const end = new Date(b.endDate);
    const isValid = ['CONFIRMED', 'PAID'].includes(b.status);

    if (filter === 'ALL') return true;
    if (filter === 'CANCELLED') return b.status === 'CANCELLED' || b.status === 'DISPUTED';
    
    // Logique temporelle pour les statuts valides
    if (filter === 'UPCOMING') return isValid && start > now;
    if (filter === 'ACTIVE') return isValid && start <= now && end >= now;
    if (filter === 'COMPLETED') return b.status === 'COMPLETED' || (isValid && end < now);
    
    return true;
  });

  // --- HELPER RENDU ---
  const getStatusBadge = (status: string, start: string, end: string) => {
     const now = new Date();
     const startDate = new Date(start);
     const endDate = new Date(end);

     if (status === 'CANCELLED') return <Badge variant="destructive" className="bg-red-500/10 text-red-500 hover:bg-red-500/20">Annulé</Badge>;
     if (status === 'PENDING') return <Badge variant="outline" className="text-yellow-500 border-yellow-500">En attente</Badge>;
     
     if (['CONFIRMED', 'PAID'].includes(status)) {
         if (now > endDate) return <Badge className="bg-slate-700 text-slate-300">Terminé</Badge>;
         if (now >= startDate && now <= endDate) return <Badge className="bg-green-500 animate-pulse text-white">En cours</Badge>;
         return <Badge className="bg-blue-600 text-white">Confirmé</Badge>;
     }
     
     return <Badge variant="outline">{status}</Badge>;
  };

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-orange-500 w-8 h-8" /></div>;

  return (
    <div className="max-w-6xl mx-auto p-6 pb-24 font-sans">
        
        {/* HEADER & STATS */}
        <div className="mb-8">
            <h1 className="text-3xl font-black text-white mb-2">📅 Réservations</h1>
            <p className="text-slate-400">Gérez vos arrivées et départs.</p>
        </div>

        {/* STATS CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-slate-900 border border-white/5 p-4 rounded-xl">
                <p className="text-slate-500 text-xs font-bold uppercase">À venir</p>
                <p className="text-2xl font-black text-white">{stats.upcoming}</p>
            </div>
            <div className="bg-slate-900 border border-white/5 p-4 rounded-xl">
                <p className="text-slate-500 text-xs font-bold uppercase">En cours</p>
                <p className="text-2xl font-black text-green-500">{stats.active}</p>
            </div>
            <div className="bg-slate-900 border border-white/5 p-4 rounded-xl">
                <p className="text-slate-500 text-xs font-bold uppercase">Total Gagné</p>
                <p className="text-2xl font-black text-orange-500">{(stats.revenue).toLocaleString()} <span className="text-xs text-white">F</span></p>
            </div>
             <div className="bg-slate-900 border border-white/5 p-4 rounded-xl">
                <p className="text-slate-500 text-xs font-bold uppercase">Total Séjours</p>
                <p className="text-2xl font-black text-white">{bookings.length}</p>
            </div>
        </div>

        {/* FILTRES (TABS) */}
        <div className="flex overflow-x-auto gap-2 mb-6 pb-2 border-b border-white/5">
            {[
                { key: 'ALL', label: 'Toutes' },
                { key: 'UPCOMING', label: 'À venir' },
                { key: 'ACTIVE', label: 'En cours' },
                { key: 'COMPLETED', label: 'Terminées' },
                { key: 'CANCELLED', label: 'Annulées' },
            ].map((tab) => (
                <button
                    key={tab.key}
                    onClick={() => setFilter(tab.key as any)}
                    className={`
                        px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition
                        ${filter === tab.key 
                            ? 'bg-orange-500 text-black' 
                            : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                        }
                    `}
                >
                    {tab.label}
                </button>
            ))}
        </div>

        {/* LISTE DES RÉSERVATIONS */}
        <div className="space-y-4">
            {filteredBookings.length === 0 ? (
                <div className="text-center py-12 bg-slate-900/50 rounded-2xl border border-dashed border-slate-800">
                    <Calendar className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">Aucune réservation dans cette catégorie.</p>
                </div>
            ) : (
                filteredBookings.map((booking) => (
                    <div key={booking.id} className="bg-slate-900 border border-white/5 rounded-2xl p-4 md:p-6 flex flex-col md:flex-row gap-6 hover:border-orange-500/30 transition group">
                        
                        {/* 1. INFO LOGEMENT (Image + Titre) */}
                        <div className="flex gap-4 md:w-1/3">
                            <div className="relative w-20 h-20 md:w-24 md:h-24 bg-slate-800 rounded-xl overflow-hidden shrink-0">
                                {booking.listing.images[0] && (
                                    <Image 
                                        src={booking.listing.images[0]} 
                                        alt="Logement" 
                                        fill 
                                        className="object-cover"
                                    />
                                )}
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-sm line-clamp-2 mb-1 group-hover:text-orange-400 transition">
                                    {booking.listing.title}
                                </h3>
                                <div className="flex items-center gap-1 text-slate-500 text-xs">
                                    <MapPin size={12} /> {booking.listing.address}
                                </div>
                                <div className="mt-2">
                                     {getStatusBadge(booking.status, booking.startDate, booking.endDate)}
                                </div>
                            </div>
                        </div>

                        {/* 2. DATES & VOYAGEUR */}
                        <div className="flex-1 grid grid-cols-2 gap-4 border-t md:border-t-0 md:border-l border-white/5 pt-4 md:pt-0 md:pl-6">
                            
                            {/* Dates */}
                            <div>
                                <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Dates du séjour</p>
                                <div className="flex flex-col gap-1">
                                    <span className="text-white text-sm font-medium flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                        {format(new Date(booking.startDate), 'dd MMM yyyy', { locale: fr })}
                                    </span>
                                    <span className="text-slate-500 text-xs ml-4">
                                        au {format(new Date(booking.endDate), 'dd MMM yyyy', { locale: fr })}
                                    </span>
                                </div>
                            </div>

                            {/* Voyageur */}
                            <div>
                                <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Voyageur</p>
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white overflow-hidden">
                                        {booking.guest.image ? (
                                            <Image src={booking.guest.image} alt={booking.guest.name} width={32} height={32} />
                                        ) : booking.guest.name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white flex items-center gap-1">
                                            {booking.guest.name}
                                            {booking.guest.kycStatus === 'VERIFIED' && (
                                                <BadgeCheck className="w-3 h-3 text-blue-400" />
                                            )}
                                        </p>
                                        <p className="text-xs text-slate-500">{booking.guest.phone || 'Non renseigné'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 3. PRIX & ACTION */}
                        <div className="md:w-1/5 flex flex-row md:flex-col justify-between items-end md:items-end border-t md:border-t-0 md:border-l border-white/5 pt-4 md:pt-0 md:pl-6">
                            <div className="text-right">
                                <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Gain Net</p>
                                <p className="text-xl font-black text-emerald-500">
                                    {booking.payment?.hostPayout?.toLocaleString() || 0} F
                                </p>
                                <p className="text-[10px] text-slate-600">
                                    (Com. déduite)
                                </p>
                            </div>

                             {/* Bouton Détail (Futur) */}
                             {booking.guest.phone && (
                                <a href={`tel:${booking.guest.phone}`} className="md:w-full mt-2">
                                    <button className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition">
                                        <Phone size={14} /> Appeler
                                    </button>
                                </a>
                             )}
                        </div>

                    </div>
                ))
            )}
        </div>
    </div>
  );
}

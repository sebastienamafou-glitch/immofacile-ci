"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  Loader2, Calendar, MapPin, CheckCircle2, 
  XCircle, Clock, User, Phone, BadgeCheck, Filter,
  TrendingUp, ArrowRight
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

// --- TYPES ---
type BookingStatus = 'PENDING' | 'PAID' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'DISPUTED' | 'CHECKED_IN';

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
    id: string;
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
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'UPCOMING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'>('ALL');
  const [stats, setStats] = useState({ upcoming: 0, active: 0, completed: 0, revenue: 0 });

  // 1. FETCH DATA
  const fetchData = async () => {
    try {
      const res = await fetch('/api/owner/akwaba/bookings');
      const data = await res.json();
      if (data.success) {
        setBookings(data.bookings);
        setStats(data.stats);
      }
    } catch (error) {
      toast.error("Erreur lors du chargement des réservations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 2. ACTIONS CONCIERGERIE
  const handleAction = async (bookingId: string, action: 'CHECK_IN' | 'CHECK_OUT') => {
    setActionLoading(bookingId);
    try {
        const res = await fetch("/api/owner/akwaba/bookings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bookingId, action })
        });
        const data = await res.json();
        
        if (data.success) {
            toast.success(data.message);
            await fetchData(); // Refresh stats and list
        } else {
            toast.error(data.error);
        }
    } catch (error) {
        toast.error("Erreur technique lors de l'action");
    } finally {
        setActionLoading(null);
    }
  };

  // 3. LOGIQUE DE FILTRAGE
  const filteredBookings = bookings.filter(b => {
    const start = new Date(b.startDate);
    const end = new Date(b.endDate);
    const now = new Date();

    if (filter === 'UPCOMING') return start > now && b.status !== 'CANCELLED';
    if (filter === 'ACTIVE') return start <= now && end >= now && b.status !== 'CANCELLED';
    if (filter === 'COMPLETED') return b.status === 'COMPLETED' || (end < now && b.status !== 'CANCELLED');
    if (filter === 'CANCELLED') return b.status === 'CANCELLED';
    return true;
  });

  const getStatusBadge = (status: string, start: string, end: string) => {
    const now = new Date();
    const startDate = new Date(start);
    const endDate = new Date(end);

    if (status === 'CANCELLED') return <Badge className="bg-red-500/10 text-red-500 border-none px-3">Annulé</Badge>;
    if (status === 'COMPLETED') return <Badge className="bg-blue-500/10 text-blue-500 border-none px-3">Terminé</Badge>;
    if (status === 'CHECKED_IN') return <Badge className="bg-indigo-500/10 text-indigo-500 border-none px-3 animate-pulse">En séjour</Badge>;
    
    if (now >= startDate && now <= endDate) {
      return <Badge className="bg-emerald-500/10 text-emerald-500 border-none px-3 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" /> En cours
      </Badge>;
    }
    
    if (startDate > now) return <Badge className="bg-orange-500/10 text-orange-500 border-none px-3">À venir</Badge>;
    return <Badge className="bg-slate-500/10 text-slate-500 border-none px-3">{status}</Badge>;
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 pb-20">
        
        {/* HEADER & STATS */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
                <h1 className="text-4xl font-black text-white tracking-tight">Réservations</h1>
                <p className="text-slate-400 mt-1">Gérez vos locataires et le flux de vos revenus.</p>
            </div>
            
            <div className="grid grid-cols-2 md:flex gap-4">
                <div className="bg-slate-900 border border-white/5 p-4 rounded-2xl min-w-[140px]">
                    <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">À venir</p>
                    <p className="text-2xl font-black text-white">{stats.upcoming}</p>
                </div>
                <div className="bg-slate-900 border border-white/5 p-4 rounded-2xl min-w-[140px]">
                    <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">En cours</p>
                    <p className="text-2xl font-black text-emerald-500">{stats.active}</p>
                </div>
                <div className="bg-slate-900 border border-white/5 p-4 rounded-2xl min-w-[140px] hidden md:block">
                    <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Revenus</p>
                    <p className="text-2xl font-black text-white">{stats.revenue.toLocaleString()} F</p>
                </div>
            </div>
        </div>

        {/* FILTRES */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
            <button onClick={() => setFilter('ALL')} className={`px-5 py-2 rounded-full text-xs font-bold transition whitespace-nowrap ${filter === 'ALL' ? 'bg-orange-600 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}>Toutes</button>
            <button onClick={() => setFilter('UPCOMING')} className={`px-5 py-2 rounded-full text-xs font-bold transition whitespace-nowrap ${filter === 'UPCOMING' ? 'bg-orange-600 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}>À venir</button>
            <button onClick={() => setFilter('ACTIVE')} className={`px-5 py-2 rounded-full text-xs font-bold transition whitespace-nowrap ${filter === 'ACTIVE' ? 'bg-orange-600 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}>En cours</button>
            <button onClick={() => setFilter('COMPLETED')} className={`px-5 py-2 rounded-full text-xs font-bold transition whitespace-nowrap ${filter === 'COMPLETED' ? 'bg-orange-600 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}>Terminées</button>
        </div>

        {/* LISTING */}
        <div className="space-y-4">
            {loading ? (
                <div className="flex flex-col items-center py-20">
                    <Loader2 className="w-10 h-10 text-orange-500 animate-spin mb-4" />
                    <p className="text-slate-500 font-medium">Synchronisation des réservations...</p>
                </div>
            ) : filteredBookings.length === 0 ? (
                <div className="bg-slate-900/50 border-2 border-dashed border-white/5 rounded-[2rem] py-20 text-center">
                    <p className="text-slate-500">Aucune réservation ne correspond à ce filtre.</p>
                </div>
            ) : (
                filteredBookings.map((booking) => (
                    <div key={booking.id} className="bg-slate-900 border border-white/5 rounded-[2rem] p-5 md:p-6 flex flex-col md:flex-row gap-6 transition hover:border-white/10 group">
                        
                        {/* 1. LOGEMENT & DATES */}
                        <div className="md:w-1/3 flex gap-4">
                            <div className="relative w-24 h-24 shrink-0 rounded-2xl overflow-hidden bg-slate-800">
                                <Image 
                                    src={booking.listing.images[0] || "https://placehold.co/400x400/0f172a/white?text=No+Image"} 
                                    alt="Listing" 
                                    fill 
                                    className="object-cover" 
                                />
                            </div>
                            <div className="flex flex-col justify-center">
                                <h3 className="text-white font-bold text-lg line-clamp-1 group-hover:text-orange-500 transition">{booking.listing.title}</h3>
                                <p className="text-slate-500 text-xs flex items-center gap-1 mb-2">
                                    <MapPin size={12} /> {booking.listing.address}
                                </p>
                                <div className="flex items-center gap-3">
                                    <div className="text-center">
                                        <p className="text-[10px] text-slate-500 font-bold uppercase leading-tight">Arrivée</p>
                                        <p className="text-white font-black text-sm">{format(new Date(booking.startDate), 'dd MMM', { locale: fr })}</p>
                                    </div>
                                    <ArrowRight size={14} className="text-slate-700" />
                                    <div className="text-center">
                                        <p className="text-[10px] text-slate-500 font-bold uppercase leading-tight">Départ</p>
                                        <p className="text-white font-black text-sm">{format(new Date(booking.endDate), 'dd MMM', { locale: fr })}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2. LOCATAIRE */}
                        <div className="md:w-1/4 flex items-center gap-4 border-t md:border-t-0 md:border-l border-white/5 pt-4 md:pt-0 md:pl-6">
                            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 overflow-hidden shrink-0 border border-white/5">
                                {booking.guest.image ? <Image src={booking.guest.image} alt={booking.guest.name} width={48} height={48} /> : <User size={20} />}
                            </div>
                            <div className="overflow-hidden">
                                <div className="flex items-center gap-2">
                                    <p className="text-white font-bold text-sm truncate">{booking.guest.name}</p>
                                    {booking.guest.kycStatus === 'VERIFIED' && <BadgeCheck size={14} className="text-blue-500" />}
                                </div>
                                <p className="text-slate-500 text-xs truncate">{booking.guest.email}</p>
                                <div className="mt-1">
                                    {getStatusBadge(booking.status, booking.startDate, booking.endDate)}
                                </div>
                            </div>
                        </div>

                        {/* 3. PRIX & ACTIONS CONCIERGERIE */}
                        <div className="md:w-1/4 flex flex-col justify-between border-t md:border-t-0 md:border-l border-white/5 pt-4 md:pt-0 md:pl-6">
                            <div>
                                <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Gain Net</p>
                                <p className="text-xl font-black text-emerald-500">
                                    {booking.payment?.hostPayout?.toLocaleString() || 0} F
                                </p>
                            </div>

                            <div className="mt-4 flex flex-col gap-2">
                                {/* ACTION CHECK-IN */}
                                {['CONFIRMED', 'PAID'].includes(booking.status) && new Date() >= new Date(new Date(booking.startDate).setHours(0,0,0,0)) && (
                                    <button 
                                        onClick={() => handleAction(booking.id, 'CHECK_IN')}
                                        disabled={actionLoading === booking.id}
                                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition disabled:opacity-50 shadow-lg shadow-emerald-500/10"
                                    >
                                        {actionLoading === booking.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} 
                                        Valider Check-in
                                    </button>
                                )}

                                {/* ACTION CHECK-OUT */}
                                {booking.status === 'CHECKED_IN' && (
                                    <button 
                                        onClick={() => handleAction(booking.id, 'CHECK_OUT')}
                                        disabled={actionLoading === booking.id}
                                        className="w-full bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition disabled:opacity-50 shadow-lg shadow-orange-500/10"
                                    >
                                        {actionLoading === booking.id ? <Loader2 size={14} className="animate-spin" /> : <Clock size={14} />} 
                                        Valider Check-out
                                    </button>
                                )}

                                {/* CONTACT */}
                                {booking.guest.phone && (
                                    <a href={`tel:${booking.guest.phone}`} className="block">
                                        <button className="w-full bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition border border-white/5">
                                            <Phone size={14} /> Appeler
                                        </button>
                                    </a>
                                )}
                            </div>
                        </div>

                    </div>
                ))
            )}
        </div>
    </div>
  );
}

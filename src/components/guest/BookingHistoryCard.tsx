"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { MapPin, Calendar, CreditCard, ChevronRight, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { BookingStatus } from "@prisma/client"; 
import ReviewModal from "@/components/guest/ReviewModal"; // ✅ Import du composant de notation

// Définition du type basé sur la requête Prisma
interface BookingHistoryCardProps {
  booking: {
    id: string;
    startDate: Date;
    endDate: Date;
    totalPrice: number;
    status: BookingStatus;
    listing: {
      id: string;
      title: string;
      city: string;
      images: string[];
      address: string;
    };
    payment?: {
        status: string;
    } | null;
  };
}

// Helper pour les couleurs de badge
const getStatusConfig = (status: string) => {
  switch (status) {
    case "CONFIRMED":
    case "PAID":
    case "CHECKED_IN":
      return { label: "Confirmé", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", icon: CheckCircle2 };
    case "PENDING":
      return { label: "En attente", color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20", icon: Clock };
    case "COMPLETED":
      return { label: "Terminé", color: "bg-slate-500/10 text-slate-400 border-slate-500/20", icon: CheckCircle2 };
    case "CANCELLED":
      return { label: "Annulé", color: "bg-red-500/10 text-red-500 border-red-500/20", icon: XCircle };
    default:
      return { label: status, color: "bg-slate-500/10 text-slate-500 border-slate-500/20", icon: Clock };
  }
};

export default function BookingHistoryCard({ booking }: BookingHistoryCardProps) {
  const statusConfig = getStatusConfig(booking.status);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="group bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 transition-all flex flex-col md:flex-row gap-6 items-start md:items-center">
      
      {/* IMAGE */}
      <div className="w-full md:w-48 h-32 flex-shrink-0 rounded-xl overflow-hidden bg-slate-950 relative">
        {booking.listing.images[0] ? (
            <img 
                src={booking.listing.images[0]} 
                alt={booking.listing.title} 
                className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
            />
        ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-700">
                <MapPin />
            </div>
        )}
      </div>

      {/* INFOS PRINCIPALES */}
      <div className="flex-1 space-y-3">
        <div className="flex justify-between items-start">
            <div>
                <h3 className="text-white font-bold text-lg line-clamp-1">{booking.listing.title}</h3>
                <p className="text-slate-400 text-sm flex items-center gap-1 mt-1">
                    <MapPin size={14} className="text-orange-500" /> 
                    {booking.listing.city}
                </p>
            </div>
            
            {/* BADGE STATUT */}
            <Badge variant="outline" className={`${statusConfig.color} flex items-center gap-1.5`}>
                <StatusIcon size={12} /> {statusConfig.label}
            </Badge>
        </div>

        <div className="flex flex-wrap gap-4 text-sm text-slate-400 bg-slate-950/50 p-3 rounded-lg border border-slate-800/50">
            <div className="flex items-center gap-2">
                <Calendar size={14} className="text-slate-500" />
                <span>
                    Du <span className="text-slate-200 font-medium">{format(new Date(booking.startDate), "dd MMM", { locale: fr })}</span> au <span className="text-slate-200 font-medium">{format(new Date(booking.endDate), "dd MMM yyyy", { locale: fr })}</span>
                </span>
            </div>
            <div className="w-px h-4 bg-slate-800 hidden md:block"></div>
            <div className="flex items-center gap-2">
                <CreditCard size={14} className="text-slate-500" />
                <span className="text-slate-200 font-bold">
                    {booking.totalPrice.toLocaleString()} FCFA
                </span>
            </div>
        </div>
      </div>

      {/* ACTIONS */}
      <div className="w-full md:w-auto flex flex-row md:flex-col gap-3">
         <Link href={`/dashboard/guest/inbox`} className="w-full">
            <Button variant="outline" className="w-full border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white">
                Contacter l'hôte
            </Button>
         </Link>
         
         <Link href={`/akwaba/${booking.listing.id}`} className="w-full">
            <Button className="w-full bg-slate-800 hover:bg-slate-700 text-white gap-2">
                Voir le logement <ChevronRight size={14} />
            </Button>
         </Link>

         {/* ✅ BOUTON DE NOTATION (Visible uniquement si le séjour est terminé) */}
         {booking.status === 'COMPLETED' && (
            <div className="w-full">
                <ReviewModal 
                    listingId={booking.listing.id} 
                    listingTitle={booking.listing.title} 
                />
            </div>
         )}
      </div>

    </div>
  );
}

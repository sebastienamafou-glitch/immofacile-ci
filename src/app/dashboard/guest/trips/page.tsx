import Link from "next/link";
import Image from "next/image";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { 
  Calendar, MapPin, CheckCircle2, Clock, XCircle, ArrowRight 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

// Configuration visuelle des statuts
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  PENDING: { label: "En attente", color: "bg-yellow-500/10 text-yellow-600", icon: Clock },
  PAID: { label: "Payé & Validé", color: "bg-emerald-500/10 text-emerald-600", icon: CheckCircle2 },
  CONFIRMED: { label: "Confirmé", color: "bg-blue-500/10 text-blue-600", icon: CheckCircle2 },
  CANCELLED: { label: "Annulé", color: "bg-red-500/10 text-red-600", icon: XCircle },
};

export default async function GuestTripsPage() {
  // 1. SÉCURITÉ : Qui est connecté ?
  const headersList = headers();
  const userEmail = headersList.get("x-user-email");
  
  // ⚠️ TEMPORAIRE : Fallback pour tester si vous n'avez pas encore le middleware Auth
  // Remplacez par votre propre email présent dans la DB pour voir vos données
  const emailToUse = userEmail || "admin@immofacile.com"; 

  const user = await prisma.user.findUnique({ where: { email: emailToUse } });

  if (!user) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
            <h2 className="text-xl font-bold mb-2">Accès restreint</h2>
            <p className="text-slate-500 mb-4">Veuillez vous connecter pour voir vos voyages.</p>
            <Link href="/login"><Button>Se connecter</Button></Link>
        </div>
    );
  }

  // 2. RÉCUPÉRATION DES VOYAGES (Triés par date récente)
  const bookings = await prisma.booking.findMany({
    where: { guestId: user.id },
    include: {
      listing: {
        select: {
            id: true,
            title: true,
            city: true,
            images: true,
            address: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8 animate-in fade-in duration-500">
      
      {/* Header Page */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Mes Voyages</h1>
            <p className="text-slate-500 mt-1">Gérez vos séjours passés et à venir.</p>
        </div>
        <Link href="/akwaba">
            <Button className="bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-500/20">
                + Réserver un séjour
            </Button>
        </Link>
      </div>

      {/* Liste des voyages */}
      {bookings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                <Calendar className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Aucun voyage pour l'instant</h3>
            <p className="text-slate-500 mb-6 max-w-sm text-center">
                Vos prochaines aventures apparaîtront ici une fois réservées.
            </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bookings.map((booking) => {
                // Gestion sécurisée du statut (fallback si statut inconnu)
                const statusInfo = STATUS_CONFIG[booking.status] || STATUS_CONFIG.PENDING;
                const StatusIcon = statusInfo.icon;
                
                // Formatage Dates
                const start = new Date(booking.startDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
                const end = new Date(booking.endDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

                return (
                    <Card key={booking.id} className="group overflow-hidden hover:shadow-xl transition-all duration-300 border-slate-200">
                        
                        {/* Image Cover */}
                        <div className="relative h-48 w-full bg-slate-100 overflow-hidden">
                            {booking.listing.images[0] ? (
                                <Image 
                                    src={booking.listing.images[0]} 
                                    alt={booking.listing.title} 
                                    fill 
                                    className="object-cover group-hover:scale-105 transition-transform duration-700"
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full text-slate-400">Pas d'image</div>
                            )}
                            <div className="absolute top-3 right-3">
                                <Badge className={`${statusInfo.color} border-none backdrop-blur-md bg-white/90 shadow-sm px-3 py-1`}>
                                    <StatusIcon className="w-3 h-3 mr-1.5" /> {statusInfo.label}
                                </Badge>
                            </div>
                        </div>

                        <CardContent className="p-5 space-y-4">
                            <div>
                                <h3 className="font-bold text-lg text-slate-900 line-clamp-1 group-hover:text-orange-600 transition-colors">
                                    {booking.listing.title}
                                </h3>
                                <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                                    <MapPin className="w-3.5 h-3.5 text-slate-400" /> {booking.listing.city}
                                </p>
                            </div>

                            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <div className="bg-white p-2 rounded-lg shadow-sm">
                                    <Calendar className="w-4 h-4 text-orange-500" />
                                </div>
                                <div className="flex flex-col text-sm">
                                    <span className="text-slate-500 text-xs font-medium uppercase">Dates du séjour</span>
                                    <span className="font-bold text-slate-900">{start} - {end}</span>
                                </div>
                            </div>
                            
                            <div className="flex justify-between items-center text-sm pt-2">
                                <span className="text-slate-500">Montant total</span>
                                <span className="font-black text-slate-900 text-lg">{booking.totalPrice.toLocaleString()} F</span>
                            </div>
                        </CardContent>

                        <CardFooter className="p-5 pt-0">
                            <Link href={`/akwaba/${booking.listing.id}`} className="w-full">
                                <Button variant="outline" className="w-full border-slate-200 hover:bg-slate-50 text-slate-700 hover:text-slate-900">
                                    Voir l'annonce <ArrowRight className="w-4 h-4 ml-2 opacity-50" />
                                </Button>
                            </Link>
                        </CardFooter>
                    </Card>
                );
            })}
        </div>
      )}
    </div>
  );
}

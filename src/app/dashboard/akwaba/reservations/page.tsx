import { redirect } from "next/navigation";
import Image from "next/image";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { 
  Calendar, User, MapPin, CheckCircle2, XCircle, Clock, Search, Phone, Mail 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Configuration des statuts (Couleurs & Labels)
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  PENDING: { label: "En attente", color: "bg-yellow-100 text-yellow-700 hover:bg-yellow-200", icon: Clock },
  PAID: { label: "Payé (À valider)", color: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200", icon: CheckCircle2 },
  CONFIRMED: { label: "Confirmé", color: "bg-blue-100 text-blue-700 hover:bg-blue-200", icon: CheckCircle2 },
  CANCELLED: { label: "Annulé", color: "bg-red-100 text-red-700 hover:bg-red-200", icon: XCircle },
};

export default async function OwnerReservationsPage() {
  // 1. SÉCURITÉ : Récupérer l'owner connecté
  const headersList = headers();
  const userEmail = headersList.get("x-user-email");
  if (!userEmail) redirect("/login");

  const user = await prisma.user.findUnique({ where: { email: userEmail } });
  if (!user) redirect("/login");

  // 2. DATA : Récupérer TOUTES les réservations sur MES annonces
  // On cherche les bookings où le "listing" appartient à "user.id"
  const bookings = await prisma.booking.findMany({
    where: {
        listing: {
            hostId: user.id 
        }
    },
    include: {
        listing: {
            select: { title: true, images: true, city: true }
        },
        guest: {
            select: { name: true, email: true, phone: true, image: true }
        }
    },
    orderBy: { createdAt: 'desc' } // Les plus récentes en haut
  });

  // Calculs rapides (KPIs)
  const totalRevenue = bookings
    .filter(b => b.status === 'PAID' || b.status === 'CONFIRMED')
    .reduce((acc, b) => acc + b.totalPrice, 0);

  const activeBookings = bookings.filter(b => new Date(b.endDate) >= new Date()).length;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in">
      
      {/* En-tête + KPIs */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Réservations Akwaba</h1>
          <p className="text-slate-500 mt-1">Gérez les séjours de vos voyageurs courte durée.</p>
        </div>
        <div className="flex gap-4">
            <Card className="p-4 border-orange-100 bg-orange-50/50 min-w-[160px]">
                <p className="text-xs font-bold text-orange-600 uppercase">Revenu Total</p>
                <p className="text-2xl font-black text-slate-900">{totalRevenue.toLocaleString()} F</p>
            </Card>
            <Card className="p-4 border-slate-200 bg-white min-w-[160px]">
                <p className="text-xs font-bold text-slate-500 uppercase">Séjours Actifs</p>
                <p className="text-2xl font-black text-slate-900">{activeBookings}</p>
            </Card>
        </div>
      </div>

      {/* Barre d'outils (Filtres) */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Rechercher un voyageur..." className="pl-9 bg-white" />
        </div>
        <div className="flex gap-2">
            <Button variant="outline">Tous les statuts</Button>
            <Button variant="outline">Ce mois-ci</Button>
        </div>
      </div>

      {/* Liste des Réservations */}
      <div className="space-y-4">
        {bookings.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="font-bold text-slate-900">Aucune réservation</h3>
                <p className="text-slate-500">Vos annonces n'ont pas encore trouvé preneur.</p>
            </div>
        ) : (
            bookings.map((booking) => {
                const statusInfo = STATUS_CONFIG[booking.status] || STATUS_CONFIG.PENDING;
                const StatusIcon = statusInfo.icon;
                const startDate = new Date(booking.startDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
                const endDate = new Date(booking.endDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

                return (
                    <Card key={booking.id} className="group hover:shadow-md transition-shadow border-slate-200 overflow-hidden">
                        <div className="flex flex-col md:flex-row">
                            
                            {/* 1. L'Annonce (Image) */}
                            <div className="w-full md:w-48 h-32 md:h-auto relative bg-slate-100 shrink-0">
                                {booking.listing.images[0] ? (
                                    <Image src={booking.listing.images[0]} alt="Listing" fill className="object-cover" />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-slate-400 text-xs">No Image</div>
                                )}
                            </div>

                            {/* 2. Détails Voyageur & Séjour */}
                            <div className="flex-1 p-6 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                                
                                <div className="space-y-4 flex-1">
                                    {/* Info Logement */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <Badge className={`${statusInfo.color} border-none`}>
                                                <StatusIcon className="w-3 h-3 mr-1.5" /> {statusInfo.label}
                                            </Badge>
                                            <span className="text-xs font-mono text-slate-400">#{booking.id.slice(-6).toUpperCase()}</span>
                                        </div>
                                        <h3 className="font-bold text-lg text-slate-900 line-clamp-1">{booking.listing.title}</h3>
                                        <p className="text-sm text-slate-500 flex items-center gap-1">
                                            <MapPin className="w-3.5 h-3.5" /> {booking.listing.city}
                                        </p>
                                    </div>

                                    {/* Info Voyageur */}
                                    <div className="flex items-center gap-3 pt-2 md:border-t border-slate-100 md:pt-4">
                                        <Avatar className="w-10 h-10 border border-slate-100">
                                            <AvatarImage src={booking.guest.image || ""} />
                                            <AvatarFallback className="bg-orange-100 text-orange-700 font-bold">
                                                {booking.guest.name?.[0]?.toUpperCase() || "G"}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="text-sm font-bold text-slate-900">{booking.guest.name || "Voyageur Inconnu"}</p>
                                            <div className="flex items-center gap-3 text-xs text-slate-500">
                                                {booking.guest.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {booking.guest.email}</span>}
                                                {booking.guest.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {booking.guest.phone}</span>}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 3. Dates & Prix (Aligné Droite) */}
                                <div className="flex flex-row md:flex-col items-center md:items-end gap-6 md:gap-1 w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0 border-slate-100">
                                    <div className="text-right">
                                        <p className="text-xs text-slate-400 uppercase font-medium mb-1">Dates du séjour</p>
                                        <div className="flex items-center gap-2 text-sm font-medium text-slate-700 bg-slate-50 px-3 py-1.5 rounded-lg">
                                            <Calendar className="w-4 h-4 text-slate-400" />
                                            {startDate} ➝ {endDate}
                                        </div>
                                    </div>
                                    
                                    <div className="text-right mt-2">
                                        <p className="text-xs text-slate-400 uppercase font-medium mb-1">Montant Total</p>
                                        <p className="text-xl font-black text-slate-900">{booking.totalPrice.toLocaleString()} F</p>
                                    </div>

                                    <div className="mt-4 w-full md:w-auto">
                                        <Button size="sm" className="w-full bg-slate-900 hover:bg-slate-800 text-white">
                                            Détails
                                        </Button>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </Card>
                );
            })
        )}
      </div>
    </div>
  );
}

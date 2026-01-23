import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CalendarDays, MapPin, AlertCircle } from "lucide-react";
import BookingHistoryCard from "@/components/guest/BookingHistoryCard";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const dynamic = 'force-dynamic';

export default async function GuestHistoryPage() {
  // 1. SÉCURITÉ : Récupération Session
  const userEmail = headers().get("x-user-email");
  if (!userEmail) redirect("/login");

  const user = await prisma.user.findUnique({ where: { email: userEmail } });
  if (!user) redirect("/login");

  // 2. DATA FETCHING : Récupération optimisée des réservations
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
      },
      payment: {
        select: { status: true, amount: true }
      }
    },
    orderBy: { startDate: 'desc' } // Les plus récentes en haut
  });

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <CalendarDays className="text-orange-500" /> Mes Séjours
          </h1>
          <p className="text-slate-400 mt-1">
            Retrouvez l'historique de vos voyages passés et à venir.
          </p>
        </div>
      </div>

      {/* CONTENU */}
      {bookings.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 border border-dashed border-slate-800 rounded-3xl bg-slate-900/50 text-center">
            <MapPin className="w-12 h-12 text-slate-600 mb-4" />
            <h3 className="text-xl font-bold text-white">Aucun voyage pour le moment</h3>
            <p className="text-slate-400 mb-6 max-w-md">
                Vous n'avez pas encore effectué de réservation. Explorez nos logements pour votre prochaine aventure !
            </p>
            <Link href="/dashboard/guest">
                <Button className="bg-orange-600 hover:bg-orange-500 text-white font-bold">
                    Explorer les logements
                </Button>
            </Link>
        </div>
      ) : (
        <div className="space-y-4">
            {bookings.map((booking) => (
                <BookingHistoryCard key={booking.id} booking={booking} />
            ))}
        </div>
      )}
    </div>
  );
}

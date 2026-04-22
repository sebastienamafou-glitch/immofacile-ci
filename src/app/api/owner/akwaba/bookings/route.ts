import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// ==========================================
// 1. GET : LECTURE DES RÉSERVATIONS
// ==========================================
export async function GET(request: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    // 🛡️ SÉCURITÉ MULTI-TENANT : On récupère l'agence de l'utilisateur
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { agencyId: true }
    });

    const accessFilter = user?.agencyId 
        ? { agencyId: user.agencyId } // Si c'est une agence, il voit tout le parc de l'agence
        : { hostId: userId };         // Si c'est un solo, il voit ses propres biens

    const bookings = await prisma.booking.findMany({
      where: { listing: accessFilter },
      orderBy: { startDate: 'desc' },
      include: {
        guest: {
          select: { name: true, email: true, image: true, phone: true, kyc: { select: { status: true } } }
        },
        listing: { select: { id: true, title: true, images: true, address: true } },
        payment: { select: { status: true, hostPayout: true, amount: true } }
      }
    });

    const formattedBookings = bookings.map(b => ({
        ...b,
        guest: { ...b.guest, kycStatus: b.guest.kyc?.status || "PENDING", kyc: undefined }
    }));

    const PAID_STATUSES = ['PAID', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED'];

    const stats = {
        upcoming: bookings.filter(b => PAID_STATUSES.includes(b.status) && new Date(b.startDate) > new Date()).length,
        active: bookings.filter(b => PAID_STATUSES.includes(b.status) && new Date(b.startDate) <= new Date() && new Date(b.endDate) >= new Date()).length,
        completed: bookings.filter(b => b.status === 'COMPLETED' || (PAID_STATUSES.includes(b.status) && new Date(b.endDate) < new Date())).length,
        revenue: bookings.filter(b => PAID_STATUSES.includes(b.status)).reduce((acc, b) => acc + (b.payment?.hostPayout || 0), 0)
    };

    return NextResponse.json({ success: true, bookings: formattedBookings, stats });

  } catch (error) {
    console.error("API Bookings Error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// ==========================================
// 2. POST : MODIFICATION DES STATUTS (Conciergerie)
// ==========================================
export async function POST(request: Request) {
    try {
      const session = await auth();
      const userId = session?.user?.id;
      if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  
      const body = await request.json();
      const { bookingId, action } = body; 
  
      if (!bookingId || !action) return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  
      const booking = await prisma.booking.findUnique({
          where: { id: bookingId },
          include: { listing: { select: { hostId: true, agencyId: true } } }
      });
  
      if (!booking) return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
  
      // 🛡️ SÉCURITÉ : L'utilisateur a-t-il le droit de modifier ce séjour ?
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { agencyId: true } });
      if (booking.listing.hostId !== userId && booking.listing.agencyId !== user?.agencyId) {
          return NextResponse.json({ error: "Accès refusé pour ce bien." }, { status: 403 });
      }
  
      const today = new Date();
      today.setHours(0,0,0,0);
      const startDate = new Date(booking.startDate);
      startDate.setHours(0,0,0,0);
  
      if (action === 'CHECK_IN') {
          if (!['CONFIRMED', 'PAID'].includes(booking.status)) return NextResponse.json({ error: "Statut invalide pour un Check-in." }, { status: 400 });
          if (today < startDate) return NextResponse.json({ error: "Le séjour n'a pas encore commencé." }, { status: 400 });
  
          await prisma.booking.update({ where: { id: bookingId }, data: { status: 'CHECKED_IN' } });
          return NextResponse.json({ success: true, message: "Check-in validé !" });
      }
  
      if (action === 'CHECK_OUT') {
          if (booking.status !== 'CHECKED_IN') return NextResponse.json({ error: "Le client n'a pas fait son Check-in." }, { status: 400 });
          
          await prisma.booking.update({ where: { id: bookingId }, data: { status: 'COMPLETED' } });
          return NextResponse.json({ success: true, message: "Check-out validé ! Séjour terminé." });
      }
  
      return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  
    } catch (error) {
      console.error("Action Error:", error);
      return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
  }

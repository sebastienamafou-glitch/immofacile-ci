import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, addDays } from "date-fns";

export const dynamic = 'force-dynamic';

// ==========================================
// 1. GET : LECTURE DES MOUVEMENTS (Arrivées/Départs)
// ==========================================
export async function GET(request: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, agencyId: true }
    });

    if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

    const today = startOfDay(new Date());
    const nextWeek = endOfDay(addDays(today, 7));

    // 🛡️ SÉCURITÉ : Filtre dynamique (Propriétaire Solo vs Agent d'Agence)
    const accessFilter = user.agencyId 
        ? { listing: { agencyId: user.agencyId } } // Périmètre Agence
        : { listing: { hostId: userId } };         // Périmètre Propriétaire Solo

    const bookings = await prisma.booking.findMany({
      where: {
        ...accessFilter,
        status: { in: ['CONFIRMED', 'PAID', 'CHECKED_IN'] },
        OR: [
            { startDate: { gte: today, lte: nextWeek } },
            { endDate: { gte: today, lte: nextWeek } }
        ]
      },
      include: {
        guest: { select: { name: true, phone: true, image: true } },
        listing: { select: { title: true, address: true, images: true } }
      },
      orderBy: { startDate: 'asc' }
    });

    const movements = bookings.map(b => {
        const isCheckIn = new Date(b.startDate) >= today && new Date(b.startDate) <= nextWeek && b.status !== 'CHECKED_IN';
        const type = isCheckIn ? 'CHECK_IN' : 'CHECK_OUT';
        
        return {
            id: b.id,
            type,
            date: isCheckIn ? b.startDate : b.endDate,
            guest: b.guest,
            listing: b.listing,
            status: b.status,
            notes: type === 'CHECK_IN' ? "Remise des clés" : "Reprise des clés"
        };
    });

    movements.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return NextResponse.json({ success: true, movements });

  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// ==========================================
// 2. POST : MODIFICATION DES STATUTS
// ==========================================
export async function POST(request: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const body = await request.json();
    const { bookingId, action } = body; 

    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { listing: true }
    });

    if (!booking) return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });

    // 🛡️ SÉCURITÉ : Le demandeur est-il le proprio ou l'agent de l'agence ?
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (booking.listing.hostId !== userId && booking.listing.agencyId !== user?.agencyId) {
        return NextResponse.json({ error: "Accès refusé pour ce bien." }, { status: 403 });
    }

    const today = new Date();
    today.setHours(0,0,0,0);
    const startDate = new Date(booking.startDate);
    startDate.setHours(0,0,0,0);

    if (action === 'CHECK_IN') {
        if (!['CONFIRMED', 'PAID'].includes(booking.status)) return NextResponse.json({ error: "Statut invalide pour un Check-in." }, { status: 400 });
        if (today < startDate) return NextResponse.json({ error: "Trop tôt pour faire le Check-in." }, { status: 400 });

        await prisma.booking.update({ where: { id: bookingId }, data: { status: 'CHECKED_IN' } });
        return NextResponse.json({ success: true, message: "Check-in validé !" });
    }

    if (action === 'CHECK_OUT') {
        if (booking.status !== 'CHECKED_IN') return NextResponse.json({ error: "Le client n'est pas Checked-In." }, { status: 400 });
        
        await prisma.booking.update({ where: { id: bookingId }, data: { status: 'COMPLETED' } });
        return NextResponse.json({ success: true, message: "Check-out validé ! Séjour terminé." });
    }

    return NextResponse.json({ error: "Action inconnue" }, { status: 400 });

  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

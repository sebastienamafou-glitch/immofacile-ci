import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, addDays } from "date-fns";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. AUTH AGENT
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const agent = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { agencyId: true }
    });

    if (!agent?.agencyId) return NextResponse.json({ error: "Agent sans agence" }, { status: 403 });

    // 2. STRATÉGIE : On cherche les bookings liés à l'agence de l'agent
    // On veut les arrivées (Check-in) et départs (Check-out) des 7 prochains jours
    const today = startOfDay(new Date());
    const nextWeek = endOfDay(addDays(today, 7));

    const bookings = await prisma.booking.findMany({
      where: {
        listing: { agencyId: agent.agencyId }, //  Le lien magique
        status: 'CONFIRMED',
        OR: [
            { startDate: { gte: today, lte: nextWeek } }, // Arrivées imminentes
            { endDate: { gte: today, lte: nextWeek } }    // Départs imminents
        ]
      },
      include: {
        guest: { select: { name: true, phone: true, image: true } }, // [cite: 41]
        listing: { select: { title: true, address: true, images: true } } // [cite: 48]
      },
      orderBy: { startDate: 'asc' }
    });

    // 3. TRI LOGIQUE (Pour l'affichage Conciergerie)
    const movements = bookings.map(b => {
        const isCheckIn = new Date(b.startDate) >= today;
        const date = isCheckIn ? b.startDate : b.endDate;
        
        return {
            id: b.id,
            type: isCheckIn ? 'CHECK_IN' : 'CHECK_OUT',
            date: date,
            guest: b.guest,
            listing: b.listing,
            notes: isCheckIn ? "Remise des clés + Wifi" : "Vérification + Ménage"
        };
    });

    // On re-trie par date/heure exacte de l'événement
    movements.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return NextResponse.json({ success: true, movements });

  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

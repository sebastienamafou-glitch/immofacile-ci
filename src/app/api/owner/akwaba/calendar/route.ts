import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth, subMonths, addMonths } from "date-fns"; // Assurez-vous d'avoir date-fns

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. SÉCURITÉ
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const owner = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { id: true }
    });

    if (!owner) return NextResponse.json({ error: "Compte introuvable" }, { status: 404 });

    // 2. RECUPERATION DES PARAMÈTRES (Mois affiché)
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date'); // ex: "2024-02-01"
    
    const viewDate = dateParam ? new Date(dateParam) : new Date();
    
    // On prend une marge de sécurité (Mois d'avant et Mois d'après) pour gérer les événements à cheval
    const startRange = startOfMonth(subMonths(viewDate, 1));
    const endRange = endOfMonth(addMonths(viewDate, 1));

    // 3. REQUÊTE UNIFIÉE
    const rawBookings = await prisma.booking.findMany({
      where: {
        listing: { hostId: owner.id },
        status: { in: ['CONFIRMED', 'PAID'] }, // Seuls les confirmés apparaissent
        OR: [
             // L'événement touche notre plage de dates
            { startDate: { lte: endRange }, endDate: { gte: startRange } } 
        ]
      },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        guestId: true,
        listing: { select: { title: true } },
        guest: { select: { name: true } }
      }
    });

    // 4. TRANSFORMATION EN "EVENTS" POUR LE FRONT
    const events = rawBookings.map(b => {
      // Détection : Est-ce un blocage ou un client ?
      // Règle définie précédemment : Guest = Owner => Blocage
      const isBlock = b.guestId === owner.id;

      return {
        id: b.id,
        title: isBlock ? "⛔ Indisponible" : b.guest.name,
        subtitle: b.listing.title,
        start: b.startDate,
        end: b.endDate,
        type: isBlock ? 'BLOCK' : 'BOOKING',
        color: isBlock ? 'red' : 'emerald' // Pour le front
      };
    });

    return NextResponse.json({ success: true, events });

  } catch (error) {
    console.error("Calendar API Error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

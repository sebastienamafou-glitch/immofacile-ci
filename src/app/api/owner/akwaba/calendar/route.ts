import { NextResponse } from "next/server";
import { auth } from "@/auth"; // ✅ SÉCURITÉ : On utilise la session réelle
import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth, subMonths, addMonths, isValid } from "date-fns";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. AUTHENTIFICATION ROBUSTE
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    const userId = session.user.id; // C'est l'ID de l'hôte

    // 2. GESTION DES DATES (Sécurisée)
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date'); 
    
    let viewDate = new Date();
    if (dateParam) {
        const parsedDate = new Date(dateParam);
        if (isValid(parsedDate)) {
            viewDate = parsedDate;
        }
    }
    
    // Plage de 3 mois (Précédent, Courant, Suivant) pour le confort visuel
    const startRange = startOfMonth(subMonths(viewDate, 1));
    const endRange = endOfMonth(addMonths(viewDate, 1));

    // 3. REQUÊTE PRISMA OPTIMISÉE
    const rawBookings = await prisma.booking.findMany({
      where: {
        listing: { hostId: userId }, // ✅ On filtre par l'ID de session
        // On inclut les réservations bloquées (CONFIRMED) et payées (PAID)
        // + CHECKED_IN et COMPLETED pour l'historique
        status: { in: ['CONFIRMED', 'PAID', 'CHECKED_IN', 'COMPLETED'] }, 
        
        // Logique de chevauchement correcte
        AND: [
             { startDate: { lte: endRange } },
             { endDate: { gte: startRange } }
        ]
      },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        guestId: true,
        status: true, // Utile pour la couleur
        listing: { select: { title: true } },
        guest: { select: { name: true } }
      }
    });

    // 4. TRANSFORMATION (Mapping)
    const events = rawBookings.map(b => {
      // Si l'invité est le propriétaire lui-même, c'est un BLOCAGE
      const isBlock = b.guestId === userId;

      return {
        id: b.id,
        title: isBlock ? "⛔ Indisponible" : b.guest.name,
        subtitle: b.listing.title,
        start: b.startDate,
        end: b.endDate,
        type: isBlock ? 'BLOCK' : 'BOOKING',
        status: b.status,
        // Logique de couleur pour le frontend
        color: isBlock ? 'red' : (b.status === 'CHECKED_IN' ? 'blue' : 'emerald') 
      };
    });

    return NextResponse.json({ success: true, events });

  } catch (error) {
    console.error("Calendar API Error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

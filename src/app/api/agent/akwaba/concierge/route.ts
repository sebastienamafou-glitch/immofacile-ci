import { NextResponse } from "next/server";
import { auth } from "@/auth";

import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, addDays } from "date-fns";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. SÉCURITÉ ZERO TRUST (ID injecté par Middleware)
    const session = await auth();
if (!session || !session.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const userId = session.user.id;
    if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    // 2. VÉRIFICATION AGENT & AGENCE
    const agent = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
          id: true, 
          role: true, 
          agencyId: true 
      }
    });

    if (!agent || agent.role !== 'AGENT') {
        return NextResponse.json({ error: "Accès réservé aux agents." }, { status: 403 });
    }

    if (!agent.agencyId) {
        return NextResponse.json({ error: "Aucune agence rattachée à votre compte." }, { status: 403 });
    }

    // 3. LOGIQUE CONCIERGERIE
    // Récupération des Check-in / Check-out des 7 prochains jours pour TOUTE l'agence
    const today = startOfDay(new Date());
    const nextWeek = endOfDay(addDays(today, 7));

    const bookings = await prisma.booking.findMany({
      where: {
        listing: { 
            agencyId: agent.agencyId // ✅ Périmètre Agence B2B
        },
        status: { in: ['CONFIRMED', 'PAID'] },
        OR: [
            { startDate: { gte: today, lte: nextWeek } }, // Arrivées
            { endDate: { gte: today, lte: nextWeek } }    // Départs
        ]
      },
      include: {
        guest: { select: { name: true, phone: true, image: true } },
        listing: { select: { title: true, address: true, images: true } }
      },
      orderBy: { startDate: 'asc' }
    });

    // 4. FORMATAGE DES MOUVEMENTS
    const movements = bookings.map(b => {
        // Est-ce une arrivée aujourd'hui ou dans le futur proche ?
        const isCheckIn = new Date(b.startDate) >= today && new Date(b.startDate) <= nextWeek;
        // Sinon c'est un départ (car filtré par le OR plus haut)
        
        // Note de sécurité : un booking très court peut être les deux. 
        // Ici on simplifie : si startDate est dans la fenêtre, c'est un Check-in prioritaire.
        // Pour être parfait, on pourrait générer deux mouvements si le séjour est < 7 jours.
        // Dans cette version, on garde votre logique de mapping simple :
        const type = isCheckIn ? 'CHECK_IN' : 'CHECK_OUT';
        const date = isCheckIn ? b.startDate : b.endDate;
        
        return {
            id: b.id,
            type,
            date,
            guest: b.guest,
            listing: b.listing,
            notes: type === 'CHECK_IN' ? "Remise clés + État des lieux" : "Vérification + Reprise clés"
        };
    });

    // Tri chronologique
    movements.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return NextResponse.json({ success: true, movements });

  } catch (error) {
    console.error("Conciergerie Error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

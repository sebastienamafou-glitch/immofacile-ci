import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. SÉCURITÉ AUTH
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    // 2. RECUPERER LE USER ID
    const owner = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { id: true }
    });

    if (!owner) return NextResponse.json({ error: "Compte introuvable" }, { status: 404 });

    // 3. RECUPERER LES RÉSERVATIONS (Côté Host)
    const bookings = await prisma.booking.findMany({
      where: {
        listing: {
          hostId: owner.id // Je suis l'hôte
        }
      },
      orderBy: {
        startDate: 'desc' // Les plus récentes en premier
      },
      include: {
        guest: {
          select: {
            name: true,
            email: true,
            image: true,
            phone: true,
            kycStatus: true // Pour savoir si l'identité est vérifiée
          }
        },
        listing: {
          select: {
            id: true,
            title: true,
            images: true,
            address: true
          }
        },
        payment: {
            select: {
                status: true,
                hostPayout: true, // MONTANT NET
                amount: true // MONTANT BRUT (Payé par client)
            }
        }
      }
    });

    // 4. CALCUL DES STATS RAPIDES
    // On filtre en mémoire pour éviter 3 requêtes DB supplémentaires
    const stats = {
        upcoming: bookings.filter(b => ['CONFIRMED', 'PAID'].includes(b.status) && new Date(b.startDate) > new Date()).length,
        active: bookings.filter(b => ['CONFIRMED', 'PAID'].includes(b.status) && new Date(b.startDate) <= new Date() && new Date(b.endDate) >= new Date()).length,
        completed: bookings.filter(b => b.status === 'COMPLETED' || (['CONFIRMED', 'PAID'].includes(b.status) && new Date(b.endDate) < new Date())).length,
        revenue: bookings.reduce((acc, b) => acc + (b.payment?.hostPayout || 0), 0)
    };

    return NextResponse.json({ success: true, bookings, stats });

  } catch (error) {
    console.error("API Bookings Error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

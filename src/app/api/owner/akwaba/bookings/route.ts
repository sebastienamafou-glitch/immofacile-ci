import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. SÉCURITÉ ZERO TRUST
    const userId = request.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    // 2. RECUPERER LES RÉSERVATIONS (Côté Host)
    // On cherche les bookings dont le listing appartient au userId
    const bookings = await prisma.booking.findMany({
      where: {
        listing: {
          hostId: userId // 🔒 Verrouillage par ID
        }
      },
      orderBy: {
        startDate: 'desc'
      },
      include: {
        guest: {
          select: {
            name: true,
            email: true,
            image: true,
            phone: true,
            kycStatus: true
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
                amount: true // MONTANT BRUT
            }
        }
      }
    });

    // 3. STATS
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

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. SÉCURITÉ
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    // 2. RECUPERER LES RÉSERVATIONS
    const bookings = await prisma.booking.findMany({
      where: {
        listing: {
          hostId: userId 
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
            kyc: {
                select: { status: true }
            }
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
                hostPayout: true,
                amount: true
            }
        }
      }
    });

    // 3. REMAPPING
    const formattedBookings = bookings.map(b => ({
        ...b,
        guest: {
            ...b.guest,
            kycStatus: b.guest.kyc?.status || "PENDING",
            kyc: undefined
        }
    }));

    // Définition des statuts "Payés"
    const PAID_STATUSES = ['PAID', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED'];

    const stats = {
        upcoming: bookings.filter(b => PAID_STATUSES.includes(b.status) && new Date(b.startDate) > new Date()).length,
        active: bookings.filter(b => PAID_STATUSES.includes(b.status) && new Date(b.startDate) <= new Date() && new Date(b.endDate) >= new Date()).length,
        completed: bookings.filter(b => b.status === 'COMPLETED' || (PAID_STATUSES.includes(b.status) && new Date(b.endDate) < new Date())).length,
        
        // ✅ CORRECTION ICI : On ne compte l'argent que si la réservation est payée
        revenue: bookings
            .filter(b => PAID_STATUSES.includes(b.status)) 
            .reduce((acc, b) => acc + (b.payment?.hostPayout || 0), 0)
    };

    return NextResponse.json({ success: true, bookings: formattedBookings, stats });

  } catch (error) {
    console.error("API Bookings Error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

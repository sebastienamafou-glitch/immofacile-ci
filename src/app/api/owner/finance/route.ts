import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. SÉCURITÉ ZERO TRUST (ID injecté par Middleware)
    const userId = request.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    // 2. RÉCUPÉRATION DU PROPRIÉTAIRE (Profil & Soldes)
    const owner = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        // Nécessaire pour le calcul de sécurité du séquestre (Cautions)
        propertiesOwned: {
            include: {
                leases: {
                    where: { OR: [{ isActive: true }, { status: 'ACTIVE' }] },
                    select: { depositAmount: true }
                }
            }
        }
      }
    });

    if (!owner || owner.role !== "OWNER") {
      return NextResponse.json({ error: "Accès réservé aux propriétaires." }, { status: 403 });
    }

    // 3. RECUPERATION OPTIMISÉE DES TRANSACTIONS (LONGUE DURÉE)
    const rawPayments = await prisma.payment.findMany({
      where: {
        status: 'SUCCESS',
        lease: {
          property: {
            ownerId: owner.id // Verrouillage par ID
          }
        }
      },
      orderBy: { date: 'desc' },
      take: 20,
      include: {
        lease: {
          select: {
            id: true,
            property: { select: { title: true } },
            tenant: { select: { name: true } }
          }
        }
      }
    });

    // Mapping propre
    const leasePayments = rawPayments.map(p => ({
      id: p.id,
      amount: p.amountOwner, // Montant NET
      grossAmount: p.amount, // Montant BRUT
      type: p.type,
      status: p.status,
      date: p.date,
      source: "RENTAL",
      details: {
        property: p.lease.property.title,
        tenant: p.lease.tenant.name
      }
    }));

    // 4. RECUPERATION OPTIMISÉE DES RÉSERVATIONS (COURTE DURÉE / AKWABA)
    const rawBookings = await prisma.booking.findMany({
      where: {
        listing: { hostId: owner.id }, // Verrouillage par ID
        status: { in: ['PAID', 'CONFIRMED', 'COMPLETED'] }
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        listing: { select: { title: true } },
        guest: { select: { name: true } },
        payment: true
      }
    });

    const akwabaBookings = rawBookings.map(b => ({
      id: b.id,
      amount: b.payment?.hostPayout || 0, // Montant NET
      grossAmount: b.totalPrice,
      startDate: b.startDate,
      endDate: b.endDate,
      date: b.createdAt,
      status: b.status,
      source: "AKWABA",
      details: {
        property: b.listing.title,
        guest: b.guest.name
      }
    }));

    // 5. CALCUL DE SÉCURITÉ (SÉQUESTRE)
    const calculatedEscrow = owner.propertiesOwned.reduce((acc, property) => {
        return acc + property.leases.reduce((sum, lease) => sum + (lease.depositAmount || 0), 0);
    }, 0);

    // 6. RÉPONSE FINALE
    return NextResponse.json({
      success: true,
      walletBalance: owner.walletBalance, // Argent dispo
      escrowBalance: calculatedEscrow,    // Argent bloqué
      
      payments: leasePayments,
      bookings: akwabaBookings,
      
      user: {
        name: owner.name,
        email: owner.email,
        phone: owner.phone,
        address: owner.address
      }
    });

  } catch (error) {
    console.error("Erreur Finance API:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

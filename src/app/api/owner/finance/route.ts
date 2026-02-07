import { NextResponse } from "next/server";
import { auth } from "@/auth";

import { prisma } from "@/lib/prisma";


export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. SÉCURITÉ : Session Serveur (v5)
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    // 2. RÉCUPÉRATION DU PROPRIÉTAIRE
    const owner = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        // ✅ On récupère le coffre-fort financier
        finance: {
            select: { walletBalance: true, escrowBalance: true }
        },
        // Sécurité séquestre (Double vérification)
        propertiesOwned: {
            include: {
                leases: {
                    where: { isActive: true }, 
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
            ownerId: owner.id 
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

    // Mapping sécurisé (Correction de l'erreur TypeScript)
    const leasePayments = rawPayments.map(p => ({
      id: p.id,
      amount: p.amountOwner,
      grossAmount: p.amount,
      type: p.type,
      status: p.status,
      date: p.date,
      source: "RENTAL",
      details: {
        // ✅ CORRECTION ICI : On utilise ?. et || pour gérer les nulls
        property: p.lease?.property?.title || "Propriété inconnue",
        tenant: p.lease?.tenant?.name || "Locataire inconnu"
      }
    }));

    // 4. RECUPERATION OPTIMISÉE DES RÉSERVATIONS (AKWABA)
    const rawBookings = await prisma.booking.findMany({
      where: {
        listing: { hostId: owner.id },
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
      amount: b.payment?.hostPayout || 0,
      grossAmount: b.totalPrice,
      startDate: b.startDate,
      endDate: b.endDate,
      date: b.createdAt,
      status: b.status,
      source: "AKWABA",
      details: {
        property: b.listing?.title || "Logement supprimé",
        guest: b.guest?.name || "Voyageur inconnu"
      }
    }));

    // 5. CALCUL DE SÉCURITÉ (SÉQUESTRE)
    const calculatedEscrow = owner.propertiesOwned.reduce((acc, property) => {
        return acc + property.leases.reduce((sum, lease) => sum + (lease.depositAmount || 0), 0);
    }, 0);

    // 6. RÉPONSE FINALE
    return NextResponse.json({
      success: true,
      // Mapping sécurisé depuis la table finance
      walletBalance: owner.finance?.walletBalance ?? 0, 
      escrowBalance: calculatedEscrow, 
      
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

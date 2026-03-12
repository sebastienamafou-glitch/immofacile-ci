import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// ========================================================
// GET : Récupérer les détails d'un bail spécifique
// ========================================================
export async function GET(
  request: Request,
  { params }: { params: { id: string } } // ✅ CORRECTION : params synchrone
) {
  try {
    const id = params.id; // Extraction directe

    // 1. SÉCURITÉ ZERO TRUST (ID injecté par Middleware)
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    // 2. RÉCUPÉRATION SÉCURISÉE (Vérification propriétaire implicite)
    const lease = await prisma.lease.findFirst({
      where: {
        id: id,
        property: { ownerId: userId } // 🔒 VERROU CRITIQUE : Seul le propriétaire accède
      },
      include: {
        property: { select: { id: true, title: true, address: true, commune: true } },
        tenant: { select: { id: true, name: true, email: true, phone: true, image: true } },
        payments: {
            orderBy: { date: 'desc' },
            take: 12 // Historique 12 derniers mois
        }
      }
    });

    if (!lease) {
        return NextResponse.json({ error: "Bail introuvable ou accès refusé" }, { status: 404 });
    }

    return NextResponse.json({ success: true, lease });

  } catch (error) {
    console.error("🚨 Erreur GET Lease Detail:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// ========================================================
// PUT : Actions sur le bail (Résilier / Modifier)
// ========================================================
export async function PUT(
  request: Request,
  { params }: { params: { id: string } } // ✅ CORRECTION : params synchrone
) {
  try {
    const id = params.id; // Extraction directe
    
    const session = await auth();
    if (!session || !session.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = session.user.id;

    const body = await request.json();

    // 1. VÉRIFICATION D'APPARTENANCE
    const existingLease = await prisma.lease.findFirst({
        where: { id: id, property: { ownerId: userId } }
    });

    if (!existingLease) {
        return NextResponse.json({ error: "Bail introuvable" }, { status: 404 });
    }

    // 2. ACTION : RÉSILIATION (TERMINATE)
    if (body.action === 'TERMINATE') {
        const updatedLease = await prisma.lease.update({
            where: { id: id },
            data: {
                isActive: false,
                status: 'TERMINATED',
                endDate: new Date(), // Date de fin effective = Maintenant
                updatedAt: new Date()
            }
        });
        return NextResponse.json({ success: true, lease: updatedLease });
    }

    return NextResponse.json({ error: "Action inconnue" }, { status: 400 });

  } catch (error) {
    console.error("🚨 Erreur PUT Lease:", error);
    return NextResponse.json({ error: "Impossible de modifier ce bail" }, { status: 500 });
  }
}

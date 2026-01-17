import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Singleton

export const dynamic = 'force-dynamic';

// GET : Récupérer les détails d'un bail spécifique
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> } // ✅ Correct Next.js 15
) {
  try {
    const { id } = await params;

    // 1. SÉCURITÉ
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const owner = await prisma.user.findUnique({ where: { email: userEmail } });
    
    // ✅ AJOUT SÉCURITÉ : Rôle Strict
    if (!owner || owner.role !== "OWNER") {
        return NextResponse.json({ error: "Accès réservé aux propriétaires." }, { status: 403 });
    }

    // 2. RÉCUPÉRATION SÉCURISÉE
    const lease = await prisma.lease.findFirst({
      where: {
        id: id,
        property: { ownerId: owner.id } // On s'assure que le bien appartient au demandeur
      },
      include: {
        property: { select: { id: true, title: true, address: true, commune: true } },
        tenant: { select: { id: true, name: true, email: true, phone: true } },
        payments: {
            orderBy: { date: 'desc' },
            take: 12 // Historique sur 1 an glissant
        }
      }
    });

    if (!lease) {
        return NextResponse.json({ error: "Bail introuvable ou accès refusé" }, { status: 404 });
    }

    return NextResponse.json({ success: true, lease });

  } catch (error) {
    console.error("Erreur GET Lease ID:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// PUT : Résilier le bail (Terminer le contrat)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> } // ✅ Correct Next.js 15
) {
  try {
    const { id } = await params;

    // 1. SÉCURITÉ
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const owner = await prisma.user.findUnique({ where: { email: userEmail } });
    
    // ✅ AJOUT SÉCURITÉ : Rôle Strict
    if (!owner || owner.role !== "OWNER") {
        return NextResponse.json({ error: "Accès réservé aux propriétaires." }, { status: 403 });
    }

    // 2. VÉRIFICATION AVANT ACTION
    const existingLease = await prisma.lease.findFirst({
        where: { id: id, property: { ownerId: owner.id } }
    });

    if (!existingLease) {
        return NextResponse.json({ error: "Bail introuvable" }, { status: 404 });
    }

    // 3. MISE À JOUR (RÉSILIATION)
    const updatedLease = await prisma.lease.update({
        where: { id: id },
        data: {
            isActive: false,
            status: 'TERMINATED',
            endDate: new Date(), // Date de fin = Maintenant
            updatedAt: new Date()
        }
    });

    return NextResponse.json({ success: true, lease: updatedLease });

  } catch (error) {
    console.error("Erreur PUT Lease ID:", error);
    return NextResponse.json({ error: "Impossible de résilier ce bail" }, { status: 500 });
  }
}

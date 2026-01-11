import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// GET : Récupérer les détails du bail + Historique paiements
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const owner = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!owner) return NextResponse.json({ error: "Inconnu" }, { status: 403 });

    const lease = await prisma.lease.findFirst({
      where: {
        id: params.id,
        property: { ownerId: owner.id } // Sécurité : Le bien doit appartenir au demandeur
      },
      include: {
        property: { select: { id: true, title: true, address: true, commune: true } },
        tenant: { select: { id: true, name: true, email: true, phone: true } },
        payments: {
            orderBy: { date: 'desc' },
            take: 12 // Derniers 12 mois
        }
      }
    });

    if (!lease) return NextResponse.json({ error: "Bail introuvable" }, { status: 404 });

    return NextResponse.json({ success: true, lease });

  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// PUT : Résilier le bail
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const owner = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!owner) return NextResponse.json({ error: "Inconnu" }, { status: 403 });

    // On vérifie d'abord que le bail existe et appartient au propriétaire
    const existingLease = await prisma.lease.findFirst({
        where: { id: params.id, property: { ownerId: owner.id } }
    });

    if (!existingLease) return NextResponse.json({ error: "Bail introuvable" }, { status: 404 });

    // Résiliation
    const updatedLease = await prisma.lease.update({
        where: { id: params.id },
        data: {
            isActive: false,
            status: 'TERMINATED',
            endDate: new Date() // Date de fin = Aujourd'hui
        }
    });

    return NextResponse.json({ success: true, lease: updatedLease });

  } catch (error) {
    return NextResponse.json({ error: "Impossible de résilier" }, { status: 500 });
  }
}

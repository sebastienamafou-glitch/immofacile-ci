import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    // 1. Récupération de l'utilisateur (via les Headers du Middleware)
    const userId = request.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

    const body = await request.json();
    const { propertyId } = body;

    // 2. Vérifier si une demande existe déjà
    const existingLease = await prisma.lease.findFirst({
      where: {
        tenantId: userId,
        propertyId: propertyId,
        status: { in: ['PENDING', 'ACTIVE'] } // Pas de doublons
      }
    });

    if (existingLease) {
      return NextResponse.json({ error: "Vous avez déjà un dossier en cours pour ce bien." }, { status: 400 });
    }

    // 3. Récupérer infos du bien pour le prix
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) return NextResponse.json({ error: "Bien introuvable" }, { status: 404 });

    // 4. Créer la demande (Lease PENDING)
    await prisma.lease.create({
      data: {
        startDate: new Date(), // Date de demande
        monthlyRent: property.price,
        depositAmount: property.price * 2, // Règle par défaut (2 mois)
        status: 'PENDING',
        isActive: false,
        tenantId: userId,
        propertyId: propertyId
      }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur lors de la candidature" }, { status: 500 });
  }
}

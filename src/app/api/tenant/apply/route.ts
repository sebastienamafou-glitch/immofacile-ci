import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/logger"; // ✅ Audit Trail

export async function POST(request: Request) {
  try {
    // 1. AUTHENTIFICATION SÉCURISÉE (NextAuth)
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Vous devez être connecté pour postuler." }, { status: 401 });
    }
    const userId = session.user.id;

    // 2. VALIDATION DU PAYLOAD
    const body = await request.json();
    const { propertyId } = body;

    if (!propertyId) {
        return NextResponse.json({ error: "ID du bien manquant." }, { status: 400 });
    }

    // 3. VÉRIFICATION DE DOUBLON (Anti-Spam)
    // On vérifie si une demande est déjà en cours ou active
    const existingLease = await prisma.lease.findFirst({
      where: {
        tenantId: userId,
        propertyId: propertyId,
        status: { in: ['PENDING', 'ACTIVE'] } 
      }
    });

    if (existingLease) {
      return NextResponse.json({ 
          error: "Dossier déjà transmis. Veuillez vérifier votre tableau de bord." 
      }, { status: 409 }); // 409 Conflict
    }

    // 4. RÉCUPÉRATION DU BIEN
    const property = await prisma.property.findUnique({ 
        where: { id: propertyId },
        select: { id: true, price: true, title: true, isAvailable: true }
    });

    if (!property) {
        return NextResponse.json({ error: "Ce bien n'existe plus." }, { status: 404 });
    }

    if (!property.isAvailable) {
        return NextResponse.json({ error: "Ce bien n'est plus disponible." }, { status: 400 });
    }

    // 5. CRÉATION DE LA CANDIDATURE (Lease PENDING)
    const newLease = await prisma.lease.create({
      data: {
        startDate: new Date(), // Date de la demande (sera ajustée à la signature)
        monthlyRent: property.price,
        depositAmount: property.price * 2, // Convention : 2 mois de caution
        status: 'PENDING',
        isActive: false,
        tenantId: userId,
        propertyId: propertyId
      }
    });

    // 6. 🔒 AUDIT LOG (Traçabilité)
    await logActivity({
        action: "LEASE_APPLICATION", // Pensez à l'ajouter dans logger.ts
        entityId: newLease.id,
        entityType: "LEASE",
        userId: userId,
        metadata: { 
            propertyTitle: property.title,
            rent: property.price 
        }
    });

    return NextResponse.json({ success: true, leaseId: newLease.id });

  } catch (error) {
    console.error("Apply Error:", error);
    return NextResponse.json({ error: "Erreur serveur lors de la candidature." }, { status: 500 });
  }
}

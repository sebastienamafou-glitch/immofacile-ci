import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    // 1. SÉCURITÉ
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) return NextResponse.json({ error: "Utilisateur inconnu" }, { status: 403 });

    // 2. DONNÉES DU BODY
    const body = await request.json();
    const { propertyId } = body;

    if (!propertyId) return NextResponse.json({ error: "ID Propriété manquant" }, { status: 400 });

    // 3. VÉRIFICATIONS MÉTIER
    
    // A. Le bien existe-t-il et est-il publié ?
    const property = await prisma.property.findUnique({
        where: { id: propertyId, isPublished: true }
    });
    if (!property) return NextResponse.json({ error: "Ce bien n'est plus disponible." }, { status: 404 });

    // B. Le locataire a-t-il déjà postulé ? (Doublon)
    const existingApplication = await prisma.lease.findFirst({
        where: {
            tenantId: user.id,
            propertyId: propertyId,
            status: { in: ['PENDING', 'ACTIVE'] } // On bloque si en attente ou déjà loué
        }
    });

    if (existingApplication) {
        return NextResponse.json({ 
            success: false, 
            error: "Vous avez déjà une candidature en cours pour ce bien." 
        }, { status: 409 }); // 409 Conflict
    }

    // 4. CRÉATION DE LA CANDIDATURE (Lease PENDING)
    // Règle de gestion simple : Caution = 2 mois de loyer (Standard CI)
    const newLease = await prisma.lease.create({
        data: {
            startDate: new Date(), // Date de la demande
            monthlyRent: property.price,
            depositAmount: property.price * 2, 
            status: "PENDING",
            isActive: false,
            tenant: { connect: { id: user.id } },
            property: { connect: { id: property.id } }
        }
    });

    return NextResponse.json({ 
        success: true, 
        message: "Candidature envoyée au propriétaire !",
        leaseId: newLease.id
    });

  } catch (error) {
    console.error("Erreur Application:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

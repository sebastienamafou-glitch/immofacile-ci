import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { MissionType, Role } from "@prisma/client";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // 1. SÉCURITÉ : Authentification et Rôle
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Vous devez être connecté." }, { status: 401 });
    }

    // Vérification du rôle dans la base (Sécurité métier)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (!user || (user.role !== Role.OWNER && user.role !== Role.SUPER_ADMIN)) {
      return NextResponse.json({ error: "Seuls les propriétaires peuvent créer des missions." }, { status: 403 });
    }

    // 2. RÉCUPÉRATION ET VALIDATION DES DONNÉES
    const body = await request.json();
    const { propertyId, type, dateScheduled, fee } = body;

    if (!propertyId || !type || !dateScheduled || !fee) {
      return NextResponse.json({ error: "Tous les champs sont requis." }, { status: 400 });
    }

    // Vérifier si le type est conforme à l'Enum du schéma (VISITE, PHOTOS, etc.)
    if (!Object.values(MissionType).includes(type as MissionType)) {
      return NextResponse.json({ error: "Type de mission invalide." }, { status: 400 });
    }

    // 3. VÉRIFICATION DE LA PROPRIÉTÉ
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { ownerId: true }
    });

    if (!property || property.ownerId !== userId) {
      return NextResponse.json({ error: "Propriété introuvable ou accès refusé." }, { status: 403 });
    }

    // 4. CRÉATION DE LA MISSION (Strictement conforme au modèle Mission)
    const newMission = await prisma.mission.create({
      data: {
        type: type as MissionType,
        status: "PENDING", // Valeur par défaut conforme au schéma
        fee: parseInt(fee),
        dateScheduled: new Date(dateScheduled),
        propertyId: propertyId,
        // agentId reste null (optionnel dans le schéma) jusqu'à acceptation
      }
    });

    // 5. AUDIT LOG (Optionnel mais recommandé par votre schéma)
    await prisma.auditLog.create({
      data: {
        action: "MISSION_CREATED",
        entityId: newMission.id,
        entityType: "MISSION",
        userId: userId,
        userEmail: session?.user?.email,
        metadata: { type: newMission.type, fee: newMission.fee }
      }
    });

    return NextResponse.json({ 
      success: true, 
      mission: newMission,
      message: "Votre mission a été publiée avec succès !" 
    }, { status: 201 });

  } catch (error: any) {
    console.error("Erreur création mission:", error);
    return NextResponse.json({ 
      error: "Erreur serveur lors de la création de la mission." 
    }, { status: 500 });
  }
}

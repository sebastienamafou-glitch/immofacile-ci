import { NextResponse } from "next/server";
import { auth } from "@/auth"; // Assurez-vous que ce chemin est correct
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    // 1. SÉCURITÉ : Vérification de l'utilisateur connecté
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Vous devez être connecté." }, { status: 401 });
    }

    // 2. RÉCUPÉRATION DES DONNÉES
    const body = await request.json();
    const { propertyId, type, dateScheduled, fee } = body;

    // 3. VALIDATION RAPIDE
    if (!propertyId || !type || !dateScheduled || !fee) {
      return NextResponse.json({ error: "Tous les champs sont requis." }, { status: 400 });
    }

    // Vérifier si la propriété appartient bien à l'utilisateur (Sécurité)
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { ownerId: true }
    });

    if (!property || property.ownerId !== userId) {
      return NextResponse.json({ error: "Propriété introuvable ou accès refusé." }, { status: 403 });
    }

    // 4. CRÉATION DE LA MISSION
    const newMission = await prisma.mission.create({
      data: {
        type: type, // "VISITE", "ETAT_DES_LIEUX_ENTREE", etc.
        status: "PENDING", // En attente d'un agent
        fee: parseInt(fee), // On s'assure que c'est un entier
        dateScheduled: new Date(dateScheduled), // Conversion string -> Date
        propertyId: propertyId,
        // Pas d'agentId pour l'instant car la mission est "ouverte"
      }
    });

    // Optionnel : Créer une notification ou un log d'audit ici

    return NextResponse.json({ 
      success: true, 
      mission: newMission,
      message: "Votre mission a été publiée avec succès !" 
    }, { status: 201 });

  } catch (error: any) {
    console.error("Erreur création mission:", error);
    return NextResponse.json({ error: "Erreur serveur lors de la création de la mission." }, { status: 500 });
  }
}

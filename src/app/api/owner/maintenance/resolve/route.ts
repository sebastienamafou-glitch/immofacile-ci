import { NextResponse } from "next/server";
import { auth } from "@/auth";

import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client"; // ✅ Import de l'Enum généré

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { incidentId, userEmail, finalCost } = body;

    // 1. Validation des données entrantes
    if (!incidentId || !userEmail) {
      return NextResponse.json({ error: "Données manquantes (ID ou Email)" }, { status: 400 });
    }

    // 2. Vérifier l'utilisateur
    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) {
      return NextResponse.json({ error: "Utilisateur inconnu" }, { status: 401 });
    }

    // 3. Récupérer l'incident ET la propriété liée
    const incident = await prisma.incident.findUnique({
      where: { id: incidentId },
      include: { property: true } 
    });

    if (!incident) {
      return NextResponse.json({ error: "Incident introuvable" }, { status: 404 });
    }

    // 4. SÉCURITÉ : Vérifier que l'utilisateur est bien le PROPRIÉTAIRE ou ADMIN
    const isOwner = incident.property.ownerId === user.id;
    // ✅ UTILISATION DE L'ENUM SÉCURISÉ
    const isAdmin = user.role === Role.SUPER_ADMIN || user.role === Role.ADMIN;

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Action non autorisée. Vous n'êtes pas le propriétaire de ce bien." }, { status: 403 });
    }

    // 5. Mise à jour de l'incident
    const updatedIncident = await prisma.incident.update({
      where: { id: incidentId },
      data: {
        status: 'RESOLVED',
        finalCost: finalCost ? parseInt(finalCost) : incident.finalCost,
      }
    });

    return NextResponse.json({ 
        success: true, 
        message: "Incident résolu avec succès.",
        incident: updatedIncident 
    });

  } catch (error) {
    console.error("Erreur lors de la résolution de l'incident:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

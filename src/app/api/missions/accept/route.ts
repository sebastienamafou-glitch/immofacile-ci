import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Role, MissionStatus } from "@prisma/client";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // 1. SÉCURITÉ : Authentification
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
        return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // 2. VÉRIFICATION DU RÔLE (Conformité Schema User.role)
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
    });

    // Seuls les utilisateurs avec le rôle AGENT peuvent accepter une mission
    if (!user || user.role !== Role.AGENT) {
        return NextResponse.json({ 
            error: "Accès refusé. Seuls les agents peuvent accepter des missions." 
        }, { status: 403 });
    }

    const { missionId } = await request.json();

    if (!missionId) {
        return NextResponse.json({ error: "ID de mission manquant." }, { status: 400 });
    }

    // 3. VÉRIFICATION DE LA DISPONIBILITÉ (Conformité MissionStatus)
    const mission = await prisma.mission.findUnique({
        where: { id: missionId }
    });

    if (!mission) {
        return NextResponse.json({ error: "Mission introuvable" }, { status: 404 });
    }

    // Vérifie si la mission est déjà assignée ou n'est plus en attente
    if (mission.agentId || mission.status !== MissionStatus.PENDING) {
        return NextResponse.json({ 
            error: "Cette mission n'est plus disponible ou a déjà été acceptée." 
        }, { status: 409 });
    }

    // 4. ASSIGNATION ATOMIQUE
    const updatedMission = await prisma.mission.update({
        where: { id: missionId },
        data: {
            agentId: userId,               // Assigne l'ID de l'agent connecté
            status: MissionStatus.ACCEPTED // Passe le statut à ACCEPTED (Enum MissionStatus)
        }
    });

    // 5. AUDIT LOG (Tracé de sécurité selon le schéma)
    await prisma.auditLog.create({
        data: {
            action: "MISSION_ACCEPTED",
            entityId: updatedMission.id,
            entityType: "MISSION",
            userId: userId,
            userEmail: session.user?.email,
            metadata: { previousStatus: "PENDING", newStatus: "ACCEPTED" }
        }
    });

    return NextResponse.json({ 
        success: true, 
        mission: updatedMission,
        message: "Mission acceptée avec succès." 
    });

  } catch (error) {
    console.error("Erreur acceptation mission:", error);
    return NextResponse.json({ error: "Erreur serveur lors de l'acceptation." }, { status: 500 });
  }
}

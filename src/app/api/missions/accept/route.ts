import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    // 1. SÉCURITÉ
    const session = await auth();
    if (!session || !session.user?.id) {
        return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { missionId } = await request.json();
    const agentId = session.user.id;

    // 2. VÉRIFICATION
    // On vérifie que la mission est bien LIBRE (status PENDING et pas d'agent)
    const mission = await prisma.mission.findUnique({
        where: { id: missionId }
    });

    if (!mission) {
        return NextResponse.json({ error: "Mission introuvable" }, { status: 404 });
    }

    if (mission.agentId || mission.status !== "PENDING") {
        return NextResponse.json({ error: "Cette mission a déjà été prise par un autre agent." }, { status: 409 });
    }

    // 3. ASSIGNATION (Action Atomique)
    const updatedMission = await prisma.mission.update({
        where: { id: missionId },
        data: {
            agentId: agentId,     // On assigne l'agent connecté
            status: "ACCEPTED"    // On passe le statut à ACCEPTÉ
        }
    });

    return NextResponse.json({ success: true, mission: updatedMission });

  } catch (error) {
    console.error("Erreur acceptation mission:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

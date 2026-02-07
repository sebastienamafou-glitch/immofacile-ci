import { NextResponse } from "next/server";
import { auth } from "@/auth";

import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// --- SÉCURITÉ : VÉRIFICATION AGENT ---
async function checkAgentPermission(request: Request) {
  const session = await auth();
if (!session || !session.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const userId = session.user.id;
  if (!userId) return { authorized: false, status: 401, error: "Non authentifié" };

  const agent = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true }
  });

  if (!agent || agent.role !== "AGENT") {
    return { authorized: false, status: 403, error: "Accès réservé aux Agents." };
  }

  return { authorized: true, agentId: agent.id };
}

// =====================================================================
// PATCH : METTRE À JOUR LE STATUT D'UNE VISITE
// =====================================================================
export async function PATCH(request: Request) {
  try {
    const auth = await checkAgentPermission(request);
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await request.json();
    const { missionId, status, report } = body; // status: ACCEPTED, COMPLETED, CANCELLED

    if (!missionId || !status) {
        return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
    }

    // Vérifier que la mission appartient bien à l'agent
    const mission = await prisma.mission.findUnique({
        where: { id: missionId },
        select: { agentId: true, type: true }
    });

    if (!mission || mission.agentId !== auth.agentId || mission.type !== 'VISITE') {
        return NextResponse.json({ error: "Mission introuvable ou non assignée." }, { status: 404 });
    }

    // Mise à jour
    const updatedMission = await prisma.mission.update({
        where: { id: missionId },
        data: {
            status: status,
            reportData: report || undefined, // Note de fin de visite
        }
    });

    return NextResponse.json({ success: true, mission: updatedMission });

  } catch (error) {
    console.error("[API_VISITS_PATCH]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

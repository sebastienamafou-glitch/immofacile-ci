import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Singleton

export async function POST(request: Request) {
  try {
    // 1. Sécurité Auth
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const agent = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!agent || agent.role !== "AGENT") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    // 2. Validation Input
    const { missionId } = await request.json();
    if (!missionId) return NextResponse.json({ error: "ID mission manquant" }, { status: 400 });

    // 3. Update Atomique (Vérifie ET Met à jour en une seule opération DB)
    const result = await prisma.mission.updateMany({
      where: {
        id: missionId,
        status: "PENDING", // Doit être en attente
        agentId: null      // Doit être libre (Empêche les doublons)
      },
      data: {
        status: "ACCEPTED",
        agentId: agent.id
      }
    });

    if (result.count === 0) {
      return NextResponse.json({ error: "Mission non disponible ou déjà prise par un collègue." }, { status: 409 });
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Erreur Accept Mission:", error);
    return NextResponse.json({ error: "Erreur serveur", details: error.message }, { status: 500 });
  }
}

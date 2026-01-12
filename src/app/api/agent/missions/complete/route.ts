import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    // 1. Sécurité Auth
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const agent = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!agent || agent.role !== "AGENT") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    const { missionId, reportData } = await request.json();

    // 2. Vérification Propriété
    const mission = await prisma.mission.findUnique({ where: { id: missionId } });
    
    if (!mission) return NextResponse.json({ error: "Mission introuvable" }, { status: 404 });
    if (mission.agentId !== agent.id) return NextResponse.json({ error: "Cette mission ne vous appartient pas" }, { status: 403 });
    if (mission.status !== "ACCEPTED") return NextResponse.json({ error: "Mission déjà terminée" }, { status: 400 });

    // 3. TRANSACTION FINANCIÈRE SÉCURISÉE
    // On met à jour la mission ET le solde de l'agent en même temps
    await prisma.$transaction([
        // A. Marquer la mission comme terminée
        prisma.mission.update({
            where: { id: missionId },
            data: {
                status: "COMPLETED",
                // Si vous avez un champ 'report' ou 'note' dans votre schema Prisma, décommentez ceci :
                // report: reportData?.note || "Mission validée"
            }
        }),
        // B. Verser la commission à l'agent
        prisma.user.update({
            where: { id: agent.id },
            data: {
                referralBalance: { increment: mission.fee || 0 } // On ajoute le montant de la mission
            }
        })
    ]);

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Erreur Complete Mission:", error);
    return NextResponse.json({ error: "Erreur serveur", details: error.message }, { status: 500 });
  }
}

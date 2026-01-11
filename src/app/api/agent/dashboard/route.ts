import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    // Récupère l'agent connecté
    const agent = await prisma.user.findFirst({
      where: { role: "AGENT" },
      include: {
        missionsAccepted: {
            where: { status: "COMPLETED" }
        },
        leads: { take: 5, orderBy: { createdAt: 'desc' } }
      }
    });

    if (!agent) {
       // Fallback si pas d'agent, pour ne pas crash l'UI
       return NextResponse.json({ success: false, message: "Profil Agent introuvable" });
    }

    // Récupère les missions disponibles dans la zone (Simulé : toutes les missions PENDING)
    const availableMissions = await prisma.mission.count({
        where: { status: "PENDING" }
    });

    return NextResponse.json({
      success: true,
      user: agent,
      stats: {
        completedMissions: agent.missionsAccepted.length,
        availableMissions: availableMissions,
        commissionEarned: agent.referralBalance || 0
      },
      recentLeads: agent.leads
    });

  } catch (error) {
    console.error("Erreur Agent:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

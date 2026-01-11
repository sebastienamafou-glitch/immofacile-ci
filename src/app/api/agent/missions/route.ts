import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    // 1. Missions disponibles (Marketplace)
    const available = await prisma.mission.findMany({
      where: { status: "PENDING" },
      include: { property: { select: { address: true, commune: true, type: true } } },
      orderBy: { dateScheduled: 'asc' }
    });

    // 2. Mes missions (Acceptées par l'agent courant)
    const myMissions = await prisma.mission.findMany({
      where: { 
        agent: { role: "AGENT" }, // À remplacer par agentId dynamique
        status: { in: ["ACCEPTED", "COMPLETED"] } 
      },
      include: { property: true }
    });

    return NextResponse.json({
      success: true,
      available,
      myMissions
    });

  } catch (error) {
    return NextResponse.json({ error: "Erreur missions" }, { status: 500 });
  }
}

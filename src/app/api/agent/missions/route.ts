import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Singleton

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. SÉCURITÉ
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const agent = await prisma.user.findUnique({ where: { email: userEmail } });

    // ✅ CHECK RÔLE STRICT (Manquait dans votre version)
    if (!agent || agent.role !== "AGENT") {
        return NextResponse.json({ error: "Accès réservé aux agents." }, { status: 403 });
    }

    // 2. LOGIQUE MÉTIER

    // A. Marketplace : Missions en attente (disponibles pour tous)
    const available = await prisma.mission.findMany({
      where: { 
        status: "PENDING",
        agentId: null 
      },
      include: { 
        property: { 
            select: { address: true, commune: true, type: true } 
        } 
      },
      orderBy: { dateScheduled: 'asc' }
    });

    // B. Mes missions : Celles assignées à CET agent
    const myMissions = await prisma.mission.findMany({
      where: { 
        agentId: agent.id, 
        status: { in: ["ACCEPTED", "COMPLETED"] } 
      },
      include: { 
        property: {
            select: { address: true, commune: true, type: true }
        }
      },
      orderBy: { dateScheduled: 'desc' }
    });

    return NextResponse.json({
      success: true,
      data: {
          available,
          myMissions
      }
    });

  } catch (error: any) {
    console.error("Erreur API Missions:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

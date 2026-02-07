import { NextResponse } from "next/server";
import { auth } from "@/auth";

import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. SÉCURITÉ ZERO TRUST (ID injecté par Middleware)
    const session = await auth();
if (!session || !session.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const userId = session.user.id;
    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    // 2. VÉRIFICATION RÔLE (Via ID)
    const agent = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true } // On ne récupère que le nécessaire
    });

    if (!agent || agent.role !== "AGENT") {
        return NextResponse.json({ error: "Accès réservé aux agents." }, { status: 403 });
    }

    // 3. LOGIQUE MÉTIER

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
      orderBy: { createdAt: 'desc' } // Plus récentes en premier
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

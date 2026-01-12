import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // ✅ Singleton OK

// Indispensable pour éviter que Next.js ne cache la réponse
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. SÉCURITÉ : On récupère l'agent connecté via le Middleware
    const userEmail = request.headers.get("x-user-email");
    
    if (!userEmail) {
        return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // On récupère l'ID de l'agent
    const agent = await prisma.user.findUnique({
        where: { email: userEmail }
    });

    if (!agent) {
        return NextResponse.json({ error: "Compte agent introuvable" }, { status: 404 });
    }

    // 2. LOGIQUE MÉTIER

    // A. Marketplace : Missions en attente (disponibles pour tous les agents)
    const available = await prisma.mission.findMany({
      where: { 
        status: "PENDING",
        agentId: null // On s'assure qu'elle n'est pas déjà prise
      },
      include: { 
        property: { 
            select: { address: true, commune: true, type: true } 
        } 
      },
      orderBy: { dateScheduled: 'asc' }
    });

    // B. Mes missions : Celles assignées spécifiquement à CET agent
    const myMissions = await prisma.mission.findMany({
      where: { 
        agentId: agent.id, // ✅ Correction critique : filtrage par ID
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
    return NextResponse.json({ error: "Erreur serveur", details: error.message }, { status: 500 });
  }
}

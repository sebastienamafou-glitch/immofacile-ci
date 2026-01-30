import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // 1. SÉCURITÉ ZERO TRUST (ID injecté par Middleware)
    const userId = request.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    // 2. VÉRIFICATION RÔLE VIA ID (Plus sûr que l'email)
    const agent = await prisma.user.findUnique({ 
        where: { id: userId },
        select: { id: true, role: true }
    });
    
    if (!agent || agent.role !== "AGENT") {
        return NextResponse.json({ error: "Accès refusé. Réservé aux agents." }, { status: 403 });
    }

    // 3. VALIDATION INPUT
    const body = await request.json();
    const { missionId } = body;

    if (!missionId) return NextResponse.json({ error: "ID mission manquant" }, { status: 400 });

    // 4. UPDATE ATOMIQUE (Sécurisé)
    const result = await prisma.mission.updateMany({
      where: {
        id: missionId,
        status: "PENDING", // Doit être en attente
        agentId: null      // Doit être libre
      },
      data: {
        status: "ACCEPTED",
        agentId: agent.id
      }
    });

    if (result.count === 0) {
      return NextResponse.json({ 
          error: "Désolé, cette mission n'est plus disponible." 
      }, { status: 409 });
    }

    return NextResponse.json({ success: true, message: "Mission acceptée avec succès !" });

  } catch (error: any) {
    console.error("Erreur Accept Mission:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

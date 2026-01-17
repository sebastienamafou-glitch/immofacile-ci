import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Singleton

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // 1. SÉCURITÉ AUTH
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const agent = await prisma.user.findUnique({ where: { email: userEmail } });
    
    // ✅ Check Rôle Agent Strict
    if (!agent || agent.role !== "AGENT") {
        return NextResponse.json({ error: "Accès refusé. Réservé aux agents." }, { status: 403 });
    }

    // 2. VALIDATION INPUT
    const body = await request.json();
    const { missionId } = body;

    if (!missionId) return NextResponse.json({ error: "ID mission manquant" }, { status: 400 });

    // 3. UPDATE ATOMIQUE (Anti-Race Condition)
    // On essaie de mettre à jour SEULEMENT SI elle est encore libre
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

    // Si count === 0, c'est que quelqu'un l'a prise 1ms avant nous
    if (result.count === 0) {
      return NextResponse.json({ 
          error: "Désolé, cette mission n'est plus disponible ou a déjà été prise." 
      }, { status: 409 });
    }

    return NextResponse.json({ success: true, message: "Mission acceptée avec succès !" });

  } catch (error: any) {
    console.error("Erreur Accept Mission:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

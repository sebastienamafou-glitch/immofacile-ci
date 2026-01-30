import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    // 1. SÉCURITÉ ZERO TRUST (ID injecté par Middleware)
    const userId = req.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // 2. VÉRIFICATION RÔLE (Via ID)
    const agent = await prisma.user.findUnique({ 
        where: { id: userId },
        select: { id: true, role: true }
    });

    if (!agent || agent.role !== "AGENT") {
      return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
    }

    // 3. VALIDATION
    const body = await req.json();
    const { missionId, reportNote } = body; 

    if (!missionId) {
      return NextResponse.json({ error: "ID Mission manquant" }, { status: 400 });
    }

    const mission = await prisma.mission.findUnique({
      where: { id: missionId },
      include: { 
        property: { select: { address: true } } 
      }
    });

    if (!mission) return NextResponse.json({ error: "Mission introuvable" }, { status: 404 });

    // Sécurité : Vérifier l'assignation
    if (mission.agentId !== agent.id) {
      return NextResponse.json({ error: "Cette mission ne vous est pas attribuée." }, { status: 403 });
    }

    if (mission.status !== "ACCEPTED") {
      return NextResponse.json({ error: "Statut invalide pour clôture (Déjà finie ?)." }, { status: 400 });
    }

    // 4. TRANSACTION FINANCIÈRE ATOMIQUE
    await prisma.$transaction([
      // A. Clôture Mission
      prisma.mission.update({
        where: { id: missionId },
        data: {
          status: "COMPLETED",
          reportData: reportNote || "Mission validée sans note."
        }
      }),

      // B. Paiement Agent (Wallet)
      prisma.user.update({
        where: { id: agent.id },
        data: {
          walletBalance: { increment: mission.fee }
        }
      }),

      // C. Trace Comptable
      prisma.transaction.create({
        data: {
          amount: mission.fee,
          type: "CREDIT",
          reason: `Mission terminée : ${mission.property.address}`,
          status: "SUCCESS",
          userId: agent.id
        }
      })
    ]);

    return NextResponse.json({ 
      success: true, 
      message: "Mission terminée. Portefeuille crédité." 
    });

  } catch (error: any) {
    console.error("Erreur Complete Mission:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

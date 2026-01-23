import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    // 1. AUTHENTIFICATION & SÉCURITÉ
    const userEmail = req.headers.get("x-user-email");
    if (!userEmail) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const agent = await prisma.user.findUnique({ where: { email: userEmail } });

    // Vérification Rôle
    if (!agent || agent.role !== "AGENT") {
      return NextResponse.json({ error: "Accès refusé. Réservé aux agents." }, { status: 403 });
    }

    // 2. VALIDATION DES DONNÉES ENTRANTES
    const body = await req.json();
    // On récupère 'reportNote' car c'est ce que le frontend envoie (MissionActionPanel.tsx)
    const { missionId, reportNote } = body; 

    if (!missionId) {
      return NextResponse.json({ error: "ID Mission manquant" }, { status: 400 });
    }

    // 3. VÉRIFICATION DE LA MISSION
    const mission = await prisma.mission.findUnique({
      where: { id: missionId },
      include: { 
        property: { 
          select: { address: true } 
        } 
      }
    });

    if (!mission) {
      return NextResponse.json({ error: "Mission introuvable" }, { status: 404 });
    }

    // Sécurité : Vérifier que c'est bien SA mission
    if (mission.agentId !== agent.id) {
      return NextResponse.json({ error: "Cette mission ne vous est pas attribuée." }, { status: 403 });
    }

    // Logique métier : Impossible de finir une mission annulée ou déjà finie
    if (mission.status !== "ACCEPTED") {
      return NextResponse.json({ error: "La mission n'est pas active (Déjà terminée ?)" }, { status: 400 });
    }

    // 4. TRANSACTION ATOMIQUE (Tout ou rien)
    await prisma.$transaction([
      // A. Mise à jour du statut de la mission
      prisma.mission.update({
        where: { id: missionId },
        data: {
          status: "COMPLETED",
          reportData: reportNote || "Mission validée sans note."
        }
      }),

      // B. Paiement de l'Agent (Incrémentation Wallet)
      prisma.user.update({
        where: { id: agent.id },
        data: {
          walletBalance: { increment: mission.fee }
        }
      }),

      // C. Création de la trace comptable
      prisma.transaction.create({
        data: {
          amount: mission.fee,
          type: "CREDIT",
          reason: `Mission terminée : ${mission.property.address}`,
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
    return NextResponse.json(
      { error: "Erreur serveur", details: error.message }, 
      { status: 500 }
    );
  }
}

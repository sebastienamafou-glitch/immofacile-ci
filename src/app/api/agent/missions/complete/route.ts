import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Singleton

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // 1. SÉCURITÉ AUTH
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const agent = await prisma.user.findUnique({ where: { email: userEmail } });
    
    // ✅ Check Rôle
    if (!agent || agent.role !== "AGENT") {
        return NextResponse.json({ error: "Accès refusé. Réservé aux agents." }, { status: 403 });
    }

    const body = await request.json();
    const { missionId, reportData } = body;

    if (!missionId) return NextResponse.json({ error: "ID Mission manquant" }, { status: 400 });

    // 2. VÉRIFICATION PROPRIÉTÉ DE LA MISSION
    const mission = await prisma.mission.findUnique({ 
        where: { id: missionId },
        include: { property: { select: { address: true } } } // On récupère l'adresse pour le libellé
    });
    
    if (!mission) return NextResponse.json({ error: "Mission introuvable" }, { status: 404 });
    if (mission.agentId !== agent.id) return NextResponse.json({ error: "Cette mission ne vous appartient pas" }, { status: 403 });
    if (mission.status !== "ACCEPTED") return NextResponse.json({ error: "Mission déjà terminée ou pas encore acceptée" }, { status: 400 });

    // 3. TRANSACTION ATOMIQUE (Validation + Paiement + Trace)
    await prisma.$transaction([
        // A. Marquer la mission comme terminée
        prisma.mission.update({
            where: { id: missionId },
            data: {
                status: "COMPLETED",
                // report: reportData?.note || "Mission validée" // Décommentez si le champ existe
            }
        }),

        // B. Verser la commission (Correction: walletBalance)
        prisma.user.update({
            where: { id: agent.id },
            data: {
                walletBalance: { increment: mission.fee || 0 } // ✅ Uniformisation avec le reste de l'app
            }
        }),

        // C. Créer la preuve comptable (Transaction)
        prisma.transaction.create({
            data: {
                amount: mission.fee || 0,
                type: "CREDIT",
                reason: `Mission terminée : ${mission.property.address}`,
                user: { connect: { id: agent.id } }
            }
        })
    ]);

    return NextResponse.json({ success: true, message: "Mission terminée et payée !" });

  } catch (error: any) {
    console.error("Erreur Complete Mission:", error);
    return NextResponse.json({ error: "Erreur serveur", details: error.message }, { status: 500 });
  }
}

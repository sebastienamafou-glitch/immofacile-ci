import { NextResponse } from "next/server";
import { auth } from "@/auth";

import { prisma } from "@/lib/prisma";


export async function POST(req: Request) {
  try {
    // 1. SÉCURITÉ : Session Serveur
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json();
    const { missionId, reportData } = body;

    if (!missionId) {
        return NextResponse.json({ error: "ID mission manquant" }, { status: 400 });
    }

    // 2. TRANSACTION FINANCIÈRE ATOMIQUE
    const result = await prisma.$transaction(async (tx) => {
        
        // A. Vérification de la Mission (Lock)
        const mission = await tx.mission.findUnique({
            where: { id: missionId },
            include: { agent: { include: { finance: true } } }
        });

        // Contrôles de sécurité
        if (!mission) throw new Error("Mission introuvable");
        if (mission.agentId !== userId) throw new Error("Cette mission ne vous est pas assignée");
        if (mission.status !== "ACCEPTED") throw new Error("Mission déjà terminée ou non active");

        const fee = mission.fee || 0;

        // B. Mise à jour statut Mission
        const updatedMission = await tx.mission.update({
            where: { id: missionId },
            data: {
                status: "COMPLETED",
                reportData: reportData || "Mission validée.",
                // On peut ajouter ici la date de fin réelle si prévue dans le schéma
            }
        });

        // C. Rémunération de l'Agent (CORRECTION SCHEMA)
        if (fee > 0) {
            // On cible UserFinance, pas User
            const finance = await tx.userFinance.findUnique({ where: { userId } });
            
            if (finance) {
                await tx.userFinance.update({
                    where: { userId },
                    data: {
                        walletBalance: { increment: fee },
                        version: { increment: 1 } // Optimistic Lock
                    }
                });
            } else {
                // Self-healing : On crée le wallet s'il manque
                await tx.userFinance.create({
                    data: {
                        userId,
                        walletBalance: fee,
                        version: 1
                    }
                });
            }

            // D. Audit Trail (Obligatoire)
            await tx.transaction.create({
                data: {
                    amount: fee,
                    type: "CREDIT",
                    balanceType: "WALLET",
                    reason: `Rémunération Mission #${mission.id.substring(0, 8)}`,
                    status: "SUCCESS",
                    userId: userId,
                    reference: `MISSION-${mission.id}`
                }
            });
        }

        return updatedMission;
    });

    return NextResponse.json({ success: true, mission: result });

  } catch (error: any) {
    console.error("Erreur Completion Mission:", error.message);
    return NextResponse.json({ error: error.message || "Erreur serveur" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { auth } from "@/auth";

import { prisma } from "@/lib/prisma";


export async function POST(req: Request) {
  try {
    // 1. SÉCURITÉ : Session Serveur (v5)
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json();
    const { leaseId, deductionAmount, reason } = body;

    if (!leaseId) {
        return NextResponse.json({ error: "ID du bail requis" }, { status: 400 });
    }

    // 2. TRANSACTION DE CLÔTURE
    const result = await prisma.$transaction(async (tx) => {
        
        // A. Vérification (Lock)
        const lease = await tx.lease.findUnique({
            where: { id: leaseId },
            include: { property: true }
        });

        if (!lease) throw new Error("Bail introuvable");
        
        // Vérif Propriétaire
        if (lease.property.ownerId !== userId) {
            throw new Error("Vous n'êtes pas le propriétaire de ce bail.");
        }

        if (lease.status !== "ACTIVE") {
            throw new Error("Ce bail n'est pas actif.");
        }

        // B. Mise à jour statut Bail
        const updatedLease = await tx.lease.update({
            where: { id: leaseId },
            data: {
                // ✅ CORRECTION : On utilise le terme technique valide pour un contrat
                status: "TERMINATED", 
                isActive: false,
                endDate: new Date() // On fige la date de fin réelle
            }
        });

        // C. Gestion des Retenues (Deductions)
        if (deductionAmount && deductionAmount > 0) {
            
            // 1. Créditer le Propriétaire (Dans UserFinance)
            await tx.userFinance.upsert({
                where: { userId: userId },
                create: { userId: userId, walletBalance: deductionAmount, version: 1, kycTier: 1 },
                update: {
                    walletBalance: { increment: deductionAmount },
                    version: { increment: 1 }
                }
            });

            // 2. Créer la Transaction (Trace)
            await tx.transaction.create({
                data: {
                    userId: userId,
                    amount: deductionAmount,
                    type: "CREDIT",
                    balanceType: "WALLET",
                    reason: reason || "Retenue sur caution",
                    status: "SUCCESS",
                    reference: `LEASE-END-${lease.id.substring(0, 8)}`
                }
            });
        }

        return updatedLease;
    });

    return NextResponse.json({ success: true, lease: result });

  } catch (error: any) {
    console.error("Erreur End Lease:", error.message);
    return NextResponse.json({ error: error.message || "Erreur serveur" }, { status: 500 });
  }
}

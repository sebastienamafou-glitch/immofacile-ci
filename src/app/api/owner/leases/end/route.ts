import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/logger"; 
import { sendNotification } from "@/lib/notifications"; 

export async function POST(req: Request) {
  try {
    // 1. SÉCURITÉ
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const body = await req.json();
    const { leaseId, deductionAmount, reason } = body;

    if (!leaseId) return NextResponse.json({ error: "ID du bail requis" }, { status: 400 });

    // Typage sécurisé (Schéma Prisma attend un Int/Float, pas un string)
    const safeAmount = deductionAmount ? Number(deductionAmount) : 0;

    // 2. TRANSACTION ATOMIQUE
    const result = await prisma.$transaction(async (tx) => {
        
        // A. Vérification (Lock)
        const lease = await tx.lease.findUnique({
            where: { id: leaseId },
            include: { property: true } // On a besoin du ownerId pour vérifier
        });

        if (!lease) throw new Error("Bail introuvable");
        
        // Vérif Propriétaire via la relation Property définie dans le schema
        if (lease.property.ownerId !== userId) {
            throw new Error("Vous n'êtes pas le propriétaire de ce bail.");
        }

        if (lease.status !== "ACTIVE") {
            throw new Error("Ce bail n'est pas actif.");
        }

        // B. Clôture du Bail
        const updatedLease = await tx.lease.update({
            where: { id: leaseId },
            data: {
                status: "TERMINATED", 
                isActive: false,
                endDate: new Date() 
            },
            // ✅ CORRECTION CRITIQUE ICI :
            // On demande explicitement la relation 'property' pour avoir l'adresse plus bas
            include: {
                property: true
            }
        });

        // C. Gestion Financière
        if (safeAmount > 0) {
            await tx.userFinance.upsert({
                where: { userId: userId },
                create: { userId: userId, walletBalance: safeAmount, version: 1, kycTier: 1 },
                update: {
                    walletBalance: { increment: safeAmount },
                    version: { increment: 1 }
                }
            });

            await tx.transaction.create({
                data: {
                    userId: userId,
                    amount: safeAmount,
                    type: "CREDIT",
                    balanceType: "WALLET",
                    reason: reason || "Retenue sur caution",
                    status: "SUCCESS",
                    reference: `LEASE-END-${lease.id.substring(0, 8)}`
                }
            });
        }

        return { updatedLease, tenantId: lease.tenantId };
    });

    // 3. ACTIONS POST-TRANSACTION
    
    // A. Notification au locataire
    if (result.tenantId) {
        await sendNotification({
            userId: result.tenantId,
            title: "Bail Terminé 🏠",
            // ✅ MAINTENANT CA MARCHE : result.updatedLease.property existe grâce au include
            message: `Votre bail pour "${result.updatedLease.property.address}" a été clôturé.`,
            type: "INFO",
            link: `/dashboard/tenant/contracts/${leaseId}`
        });
    }

    // B. Audit Log
    await logActivity({
        action: "LEASE_TERMINATED",
        entityId: leaseId,
        entityType: "LEASE",
        userId: userId,
        metadata: { deduction: safeAmount, reason: reason }
    });

    return NextResponse.json({ success: true, lease: result.updatedLease });

  } catch (error: any) {
    console.error("Erreur End Lease:", error.message);
    return NextResponse.json({ error: error.message || "Erreur serveur" }, { status: 500 });
  }
}

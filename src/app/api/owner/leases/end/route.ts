import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    // 1. SÉCURITÉ ZERO TRUST (Middleware ID)
    const userId = req.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    // 2. PARSING & VALIDATION INPUT
    const body = await req.json();
    const { leaseId, deduction, comment } = body;

    if (!leaseId) return NextResponse.json({ error: "ID du bail manquant" }, { status: 400 });

    const deductionAmount = Math.abs(Number(deduction) || 0); // Force positif

    // 3. RÉCUPÉRATION SÉCURISÉE
    const lease = await prisma.lease.findUnique({
        where: { id: leaseId },
        include: { property: true }
    });

    if (!lease) return NextResponse.json({ error: "Bail introuvable" }, { status: 404 });
    
    // VERROU DE SÉCURITÉ : Anti-IDOR
    if (lease.property.ownerId !== userId) {
        return NextResponse.json({ error: "Accès refusé : Ce bail ne vous appartient pas." }, { status: 403 });
    }

    if (!lease.isActive) {
        return NextResponse.json({ error: "Ce bail est déjà clôturé." }, { status: 400 });
    }

    // 4. SÉCURITÉ FINANCIÈRE
    if (deductionAmount > lease.depositAmount) {
        return NextResponse.json({ 
            error: `La retenue (${deductionAmount.toLocaleString()} F) dépasse la caution disponible.` 
        }, { status: 400 });
    }

    const refundAmount = lease.depositAmount - deductionAmount;

    // 5. TRANSACTION ATOMIQUE (Bank Grade)
    await prisma.$transaction(async (tx) => {
        
        // A. CLÔTURER LE BAIL
        await tx.lease.update({
            where: { id: leaseId },
            data: {
                isActive: false,
                status: "TERMINATED",
                endDate: new Date(), // Date de sortie immédiate
                // On pourrait loguer le commentaire dans une note interne si le schéma le permettait
            }
        });

        // B. LIBÉRER LA PROPRIÉTÉ (Code Définitif)
        // La propriété redevient disponible pour un nouveau locataire
        await tx.property.update({
            where: { id: lease.propertyId },
            data: { 
                isAvailable: true 
            }
        });

        // C. MOUVEMENTS FINANCIERS (Code Définitif)
        
        // C1. Encaissement de la retenue par le Propriétaire
        if (deductionAmount > 0) {
            await tx.transaction.create({
                data: {
                    userId: userId,
                    amount: deductionAmount,
                    type: "CREDIT",
                    reason: `RETENUE_CAUTION_BAIL_${lease.id.slice(-6).toUpperCase()}`,
                    status: "SUCCESS"
                }
            });
            
            await tx.user.update({
                where: { id: userId },
                data: { walletBalance: { increment: deductionAmount } }
            });
        }
        
        // C2. Remboursement du solde au Locataire
        if (refundAmount > 0) {
             await tx.transaction.create({
                data: {
                    userId: lease.tenantId,
                    amount: refundAmount,
                    type: "CREDIT",
                    reason: `REMBOURSEMENT_CAUTION_BAIL_${lease.id.slice(-6).toUpperCase()}`,
                    status: "SUCCESS"
                }
            });
            
            await tx.user.update({
                where: { id: lease.tenantId },
                data: { walletBalance: { increment: refundAmount } }
            });
        }
    });

    // 6. INTELLIGENCE RELOGEMENT
    const isGoodTenant = deductionAmount <= (lease.depositAmount * 0.2); // Moins de 20% de retenue
    let rehousingProposals: any[] = [];

    if (isGoodTenant) {
        // Proposition de biens VACANTS du même propriétaire
        rehousingProposals = await prisma.property.findMany({
            where: {
                ownerId: userId,
                id: { not: lease.propertyId },
                isAvailable: true // Utilisation du champ natif
            },
            take: 3,
            select: { id: true, title: true, price: true, commune: true, images: true }
        });
    }

    return NextResponse.json({ 
        success: true,
        refundAmount,
        isGoodTenant,
        rehousingProposals
    });

  } catch (error: any) {
    console.error("Erreur Clôture Bail:", error);
    return NextResponse.json({ error: "Erreur serveur critique." }, { status: 500 });
  }
}

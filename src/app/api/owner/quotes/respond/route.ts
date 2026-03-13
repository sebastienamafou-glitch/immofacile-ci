import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

const FINANCE_RULES = {
  PLATFORM_FEE_RATE: 0.05, 
  TVA_RATE: 0.18,          
  CURRENCY: "XOF"
};

const respondSchema = z.object({
  quoteId: z.string().cuid(),
  action: z.enum(['ACCEPT', 'REJECT'])
});

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const txId = uuidv4(); 

  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
        return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    }

    const body = await req.json();
    const validation = respondSchema.safeParse(body);
    
    if (!validation.success) {
        return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }
    const { quoteId, action } = validation.data;

    const userFinance = await prisma.userFinance.findUnique({ where: { userId } });

    const quote = await prisma.quote.findUnique({
        where: { id: quoteId },
        include: { 
            incident: { include: { property: true } },
            artisan: { select: { id: true } }
        }
    });

    if (!quote || quote.incident.property.ownerId !== userId) {
        return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    if (quote.status !== 'PENDING') {
        return NextResponse.json({ error: "Ce devis n'est plus en attente" }, { status: 400 });
    }

    if (action === 'REJECT') {
        await prisma.$transaction([
            prisma.quote.update({
                where: { id: quoteId },
                data: { status: 'REJECTED' }
            }),
            prisma.notification.create({
                data: {
                    userId: quote.artisanId,
                    title: "Devis Refusé ❌",
                    message: `Le devis pour l'incident "${quote.incident.title}" a été refusé.`,
                    type: "ERROR",
                    link: `/dashboard/artisan/incidents/${quote.incidentId}`
                }
            })
        ]);
        return NextResponse.json({ success: true, status: 'REJECTED' });
    }

    if (action === 'ACCEPT') {
        const amountToPay = quote.totalAmount;
        const currentBalance = userFinance?.walletBalance || 0;

        if (currentBalance < amountToPay) {
            return NextResponse.json({ 
                error: "Solde insuffisant", 
                code: "INSUFFICIENT_FUNDS",
                required: amountToPay,
                balance: currentBalance,
                redirectUrl: `/dashboard/owner/wallet/topup?amount=${amountToPay - currentBalance}`
            }, { status: 402 }); 
        }

        const platformFeeHT = Math.floor(amountToPay * FINANCE_RULES.PLATFORM_FEE_RATE);
        const platformTax = Math.floor(platformFeeHT * FINANCE_RULES.TVA_RATE);
        const platformTotal = platformFeeHT + platformTax;
        const artisanNet = amountToPay - platformTotal;

        const result = await prisma.$transaction(async (tx) => {
            
            // 1. Débit Propriétaire
            const updatedFinance = await tx.userFinance.update({
                where: { userId: userId }, // Retrait de la version optimiste si le champ n'existe pas dans le schéma actuel
                data: { walletBalance: { decrement: amountToPay } }
            });

            // 2. Crédit Artisan
            await tx.userFinance.upsert({
                where: { userId: quote.artisanId },
                create: { userId: quote.artisanId, walletBalance: artisanNet },
                update: { walletBalance: { increment: artisanNet } }
            });

            // 3. Traçabilité (Table Transaction)
            const paymentRef = `DEV-${quote.number}-${Date.now()}`;
            await tx.transaction.create({
                data: {
                    userId: userId,
                    type: 'DEBIT',
                    amount: amountToPay,
                    balanceType: 'WALLET',
                    reason: `Paiement du devis ${quote.number}`,
                    status: 'SUCCESS',
                    reference: paymentRef
                }
            });

            await tx.transaction.create({
                data: {
                    userId: quote.artisanId,
                    type: 'CREDIT',
                    amount: artisanNet,
                    balanceType: 'WALLET',
                    reason: `Règlement du devis ${quote.number}`,
                    status: 'SUCCESS',
                    reference: paymentRef + "-C"
                }
            });

            // 4. Mise à jour des statuts
            await tx.quote.update({
                where: { id: quoteId },
                data: { status: 'ACCEPTED' }
            });

            await tx.incident.update({
                where: { id: quote.incidentId },
                data: { status: 'IN_PROGRESS' }
            });

            // 5. Notifications
            await tx.notification.create({
                data: {
                    userId: quote.artisanId,
                    title: "Devis Validé & Payé 💰",
                    message: `Le devis pour "${quote.incident.title}" a été payé. ${artisanNet} FCFA ont été crédités.`,
                    type: "SUCCESS",
                    link: `/dashboard/artisan/incidents/${quote.incidentId}`
                }
            });

            return { success: true, newBalance: updatedFinance.walletBalance };
        });

        return NextResponse.json(result);
    }

  } catch (error) {
    console.error(`[QUOTE_RESPOND_ERROR] Tx: ${txId}`, error);
    return NextResponse.json({ error: "Erreur serveur lors de la transaction" }, { status: 500 });
  }
}

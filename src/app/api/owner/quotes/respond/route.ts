import { NextResponse } from "next/server";
import { auth } from "@/auth";

import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

// 🛡️ NORMES FINANCIÈRES 
const FINANCE_RULES = {
  PLATFORM_FEE_RATE: 0.05, // 5% de frais de service sur travaux
  TVA_RATE: 0.18,          // TVA UEMOA
  CURRENCY: "XOF"
};

// Validation des entrées
const respondSchema = z.object({
  quoteId: z.string().cuid(),
  action: z.enum(['ACCEPT', 'REJECT']),
  idempotencyKey: z.string().optional() // Optionnel pour l'instant, mais recommandé
});

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const txId = uuidv4(); // ID de trace interne

  try {
    // 1. 🔒 AUTHENTIFICATION STRICTE (Session-Only)
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
        return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    }

    // 2. 🛡️ VALIDATION & RÉCUPÉRATION
    const body = await req.json();
    const validation = respondSchema.safeParse(body);
    
    if (!validation.success) {
        return NextResponse.json({ error: "Données invalides", details: validation.error.format() }, { status: 400 });
    }
    const { quoteId, action } = validation.data;

    // Récupération Profil Financier & Devis
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { finance: true }
    });

    const quote = await prisma.quote.findUnique({
        where: { id: quoteId },
        include: { 
            incident: { include: { property: true } },
            artisan: { select: { id: true, email: true } }
        }
    });

    // Sécurité IDOR (Droit d'accès)
    if (!quote || quote.incident.property.ownerId !== userId) {
        return NextResponse.json({ error: "Accès refusé à ce devis" }, { status: 403 });
    }

    if (quote.status !== 'PENDING') {
        return NextResponse.json({ error: "Ce devis n'est plus en attente" }, { status: 400 });
    }

    // --- SCÉNARIO REFUS (Simple update) ---
    if (action === 'REJECT') {
        await prisma.quote.update({
            where: { id: quoteId },
            data: { status: 'REJECTED' }
        });
        
        // Notif Artisan
        await prisma.notification.create({
            data: {
                userId: quote.artisanId,
                title: "Devis Refusé ❌",
                message: `Le propriétaire a décliné votre proposition pour "${quote.incident.title}".`,
                type: "ERROR",
                link: `/dashboard/artisan/incidents/${quote.incidentId}`
            }
        });

        return NextResponse.json({ success: true, status: 'REJECTED' });
    }

    // --- SCÉNARIO ACCEPTATION (TRANSACTION FINANCIÈRE) ---
    if (action === 'ACCEPT') {
        
        // A. VÉRIFICATION SOLVABILITÉ 💰
        const amountToPay = quote.totalAmount;
        const currentBalance = user?.finance?.walletBalance || 0;

        if (currentBalance < amountToPay) {
            // ECHEC : Fonds insuffisants -> Redirection vers recharge
            return NextResponse.json({ 
                error: "Solde insuffisant", 
                code: "INSUFFICIENT_FUNDS",
                required: amountToPay,
                balance: currentBalance,
                redirectUrl: `/dashboard/owner/wallet/topup?amount=${amountToPay - currentBalance}`
            }, { status: 402 }); // 402 Payment Required
        }

        // B. CALCUL VENTILATION (SPLIT PAYMENT) 🧮
        const platformFeeHT = Math.floor(amountToPay * FINANCE_RULES.PLATFORM_FEE_RATE);
        const platformTax = Math.floor(platformFeeHT * FINANCE_RULES.TVA_RATE);
        const platformTotal = platformFeeHT + platformTax;
        
        const artisanNet = amountToPay - platformTotal;

        // C. EXÉCUTION ATOMIQUE (PRISMA TRANSACTION) ⚛️
        const result = await prisma.$transaction(async (tx) => {
            
            // 1. Débit Propriétaire (Verrouillage Optimiste)
            // On vérifie la version pour éviter les doubles clics simultanés
            const updatedFinance = await tx.userFinance.update({
                where: { userId: userId, version: user?.finance?.version },
                data: { 
                    walletBalance: { decrement: amountToPay },
                    monthlyVolume: { increment: amountToPay },
                    version: { increment: 1 } // Incrément de sécurité
                }
            });

            // 2. Crédit Artisan (ou Escrow selon règles, ici Wallet direct pour simplifier)
            // Idéalement, on créditerait un compte séquestre "Escrow" jusqu'à la fin des travaux
            // Pour l'instant, on crédite le wallet de l'artisan
            await tx.userFinance.upsert({
                where: { userId: quote.artisanId },
                create: { userId: quote.artisanId, walletBalance: artisanNet, version: 1 },
                update: { 
                    walletBalance: { increment: artisanNet },
                    version: { increment: 1 }
                }
            });

            // 3. Audit Trail (Log Paiement)
            const paymentRef = `PAY-Q-${quote.number}-${Date.now()}`;
            await tx.payment.create({
                data: {
                    amount: amountToPay,
                    type: 'FEE', // Ou 'WORK' si dispo dans enum
                    status: 'SUCCESS',
                    method: 'WALLET',
                    reference: paymentRef,
                    date: new Date(),
                    
                    // Ventilation
                    amountOwner: artisanNet, // Montant pour le prestataire
                    amountPlatform: platformFeeHT,
                    platformTaxAmount: platformTax,
                    
                    // Liaisons
                    // quoteId: quoteId, // Si vous avez ajouté la relation
                    leaseId: "MAINTENANCE" // Dummy si obligatoire, sinon null
                }
            });

            // 4. Log Transaction (Immuable)
            await tx.transaction.create({
                data: {
                    amount: amountToPay,
                    type: 'DEBIT',
                    balanceType: 'WALLET',
                    reason: `Paiement Devis #${quote.number}`,
                    status: 'SUCCESS',
                    reference: paymentRef,
                    userId: userId,
                    quoteId: quoteId,
                    incidentId: quote.incidentId
                }
            });

            // 5. Mise à jour Opérationnelle
            await tx.quote.update({
                where: { id: quoteId },
                data: { status: 'ACCEPTED' } // Ou 'PAID'
            });

            await tx.incident.update({
                where: { id: quote.incidentId },
                data: { 
                    status: 'IN_PROGRESS', 
                    quoteAmount: amountToPay 
                }
            });

            // 6. Notification Artisan
            await tx.notification.create({
                data: {
                    userId: quote.artisanId,
                    title: "Paiement Reçu 💰",
                    message: `Le devis pour "${quote.incident.title}" est payé (${artisanNet} FCFA crédités). Au travail !`,
                    type: "SUCCESS",
                    link: `/dashboard/artisan/incidents/${quote.incidentId}`
                }
            });

            return { success: true, newBalance: updatedFinance.walletBalance };
        });

        return NextResponse.json(result);
    }

  } catch (error: any) {
    console.error(`[QUOTE_RESPOND_ERROR] Tx: ${txId}`, error);
    
    // Gestion spécifique Optimistic Locking
    if (error.code === 'P2025') {
        return NextResponse.json({ error: "Conflit de transaction. Veuillez réessayer." }, { status: 409 });
    }

    return NextResponse.json({ error: "Erreur traitement financier" }, { status: 500 });
  }
}

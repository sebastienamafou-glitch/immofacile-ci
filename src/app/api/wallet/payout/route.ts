import { NextResponse } from "next/server";
import { auth } from "@/auth";

import { prisma } from "@/lib/prisma";
import { v4 as uuidv4 } from "uuid";

export const dynamic = 'force-dynamic';

// CONFIGURATION RETRAIT
const PAYOUT_RULES = {
  MIN_AMOUNT: 5000,   // Minimum 5000 FCFA
  FEE_PERCENT: 0.01,  // 1% de frais
  MAX_DAILY: 500000,  // Plafond
};

export async function POST(request: Request) {
  try {
    // 1. SÉCURITÉ BLINDÉE (Auth v5)
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { amount, phoneNumber, provider } = await request.json(); 

    // 2. VALIDATION
    if (!amount || amount < PAYOUT_RULES.MIN_AMOUNT) {
        return NextResponse.json({ error: `Montant minimum : ${PAYOUT_RULES.MIN_AMOUNT} FCFA` }, { status: 400 });
    }

    // 3. TRANSACTION ATOMIQUE (ACID)
    await prisma.$transaction(async (tx) => {
        // A. VERROUILLAGE & LECTURE
        const userFinance = await tx.userFinance.findUnique({
            where: { userId: userId }
        });

        if (!userFinance) throw new Error("Portefeuille introuvable");

        // B. VÉRIFICATION SOLDE
        if (userFinance.walletBalance < amount) {
            throw new Error("Solde insuffisant");
        }

        // C. DÉBIT (Optimistic Locking)
        await tx.userFinance.update({
            where: { 
                userId: userId,
                version: userFinance.version 
            },
            data: {
                walletBalance: { decrement: amount },
                version: { increment: 1 }
            }
        });

        // D. ENREGISTREMENT TRANSACTION
        const transactionRef = uuidv4();
        await tx.transaction.create({
            data: {
                userId: userId,
                amount: amount,
                type: 'DEBIT',
                balanceType: "WALLET", // ✅ C'EST ICI QUE LE SCHÉMA BLOQUAIT
                reason: `RETRAIT_VERS_${provider}_${phoneNumber}`,
                status: 'PENDING',
                id: transactionRef
            }
        });

        // E. APPEL API EXTERNE (Simulation)
        // const externalApiSuccess = await initiatePayout(provider, amount, phoneNumber);
        const externalApiSuccess = true; 

        if (!externalApiSuccess) {
            throw new Error("Échec du fournisseur de paiement"); 
        }

        // F. CONFIRMATION
        await tx.transaction.update({
            where: { id: transactionRef },
            data: { status: 'SUCCESS' }
        });
    });

    return NextResponse.json({ success: true, message: "Retrait effectué avec succès" });

  } catch (error: any) {
    console.error("Payout Error:", error);
    if (error.code === 'P2025') {
        return NextResponse.json({ error: "Conflit de transaction. Réessayez." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message || "Erreur lors du retrait" }, { status: 500 });
  }
}

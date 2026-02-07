import { NextResponse } from "next/server";
import { auth } from "@/auth";

import { prisma } from "@/lib/prisma";


export async function POST(req: Request) {
  try {
    // 1. SÉCURITÉ : Session Serveur (v5)
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    // 2. VALIDATION DES ENTRÉES
    const body = await req.json();
    const { amount, paymentDetails } = body;

    const amountInt = Math.floor(Number(amount));

    if (!amountInt || amountInt <= 0) {
        return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
    }
    if (!paymentDetails || typeof paymentDetails !== 'string') {
        return NextResponse.json({ error: "Détails de paiement requis" }, { status: 400 });
    }

    // 3. TRANSACTION FINANCIÈRE ATOMIQUE
    await prisma.$transaction(async (tx) => {
        
        // A. Vérification du Solde (Dans UserFinance)
        const finance = await tx.userFinance.findUnique({ 
            where: { userId: userId } 
        });

        if (!finance || finance.walletBalance < amountInt) {
            throw new Error("Solde insuffisant pour ce retrait.");
        }

        // B. Débit du compte (Optimistic Locking via version)
        await tx.userFinance.update({
            where: { 
                userId: userId,
                version: finance.version 
            },
            data: { 
                walletBalance: { decrement: amountInt },
                version: { increment: 1 }
            }
        });

        // C. Création de la trace de transaction
        await tx.transaction.create({
            data: {
                amount: amountInt,
                type: "DEBIT",
                balanceType: "WALLET", // ✅ Champ obligatoire ajouté
                reason: `Retrait vers ${paymentDetails}`,
                status: "PENDING",
                userId: userId,
                reference: `WITHDRAW-${Date.now()}` // Référence unique
            }
        });
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Erreur Retrait:", error);
    // Gestion propre des erreurs transactionnelles
    if (error.message.includes("Solde insuffisant")) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Erreur lors du traitement." }, { status: 500 });
  }
}

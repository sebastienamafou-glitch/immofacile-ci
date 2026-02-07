import { NextResponse } from "next/server";
import { auth } from "@/auth";

import { prisma } from "@/lib/prisma";


export async function POST(request: Request) {
  try {
    // 1. SÉCURITÉ : Session Serveur (v5)
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const body = await request.json();
    const { amount, method, number } = body;

    // Validation basique
    if (!amount || amount < 500) {
        return NextResponse.json({ error: "Montant invalide (Min 500 F)" }, { status: 400 });
    }

    // 2. TRANSACTION ATOMIQUE (FINANCE)
    const result = await prisma.$transaction(async (tx) => {
        // A. Lire le coffre-fort (UserFinance)
        const finance = await tx.userFinance.findUnique({ 
            where: { userId: userId } 
        });

        // Vérification Solde
        if (!finance || finance.walletBalance < amount) {
            throw new Error("Solde insuffisant");
        }

        // B. Débiter le UserFinance (avec Optimistic Lock)
        const updatedFinance = await tx.userFinance.update({
            where: { 
                userId: userId,
                version: finance.version // Sécurité anti-concurrence
            },
            data: { 
                walletBalance: { decrement: amount },
                version: { increment: 1 } 
            }
        });

        // C. Enregistrer la transaction (DEBIT)
        await tx.transaction.create({
            data: {
                userId: userId,
                amount: amount,
                type: "DEBIT",
                balanceType: "WALLET", // Précision importante
                reason: `Retrait vers ${method} (${number})`,
                status: "PENDING",
                reference: `CASH-${Date.now()}` // Ref unique temporaire
            }
        });

        return updatedFinance;
    });

    return NextResponse.json({ success: true, newBalance: result.walletBalance });

  } catch (error: any) {
    console.error("Erreur Retrait:", error);
    // Gestion spécifique du conflit de version (Optimistic Lock)
    if (error.code === 'P2025') {
        return NextResponse.json({ error: "Conflit de transaction. Veuillez réessayer." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message || "Erreur serveur" }, { status: 400 });
  }
}

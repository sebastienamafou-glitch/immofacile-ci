import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    // 1. SÉCURITÉ
    const userId = request.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const body = await request.json();
    const { amount, method, number } = body;

    if (!amount || amount < 500) {
        return NextResponse.json({ error: "Montant invalide (Min 500 F)" }, { status: 400 });
    }

    // 2. VÉRIFICATION SOLDE (Transaction Atomique)
    // On utilise une transaction Prisma pour éviter les race conditions (double dépense)
    const result = await prisma.$transaction(async (tx) => {
        // A. Lire le solde actuel
        const user = await tx.user.findUnique({ where: { id: userId } });
        if (!user || user.walletBalance < amount) {
            throw new Error("Solde insuffisant");
        }

        // B. Débiter le user
        const updatedUser = await tx.user.update({
            where: { id: userId },
            data: { walletBalance: { decrement: amount } }
        });

        // C. Enregistrer la transaction (DEBIT)
        await tx.transaction.create({
            data: {
                userId: userId,
                amount: amount,
                type: "DEBIT",
                reason: `Retrait vers ${method} (${number})`,
                status: "PENDING" // En attente de traitement manuel ou API tierce
            }
        });

        return updatedUser;
    });

    return NextResponse.json({ success: true, newBalance: result.walletBalance });

  } catch (error: any) {
    console.error("Erreur Retrait:", error);
    return NextResponse.json({ error: error.message || "Erreur serveur" }, { status: 400 });
  }
}

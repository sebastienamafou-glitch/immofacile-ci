import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    // 1. SÉCURITÉ ZERO TRUST
    const userId = req.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const admin = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, agencyId: true }
    });

    if (!admin || !admin.agencyId || (admin.role !== "AGENCY_ADMIN" && admin.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Accès Agence requis." }, { status: 403 });
    }

    // 2. VALIDATION INPUT
    const body = await req.json();
    const { amount, provider, phone } = body;
    const amountInt = parseInt(amount);

    if (isNaN(amountInt) || amountInt < 1000) {
        return NextResponse.json({ error: "Montant invalide (min 1000 F)." }, { status: 400 });
    }

    // 3. TRANSACTION ATOMIQUE (Blindage Financier)
    // On utilise une transaction Prisma pour éviter les Race Conditions (Double dépense)
    const result = await prisma.$transaction(async (tx) => {
        
        // A. Récupérer l'agence avec un lock (si possible) ou juste vérifier le solde actuel
        const agency = await tx.agency.findUnique({
            where: { id: admin.agencyId! } // ! car vérifié plus haut
        });

        if (!agency) throw new Error("Agence introuvable");
        if (agency.walletBalance < amountInt) throw new Error("Solde insuffisant.");

        // B. Débiter l'agence
        await tx.agency.update({
            where: { id: agency.id },
            data: { walletBalance: { decrement: amountInt } }
        });

        // C. Enregistrer la transaction
        const transaction = await tx.agencyTransaction.create({
            data: {
                amount: amountInt,
                type: "DEBIT",
                reason: `Retrait vers ${provider} (${phone})`,
                status: "PENDING", // En attente de validation manuelle ou API payout
                agencyId: agency.id
            }
        });

        return transaction;
    });

    return NextResponse.json({ success: true, transaction: result });

  } catch (error: any) {
    console.error("Withdraw Error:", error);
    return NextResponse.json({ error: error.message || "Erreur serveur" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const userEmail = req.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { amount, paymentDetails } = await req.json();
    const amountInt = parseInt(amount);

    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Vérification Solde
    if (user.walletBalance < amountInt) {
        return NextResponse.json({ error: "Solde insuffisant" }, { status: 400 });
    }

    // Transaction atomique
    await prisma.$transaction([
        // 1. Débiter le wallet
        prisma.user.update({
            where: { id: user.id },
            data: { walletBalance: { decrement: amountInt } }
        }),
        // 2. Créer l'historique
        prisma.transaction.create({
            data: {
                amount: amountInt,
                type: "DEBIT",
                reason: `Retrait vers ${paymentDetails} (En attente)`,
                userId: user.id
            }
        })
    ]);

    // TODO: Connecter ici l'API de Payout (Bizao, Wave, Stripe...)

    return NextResponse.json({ success: true });

  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

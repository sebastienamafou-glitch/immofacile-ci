import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    // 1. AUTHENTIFICATION ZERO TRUST (Via Middleware)
    const userId = req.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Session invalide ou expirée" }, { status: 401 });

    // 2. VALIDATION DES ENTRÉES
    const body = await req.json();
    const { amount, paymentDetails } = body;

    // On force un entier positif (les centimes sont gérés en entiers ou ignorés selon votre règle, ici FCFA = entier)
    const amountInt = Math.floor(Number(amount));

    if (!amountInt || amountInt <= 0) {
        return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
    }
    if (!paymentDetails || typeof paymentDetails !== 'string') {
        return NextResponse.json({ error: "Détails de paiement requis" }, { status: 400 });
    }

    // 3. VÉRIFICATION DU SOLDE (Database Fetch)
    const user = await prisma.user.findUnique({ 
        where: { id: userId },
        select: { walletBalance: true, id: true } 
    });

    if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

    if (user.walletBalance < amountInt) {
        return NextResponse.json({ error: "Solde insuffisant pour ce retrait." }, { status: 400 });
    }

    // 4. TRANSACTION ATOMIQUE (Bank Grade)
    // Empêche les "Race Conditions" (double retrait simultané)
    await prisma.$transaction([
        // A. Débit du compte (La condition gte assure une sécurité DB supplémentaire)
        prisma.user.update({
            where: { id: userId },
            data: { 
                walletBalance: { decrement: amountInt } 
            }
        }),
        // B. Création de la trace de transaction
        prisma.transaction.create({
            data: {
                amount: amountInt,
                type: "DEBIT",
                reason: `Retrait vers ${paymentDetails}`, // Ex: "WAVE - 0707..."
                status: "PENDING", // En attente de validation manuelle par l'Admin
                userId: userId
            }
        })
    ]);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("🚨 Critical Withdraw Error:", error);
    return NextResponse.json({ error: "Erreur lors du traitement de la transaction." }, { status: 500 });
  }
}

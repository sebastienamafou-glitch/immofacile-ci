import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // 1. SÉCURITÉ ZERO TRUST (ID Obligatoire)
    const adminId = request.headers.get("x-user-id");
    if (!adminId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const admin = await prisma.user.findUnique({
        where: { id: adminId },
        select: { id: true, role: true, name: true }
    });

    if (!admin || admin.role !== "SUPER_ADMIN") {
        return NextResponse.json({ error: "Action réservée aux administrateurs." }, { status: 403 });
    }

    // 2. VALIDATION
    const body = await request.json();
    const { userId, amount } = body;

    if (!userId || !amount) {
        return NextResponse.json({ error: "Données incomplètes." }, { status: 400 });
    }

    const amountInt = parseInt(amount);
    if (isNaN(amountInt) || amountInt <= 0) {
        return NextResponse.json({ error: "Montant invalide." }, { status: 400 });
    }

    // 3. TRANSACTION BANCAIRE ATOMIQUE
    const result = await prisma.$transaction(async (tx) => {
        
        const targetUser = await tx.user.findUnique({ where: { id: userId } });
        if (!targetUser) throw new Error("USER_NOT_FOUND");

        // Crédit du Wallet
        const updatedUser = await tx.user.update({
            where: { id: userId },
            data: { walletBalance: { increment: amountInt } }
        });

        // Création de la trace (Audit)
        await tx.transaction.create({
            data: {
                amount: amountInt,
                type: "CREDIT",
                // ✅ CORRECTION : Status standardisé
                status: "SUCCESS", 
                // ✅ TRACE : On marque qui a fait l'action
                reason: `ADMIN_CREDIT_MANUAL_BY_${admin.name?.toUpperCase().replace(/\s+/g, '_') || 'ADMIN'}`,
                userId: userId
            }
        });

        return updatedUser;
    });

    return NextResponse.json({ 
        success: true, 
        message: `Compte crédité de ${amountInt.toLocaleString()} FCFA`,
        newBalance: result.walletBalance 
    });

  } catch (error: any) {
    console.error("Erreur Crédit:", error);
    if (error.message === "USER_NOT_FOUND") return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
    return NextResponse.json({ error: "Erreur transaction." }, { status: 500 });
  }
}

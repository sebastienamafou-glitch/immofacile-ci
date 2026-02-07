import { NextResponse } from "next/server";
import { auth } from "@/auth";

import { prisma } from "@/lib/prisma";


export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // 1. SÉCURITÉ BLINDÉE (Auth v5)
    const session = await auth();
    const adminId = session?.user?.id;

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
        
        // Vérif existence user
        const targetUser = await tx.user.findUnique({ where: { id: userId } });
        if (!targetUser) throw new Error("USER_NOT_FOUND");

        // A. Crédit du Wallet (Correction Schema : UserFinance)
        // On utilise upsert pour l'auto-réparation (crée le coffre s'il n'existe pas)
        const updatedFinance = await tx.userFinance.upsert({
            where: { userId: userId },
            create: {
                userId: userId,
                walletBalance: amountInt,
                version: 1,
                kycTier: 1
            },
            update: { 
                walletBalance: { increment: amountInt },
                version: { increment: 1 } 
            }
        });

        // B. Création de la trace (Audit)
        await tx.transaction.create({
            data: {
                amount: amountInt,
                type: "CREDIT",
                balanceType: "WALLET", // ✅ Champ obligatoire
                status: "SUCCESS", 
                reason: `CREDIT_ADMIN_PAR_${admin.name?.toUpperCase().replace(/\s+/g, '_') || 'ADMIN'}`,
                userId: userId
            }
        });

        return updatedFinance;
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

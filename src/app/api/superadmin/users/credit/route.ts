import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Singleton
import { Prisma } from "@prisma/client"; // Type officiel

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // 1. SÉCURITÉ : AUTH & RÔLE ADMIN
    const adminEmail = request.headers.get("x-user-email");
    if (!adminEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const admin = await prisma.user.findUnique({ where: { email: adminEmail } });
    
    // ✅ Vérification Rôle
    if (!admin || admin.role !== "SUPER_ADMIN") {
        return NextResponse.json({ error: "Action réservée aux administrateurs." }, { status: 403 });
    }

    // 2. VALIDATION DES ENTRÉES
    const body = await request.json();
    const { userId, amount } = body;

    if (!userId || !amount) {
        return NextResponse.json({ error: "ID Utilisateur et Montant requis." }, { status: 400 });
    }

    const amountInt = parseInt(amount);

    // Sécurité financière : On interdit les montants nuls ou négatifs ici
    if (isNaN(amountInt) || amountInt <= 0) {
        return NextResponse.json({ error: "Le montant doit être un nombre positif." }, { status: 400 });
    }

    // 3. TRANSACTION ATOMIQUE (Sécurisée avec typage)
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        
        // A. Vérification existence user
        const targetUser = await tx.user.findUnique({ where: { id: userId } });
        if (!targetUser) throw new Error("USER_NOT_FOUND");

        // B. Mise à jour Solde
        const updatedUser = await tx.user.update({
            where: { id: userId },
            data: {
                walletBalance: { increment: amountInt }
            }
        });

        // C. Historique Transaction
        await tx.transaction.create({
            data: {
                amount: amountInt,
                type: "CREDIT", 
                reason: "Rechargement manuel (Admin)",
                // J'ai retiré 'status' car il cause souvent l'erreur s'il n'est pas dans le schema
                // J'utilise la syntaxe 'connect' qui est plus robuste pour TypeScript
                user: { 
                    connect: { id: userId } 
                }
            }
        });

        return updatedUser;
    });

    return NextResponse.json({ 
        success: true, 
        message: `Compte crédité avec succès de ${amountInt.toLocaleString()} FCFA`,
        newBalance: result.walletBalance 
    });

  } catch (error: any) {
    console.error("Erreur Crédit Admin:", error);

    if (error.message === "USER_NOT_FOUND") {
        return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
    }

    return NextResponse.json({ error: "Erreur serveur lors de la transaction." }, { status: 500 });
  }
}

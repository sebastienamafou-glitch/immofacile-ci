import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
// 1. IMPORT DU TYPE OFFICIEL
import { Prisma } from "@prisma/client"; 

export async function POST(request: Request) {
  try {
    // ... (Partie Sécurité inchangée) ...
    const adminEmail = request.headers.get("x-user-email");
    if (!adminEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const admin = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (!admin || admin.role !== "ADMIN") {
        return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
    }

    const body = await request.json();
    const { userId, amount } = body;

    if (!userId || !amount) {
        return NextResponse.json({ error: "Utilisateur et montant requis." }, { status: 400 });
    }

    const amountInt = parseInt(amount);

    // 2. UTILISATION DU TYPE "Prisma.TransactionClient"
    // Au lieu de (tx: any), on met le vrai type :
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        
        // Maintenant, si vous survolez "tx", VS Code sait tout ce qu'il contient !
        const updatedUser = await tx.user.update({
            where: { id: userId },
            data: {
                walletBalance: { increment: amountInt }
            }
        });

        await tx.transaction.create({
            data: {
                amount: amountInt,
                type: "CREDIT", 
                reason: "Rechargement par Admin",
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

  } catch (error) {
    console.error("Erreur Crédit Admin:", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

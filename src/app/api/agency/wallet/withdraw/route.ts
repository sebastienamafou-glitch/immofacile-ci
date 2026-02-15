import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // 1. SÉCURITÉ ZERO TRUST
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    const userId = session.user.id;

    // 2. VÉRIFICATION DES DROITS (RBAC)
    const admin = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, agencyId: true }
    });

    if (!admin?.agencyId || (admin.role !== "AGENCY_ADMIN" && admin.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Accès refusé. Réservé aux administrateurs d'agence." }, { status: 403 });
    }

    // 3. VALIDATION INPUT
    const body = await request.json();
    const { amount, provider, phone } = body;
    
    // On force un entier positif
    const amountInt = Math.floor(Number(amount));

    if (isNaN(amountInt) || amountInt < 1000) {
        return NextResponse.json({ error: "Montant invalide (minimum 1000 FCFA)." }, { status: 400 });
    }

    // 4. EXÉCUTION ATOMIQUE ANTI-RACE CONDITION
    const result = await prisma.$transaction(async (tx) => {
        
        // TENTATIVE DE DÉBIT DIRECT (Optimistic Locking)
        // On ne met à jour QUE SI le solde est suffisant (gte: amountInt)
        // Cela empêche physiquement le solde de passer en négatif, même avec 100 requêtes simultanées.
        const updatedAgency = await tx.agency.update({
            where: { 
                id: admin.agencyId!,
                walletBalance: { gte: amountInt } // <--- LE SECRET EST ICI
            },
            data: { 
                walletBalance: { decrement: amountInt } 
            }
        }).catch(() => {
            // Si l'update échoue (car la condition 'where' n'est pas remplie), on lève une erreur
            throw new Error("Solde insuffisant ou agence introuvable.");
        });

        // ENREGISTREMENT DE LA TRANSACTION
        const transaction = await tx.agencyTransaction.create({
            data: {
                amount: amountInt,
                type: "DEBIT", // Sortie d'argent
                reason: `Retrait vers ${provider} (${phone})`,
                status: "PENDING",
                agencyId: admin.agencyId!
            }
        });

        return transaction;
    });

    return NextResponse.json({ success: true, transaction: result });

  } catch (error: any) {
    console.error("API Withdraw Error:", error);
    
    // On renvoie un message propre, sauf si c'est notre erreur de solde connue
    const message = error.message === "Solde insuffisant ou agence introuvable." 
        ? error.message 
        : "Erreur serveur lors du retrait.";
        
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

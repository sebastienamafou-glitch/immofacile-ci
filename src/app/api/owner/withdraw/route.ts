import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Prisma } from "@prisma/client";

export const dynamic = 'force-dynamic';

// 1. VALIDATION STRICTE ZOD
const withdrawSchema = z.object({
  amount: z.number().int().positive("Le montant doit être un entier positif"),
  paymentDetails: z.string().min(10, "Détails de paiement invalides")
});

export async function POST(req: Request) {
  try {
    // 2. SÉCURITÉ : Session Serveur (v5)
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    // 3. VALIDATION DU PAYLOAD
    const body = await req.json();
    const validation = withdrawSchema.safeParse(body);

    if (!validation.success) {
        return NextResponse.json({ error: "Données invalides", details: validation.error.format() }, { status: 400 });
    }

    const { amount, paymentDetails } = validation.data;

    // 4. TRANSACTION FINANCIÈRE ATOMIQUE
    await prisma.$transaction(async (tx) => {
        
        // A. Vérification du Solde
        const finance = await tx.userFinance.findUnique({ 
            where: { userId: userId } 
        });

        if (!finance || finance.walletBalance < amount) {
            throw new Error("INSUFFICIENT_FUNDS");
        }

        // B. Débit du compte (Optimistic Locking)
        await tx.userFinance.update({
            where: { 
                userId: userId,
                version: finance.version 
            },
            data: { 
                walletBalance: { decrement: amount },
                version: { increment: 1 }
            }
        });

        // C. Création de la trace de transaction
        await tx.transaction.create({
            data: {
                amount: amount,
                type: "DEBIT",
                balanceType: "WALLET",
                reason: `Retrait vers ${paymentDetails}`,
                status: "PENDING",
                userId: userId,
                reference: `WITHDRAW-${Date.now()}`
            }
        });
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("[API_WITHDRAW_ERROR]", error);

    // 5. GESTION EXPERTE DES ERREURS (Sans 'any')
    if (error instanceof Error && error.message === "INSUFFICIENT_FUNDS") {
        return NextResponse.json({ error: "Solde insuffisant pour ce retrait." }, { status: 400 });
    }

    // Capture spécifique du verrouillage optimiste de Prisma (P2025)
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
         return NextResponse.json({ error: "Une transaction est déjà en cours. Veuillez réessayer." }, { status: 409 });
    }

    return NextResponse.json({ error: "Erreur lors du traitement bancaire." }, { status: 500 });
  }
}

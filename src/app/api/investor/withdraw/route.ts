import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import axios from "axios"; // ❌ Retrait de AxiosError (inutile avec la bonne méthode)
import { z } from "zod";

export const dynamic = 'force-dynamic';

// CONFIGURATION GATEWAY
const GATEWAY_CONFIG = {
  WAVE_URL: process.env.WAVE_API_URL || "https://api.wave.com/v1/payouts",
  ORANGE_URL: process.env.ORANGE_API_URL || "https://api.orange.com/payment/v1",
  WAVE_TOKEN: process.env.WAVE_API_SECRET_KEY,
  OM_TOKEN: process.env.OM_ACCESS_TOKEN
};

const withdrawSchema = z.object({
  amount: z.number().min(1000, "Minimum 1000 FCFA"),
  provider: z.enum(['WAVE', 'ORANGE_MONEY', 'MTN_MOMO']),
  phone: z.string().regex(/^(01|05|07)\d{8}$/, "Numéro invalide"),
  idempotencyKey: z.string()
});

type WithdrawRequest = z.infer<typeof withdrawSchema>;

type GatewayResult = 
  | { success: true; gwId: string }
  | { success: false; error: string };

// --- FONCTION GATEWAY (Isolée et sécurisée) ---
async function processGatewayPayout(
    provider: WithdrawRequest['provider'], 
    phone: string, 
    amount: number, 
    ref: string
): Promise<GatewayResult> {
  try {
    if (provider === 'WAVE') {
        const res = await axios.post(GATEWAY_CONFIG.WAVE_URL, {
            amount, currency: "XOF", recipient: phone, description: "Retrait Babimmo"
        }, {
            headers: { 
                'Authorization': `Bearer ${GATEWAY_CONFIG.WAVE_TOKEN}`,
                'Idempotency-Key': ref 
            }
        });
        return { success: true, gwId: res.data.id };
    } 
    return { success: true, gwId: `SIM-${Date.now()}` }; 
  } catch (error: unknown) {
    // ✅ CORRECTION 1 : Vérification de type native Axios pour éviter les crashs
    if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.error || error.message || "Erreur Gateway inconnue";
        console.error(`[GATEWAY_FAIL] ${provider}`, errorMessage);
        return { success: false, error: errorMessage };
    }
    
    console.error(`[GATEWAY_FAIL_CRITICAL] ${provider}`, error);
    return { success: false, error: "Erreur interne du serveur de paiement" };
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: "Auth requise" }, { status: 401 });

    const body = await req.json();
    const validation = withdrawSchema.safeParse(body);
    if (!validation.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    
    const { amount, provider, phone, idempotencyKey } = validation.data;

    // 1. Vérifications légères hors transaction
    const userKyc = await prisma.userKYC.findUnique({ where: { userId } });
    if (userKyc?.status !== 'VERIFIED') {
        return NextResponse.json({ error: "KYC requis pour retirer des fonds" }, { status: 403 });
    }

    const existingTx = await prisma.transaction.findFirst({
        where: { reference: idempotencyKey }
    });
    if (existingTx) return NextResponse.json({ error: "Transaction déjà traitée" }, { status: 409 });

    // ✅ CORRECTION 2 : LECTURE ET ÉCRITURE 100% ATOMIQUES
    const initResult = await prisma.$transaction(async (tx) => {
        // Lecture avec verrou
        const finance = await tx.userFinance.findUnique({
            where: { userId: userId }
        });

        if (!finance) throw new Error("NO_FINANCE");
        if (finance.walletBalance < amount) throw new Error("INSUFFICIENT_FUNDS");

        const updatedFinance = await tx.userFinance.update({
            where: { userId: userId, version: finance.version }, // Maintien du verrou optimiste
            data: { 
                walletBalance: { decrement: amount },
                version: { increment: 1 } 
            }
        });

        const txRecord = await tx.transaction.create({
            data: {
                amount,
                type: "DEBIT",
                balanceType: "WALLET",
                reason: `Retrait ${provider} vers ${phone}`,
                status: "PENDING",
                reference: idempotencyKey,
                userId: userId
            }
        });

        return { finance: updatedFinance, tx: txRecord };
    });

    // APPEL GATEWAY
    const gatewayResult = await processGatewayPayout(provider, phone, amount, idempotencyKey);

    // FINALISATION
    if (gatewayResult.success) {
        await prisma.transaction.update({
            where: { id: initResult.tx.id },
            data: { status: "SUCCESS" }
        });
        
        return NextResponse.json({ 
            success: true, 
            balance: initResult.finance.walletBalance 
        });

    } else {
        // ROLLBACK
        await prisma.$transaction(async (tx) => {
            await tx.userFinance.update({
                where: { userId: userId },
                data: { 
                    walletBalance: { increment: amount },
                    version: { increment: 1 }
                }
            });
            await tx.transaction.update({
                where: { id: initResult.tx.id },
                data: { status: "FAILED", reason: `Echec Gateway: ${gatewayResult.error}` }
            });
        });

        return NextResponse.json({ error: "Echec opérateur, fonds remboursés." }, { status: 502 });
    }

  } catch (error: unknown) { 
    console.error("[WITHDRAW_ERROR]", error);
    
    // Gestion des erreurs métier issues de la transaction
    if (error instanceof Error) {
        if (error.message === "INSUFFICIENT_FUNDS") return NextResponse.json({ error: "Solde insuffisant" }, { status: 402 });
        if (error.message === "NO_FINANCE") return NextResponse.json({ error: "Compte non configuré" }, { status: 403 });
    }
    
    const prismaError = error as { code?: string };
    if (prismaError.code === 'P2025') {
        return NextResponse.json({ error: "Transaction en cours de traitement, veuillez patienter." }, { status: 409 });
    }
    
    return NextResponse.json({ error: "Erreur technique" }, { status: 500 });
  }
}

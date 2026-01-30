import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";

export const dynamic = 'force-dynamic';

// CONFIGURATION
const WAVE_API_URL = process.env.WAVE_API_URL || "https://api.wave.com/v1/payouts";
const ORANGE_API_URL = process.env.ORANGE_API_URL || "https://api.orange.com/payment/v1";

// --- GATEWAY ---
async function processPaymentGateway(provider: string, phone: string, amount: number) {
  const idempotencyKey = `wapp-wd-${uuidv4()}`;

  try {
    let response;

    if (provider === 'WAVE') {
        response = await axios.post(
            WAVE_API_URL,
            {
                amount,
                currency: "XOF",
                recipient: phone,
                description: "Retrait ImmoFacile"
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.WAVE_API_SECRET_KEY}`,
                    'Content-Type': 'application/json',
                    'Idempotency-Key': idempotencyKey 
                },
                timeout: 15000 
            }
        );
    } else if (provider === 'ORANGE_MONEY') {
        // ... (Logique OM simplifiée)
        response = await axios.post(
            ORANGE_API_URL,
            {
                merchant_key: process.env.OM_MERCHANT_KEY,
                amount,
                recipient: phone,
                reference: idempotencyKey
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.OM_ACCESS_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            }
        );
    } else {
        throw new Error(`Provider ${provider} non supporté.`);
    }

    return { 
        transactionId: response.data.id || idempotencyKey, 
        status: 'SUCCESS' 
    };

  } catch (error: any) {
    console.error(`[GATEWAY_FAIL] ${provider}`, error.response?.data || error.message);
    throw new Error("Échec du transfert opérateur.");
  }
}

// --- ROLLBACK ---
async function performRollback(transactionId: string, userId: string) {
    try {
        const tx = await prisma.transaction.findUnique({ where: { id: transactionId } });
        if (!tx || tx.status !== 'PENDING') return;

        await prisma.$transaction([
            prisma.user.update({
                where: { id: userId },
                data: { walletBalance: { increment: tx.amount } }
            }),
            prisma.transaction.update({
                where: { id: transactionId },
                data: { status: "FAILED" }
            })
        ]);
    } catch (e) {
        console.error("Rollback failed", e);
    }
}

// --- MAIN POST ---
export async function POST(request: Request) {
  let transactionId: string | null = null;
  let userId: string | null = null;

  try {
    // 1. AUTH ZERO TRUST
    userId = request.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const user = await prisma.user.findUnique({ 
        where: { id: userId },
        select: { id: true, walletBalance: true } 
    });

    if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 403 });

    const body = await request.json();
    const { amount, provider, phone } = body;

    // 2. VALIDATION SOLDE
    if (!amount || amount < 1000) return NextResponse.json({ error: "Minimum 1000 FCFA" }, { status: 400 });
    if (user.walletBalance < amount) return NextResponse.json({ error: "Solde insuffisant" }, { status: 400 });

    // 3. VERROUILLAGE DB (DEBIT PENDING)
    const initialOp = await prisma.$transaction(async (tx) => {
        const updatedUser = await tx.user.update({
            where: { id: user.id },
            data: { walletBalance: { decrement: amount } }
        });

        const txRecord = await tx.transaction.create({
            data: {
                amount,
                type: "DEBIT",
                reason: `CASHOUT_${provider}`,
                status: "PENDING",
                userId: user.id
            }
        });
        return { user: updatedUser, tx: txRecord };
    });

    transactionId = initialOp.tx.id;

    // 4. APPEL GATEWAY (RISQUÉ)
    await processPaymentGateway(provider, phone, amount);

    // 5. CONFIRMATION
    await prisma.transaction.update({
        where: { id: transactionId },
        data: { status: "SUCCESS" }
    });

    return NextResponse.json({
        success: true,
        message: "Transfert effectué.",
        newBalance: initialOp.user.walletBalance
    });

  } catch (error: any) {
    // 6. ROLLBACK SI ÉCHEC
    if (transactionId && userId) {
        await performRollback(transactionId, userId);
    }
    return NextResponse.json({ error: error.message || "Erreur technique" }, { status: 500 });
  }
}

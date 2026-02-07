import { NextResponse } from "next/server";
import { auth } from "@/auth";

import { prisma } from "@/lib/prisma";
import axios from "axios";
import { z } from "zod";

export const dynamic = 'force-dynamic';

// CONFIGURATION GATEWAY
const GATEWAY_CONFIG = {
  WAVE_URL: process.env.WAVE_API_URL || "https://api.wave.com/v1/payouts",
  ORANGE_URL: process.env.ORANGE_API_URL || "https://api.orange.com/payment/v1",
  WAVE_TOKEN: process.env.WAVE_API_SECRET_KEY,
  OM_TOKEN: process.env.OM_ACCESS_TOKEN
};

// PLAFONDS DE RETRAIT (Normes BCEAO/LBC-FT)
const WITHDRAW_LIMITS = {
  1: 0,          // Tier 1 (Non vérifié) : Retrait interdit
  2: 500000,     // Tier 2 : 500k/mois
  3: 10000000    // Tier 3 : 10M/mois
};

// Schéma de validation
const withdrawSchema = z.object({
  amount: z.number().min(1000, "Minimum 1000 FCFA"),
  provider: z.enum(['WAVE', 'ORANGE_MONEY', 'MTN_MOMO']),
  phone: z.string().regex(/^(01|05|07)\d{8}$/, "Numéro invalide"),
  idempotencyKey: z.string() // ✅ Clé client obligatoire
});

// --- FONCTION GATEWAY (Isolée) ---
async function processGatewayPayout(provider: string, phone: string, amount: number, ref: string) {
  try {
    if (provider === 'WAVE') {
        const res = await axios.post(GATEWAY_CONFIG.WAVE_URL, {
            amount, currency: "XOF", recipient: phone, description: "Retrait ImmoFacile"
        }, {
            headers: { 
                'Authorization': `Bearer ${GATEWAY_CONFIG.WAVE_TOKEN}`,
                'Idempotency-Key': ref 
            }
        });
        return { success: true, gwId: res.data.id };
    } 
    // Ajouter OM/MTN ici...
    return { success: true, gwId: `SIM-${Date.now()}` }; // Simulation pour dev
  } catch (e: any) {
    console.error(`[GATEWAY_FAIL] ${provider}`, e.response?.data || e.message);
    return { success: false, error: e.message };
  }
}

export async function POST(req: Request) {
  try {
    // 1. 🔒 AUTHENTIFICATION FORTE
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: "Auth requise" }, { status: 401 });

    // 2. 🛡️ VÉRIFICATION PROFIL (KYC & FINANCE)
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { finance: true, kyc: true }
    });

    if (!user || !user.finance) return NextResponse.json({ error: "Compte non configuré" }, { status: 403 });

    // Contrôle KYC
    if (user.kyc?.status !== 'VERIFIED') {
        return NextResponse.json({ error: "KYC requis pour retirer des fonds" }, { status: 403 });
    }

    // 3. 🔍 VALIDATION ENTRÉES
    const body = await req.json();
    const validation = withdrawSchema.safeParse(body);
    if (!validation.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    
    const { amount, provider, phone, idempotencyKey } = validation.data;

    // Check Idempotence DB
    const existingTx = await prisma.transaction.findFirst({
        where: { reference: idempotencyKey }
    });
    if (existingTx) return NextResponse.json({ error: "Transaction déjà traitée" }, { status: 409 });

    // Check Solde
    if (user.finance.walletBalance < amount) {
        return NextResponse.json({ error: "Solde insuffisant" }, { status: 402 });
    }

    // 4. 🚀 EXÉCUTION (PHASE 1 : DÉBIT PRÉVENTIF ATOMIQUE)
    const initResult = await prisma.$transaction(async (tx) => {
        // Débit avec Verrouillage Optimiste
        const updatedFinance = await tx.userFinance.update({
            where: { userId: userId, version: user.finance!.version },
            data: { 
                walletBalance: { decrement: amount },
                version: { increment: 1 } 
            }
        });

        // Audit Trail (PENDING)
        const txRecord = await tx.transaction.create({
            data: {
                amount,
                type: "DEBIT",
                balanceType: "WALLET",
                reason: `Retrait ${provider} vers ${phone}`,
                status: "PENDING",
                reference: idempotencyKey, // Lien unique
                userId: userId
            }
        });

        return { finance: updatedFinance, tx: txRecord };
    });

    // 5. 📡 APPEL GATEWAY (Hors Transaction DB pour ne pas bloquer)
    const gatewayResult = await processGatewayPayout(provider, phone, amount, idempotencyKey);

    // 6. 🏁 FINALISATION (PHASE 2)
    if (gatewayResult.success) {
        // SUCCÈS : On confirme juste le statut
        await prisma.transaction.update({
            where: { id: initResult.tx.id },
            data: { status: "SUCCESS" }
        });
        
        return NextResponse.json({ 
            success: true, 
            balance: initResult.finance.walletBalance 
        });

    } else {
        // ÉCHEC : ROLLBACK (Remboursement)
        await prisma.$transaction(async (tx) => {
            // Remboursement
            await tx.userFinance.update({
                where: { userId: userId },
                data: { 
                    walletBalance: { increment: amount },
                    version: { increment: 1 }
                }
            });
            // Marquage FAILED
            await tx.transaction.update({
                where: { id: initResult.tx.id },
                data: { status: "FAILED", reason: `Echec Gateway: ${gatewayResult.error}` }
            });
        });

        return NextResponse.json({ error: "Echec opérateur, fonds remboursés." }, { status: 502 });
    }

  } catch (error: any) {
    console.error("[WITHDRAW_ERROR]", error);
    // Gestion Conflit Optimiste
    if (error.code === 'P2025') return NextResponse.json({ error: "Conflit de transaction, réessayez." }, { status: 409 });
    
    return NextResponse.json({ error: "Erreur technique" }, { status: 500 });
  }
}

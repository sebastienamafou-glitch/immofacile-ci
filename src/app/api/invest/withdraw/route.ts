import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import axios, { AxiosError } from "axios";
import { z } from "zod";

export const dynamic = 'force-dynamic';

// CONFIGURATION GATEWAY
const GATEWAY_CONFIG = {
  WAVE_URL: process.env.WAVE_API_URL || "https://api.wave.com/v1/payouts",
  ORANGE_URL: process.env.ORANGE_API_URL || "https://api.orange.com/payment/v1",
  WAVE_TOKEN: process.env.WAVE_API_SECRET_KEY,
  OM_TOKEN: process.env.OM_ACCESS_TOKEN
};

// Schéma de validation
const withdrawSchema = z.object({
  amount: z.number().min(1000, "Minimum 1000 FCFA"),
  provider: z.enum(['WAVE', 'ORANGE_MONEY', 'MTN_MOMO']),
  phone: z.string().regex(/^(01|05|07)\d{8}$/, "Numéro invalide"),
  idempotencyKey: z.string()
});

// ✅ TYPAGE STRICT : Inférence du type depuis Zod
type WithdrawRequest = z.infer<typeof withdrawSchema>;

// ✅ TYPAGE STRICT : Résultat de la Gateway
type GatewayResult = 
  | { success: true; gwId: string }
  | { success: false; error: string };

// --- FONCTION GATEWAY (Isolée et typée) ---
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
    // Simulation pour OM/MTN en dev
    return { success: true, gwId: `SIM-${Date.now()}` }; 
  } catch (error: unknown) {
    // ✅ FIN DU ANY : Typage strict de l'erreur Axios
    const axiosError = error as AxiosError<{ error?: string }>;
    const errorMessage = axiosError.response?.data?.error || axiosError.message || "Erreur Gateway inconnue";
    
    console.error(`[GATEWAY_FAIL] ${provider}`, errorMessage);
    return { success: false, error: errorMessage };
  }
}

export async function POST(req: Request) {
  try {
    // 1. AUTHENTIFICATION FORTE
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: "Auth requise" }, { status: 401 });

    // 2. VÉRIFICATION PROFIL (KYC & FINANCE)
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { finance: true, kyc: true }
    });

    if (!user || !user.finance) return NextResponse.json({ error: "Compte non configuré" }, { status: 403 });

    if (user.kyc?.status !== 'VERIFIED') {
        return NextResponse.json({ error: "KYC requis pour retirer des fonds" }, { status: 403 });
    }

    // 3. VALIDATION ENTRÉES
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

    // 4. EXÉCUTION (PHASE 1 : DÉBIT PRÉVENTIF ATOMIQUE)
    const initResult = await prisma.$transaction(async (tx) => {
        const updatedFinance = await tx.userFinance.update({
            where: { userId: userId, version: user.finance!.version },
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

    // 5. APPEL GATEWAY
    const gatewayResult = await processGatewayPayout(provider, phone, amount, idempotencyKey);

    // 6. FINALISATION (PHASE 2)
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
        // ÉCHEC : ROLLBACK (Remboursement)
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
    
    
    const prismaError = error as { code?: string };
    if (prismaError.code === 'P2025') {
        return NextResponse.json({ error: "Conflit de transaction, réessayez." }, { status: 409 });
    }
    
    return NextResponse.json({ error: "Erreur technique" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import axios from "axios"; // 📦 Le client HTTP pro
import { v4 as uuidv4 } from "uuid"; // 📦 Pour l'idempotence

export const dynamic = 'force-dynamic';

// --- CONFIGURATION DES ENDPOINTS (A mettre dans .env) ---
const WAVE_API_URL = process.env.WAVE_API_URL || "https://api.wave.com/v1/payouts";
const ORANGE_API_URL = process.env.ORANGE_API_URL || "https://api.orange.com/payment/v1";

/**
 * 🌍 GATEWAY RÉELLE (Wave / Orange)
 * Cette fonction effectue le véritable mouvement d'argent.
 */
async function processPaymentGateway(provider: string, phone: string, amount: number) {
  const idempotencyKey = `wapp-wd-${uuidv4()}`; // Clé unique pour cette transaction

  console.info(`[GATEWAY_START] Provider: ${provider} | Phone: ${phone} | Idempotency: ${idempotencyKey}`);

  try {
    let response;

    // --- CAS 1 : WAVE (Implémentation Standard) ---
    if (provider === 'WAVE') {
        // Wave demande souvent le montant, la devise et le mobile
        response = await axios.post(
            WAVE_API_URL,
            {
                amount: amount,
                currency: "XOF",
                recipient: phone, // Le numéro de l'utilisateur (ex: +225...)
                // On peut ajouter une description qui apparaîtra sur le SMS du client
                description: "Retrait ImmoFacile" 
            },
            {
                headers: {
                    // La clé secrète ne doit JAMAIS être dans le code, toujours dans .env
                    'Authorization': `Bearer ${process.env.WAVE_API_SECRET_KEY}`,
                    'Content-Type': 'application/json',
                    // Vital : Empêche les doubles paiements en cas de retry réseau
                    'Idempotency-Key': idempotencyKey 
                },
                timeout: 10000 // On abandonne après 10s si Wave ne répond pas
            }
        );
    } 
    
    // --- CAS 2 : ORANGE MONEY (Exemple simplifié) ---
    else if (provider === 'ORANGE_MONEY') {
        // Orange nécessite souvent un Token d'accès avant le paiement (OAuth)
        // Ici on suppose qu'on a déjà le token ou une API Key directe
        response = await axios.post(
            ORANGE_API_URL,
            {
                merchant_key: process.env.OM_MERCHANT_KEY,
                amount: amount,
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
    } 
    
    else {
        throw new Error(`Provider ${provider} non supporté en production.`);
    }

    // Si on arrive ici, l'API a répondu 200 OK ou 201 Created
    console.info(`[GATEWAY_SUCCESS] TxID: ${response.data.id}`);
    
    return { 
        transactionId: response.data.id || idempotencyKey, // L'ID donné par Wave/Orange
        status: 'SUCCESS',
        rawResponse: response.data
    };

  } catch (error: any) {
    // GESTION FINE DES ERREURS HTTP
    // C'est ici qu'on sait si c'est un problème de solde marchand, de numéro invalide, etc.
    
    let errorMessage = "Erreur de connexion opérateur.";
    
    if (axios.isAxiosError(error)) {
        // L'API a répondu avec une erreur (ex: 400 Bad Request, 402 Insufficient Funds)
        const apiError = error.response?.data;
        console.error(`[GATEWAY_FAIL] HTTP ${error.response?.status}`, apiError);

        if (error.response?.status === 402) {
             errorMessage = "Échec : Fonds insuffisants sur le compte marchand ImmoFacile.";
        } else if (error.response?.status === 400) {
             errorMessage = "Numéro de téléphone invalide ou compte non enregistré.";
        } else {
             errorMessage = `Refus opérateur : ${apiError?.message || error.message}`;
        }
    } else {
        console.error(`[GATEWAY_CRASH]`, error);
    }

    // On relance l'erreur pour déclencher le ROLLBACK dans la fonction principale
    throw new Error(errorMessage);
  }
}

/**
 * RÉCUPÉRATION USER (Inchangé)
 */
async function getAuthenticatedUser(request: Request) {
  const userEmail = request.headers.get("x-user-email");
  if (!userEmail) return null;
  
  return prisma.user.findUnique({ 
    where: { email: userEmail },
    select: { id: true, email: true, walletBalance: true }
  });
}

/**
 * ROLLBACK (Inchangé - Toujours aussi vital)
 */
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
        console.info(`[ROLLBACK_DONE] Transaction ${transactionId} annulée.`);
    } catch (e) {
        console.error(`[ROLLBACK_FATAL] Impossible d'annuler ${transactionId}`, e);
    }
}

// =====================================================================
// POST : ORCHESTRATION DU RETRAIT
// =====================================================================
export async function POST(request: Request) {
  let transactionId: string | null = null;
  let userId: string | null = null;

  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Session invalide." }, { status: 401 });
    userId = user.id;

    const body = await request.json();
    const { amount, provider, phone } = body;

    // ... (Validations inchangées) ...
    if (!amount || amount <= 0) return NextResponse.json({ error: "Montant invalide." }, { status: 400 });
    if (user.walletBalance < amount) return NextResponse.json({ error: "Solde insuffisant." }, { status: 400 });

    // 1. VERROUILLAGE DB
    const initialOp = await prisma.$transaction(async (tx) => {
        const updatedUser = await tx.user.update({
            where: { id: user.id },
            data: { walletBalance: { decrement: amount } }
        });

        const txRecord = await tx.transaction.create({
            data: {
                amount: amount,
                type: "DEBIT",
                reason: `CASHOUT_${provider}`,
                status: "PENDING",
                userId: user.id,
                createdAt: new Date()
            }
        });
        return { user: updatedUser, tx: txRecord };
    });

    transactionId = initialOp.tx.id;

    // 2. APPEL RÉEL À WAVE/ORANGE
    await processPaymentGateway(provider, phone, amount);

    // 3. SUCCÈS CONFIRMÉ
    await prisma.transaction.update({
        where: { id: transactionId },
        data: { status: "SUCCESS" }
    });

    return NextResponse.json({
        success: true,
        message: "Transfert envoyé avec succès.",
        newBalance: initialOp.user.walletBalance
    });

  } catch (error: any) {
    // 4. ECHEC & REMBOURSEMENT
    if (transactionId && userId) {
        await performRollback(transactionId, userId);
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

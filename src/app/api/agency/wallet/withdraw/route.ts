import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// =====================================================================
// SIMULATION GATEWAY PAIEMENT (À remplacer par l'intégration réelle)
// =====================================================================
async function sendMobileMoney(provider: string, phone: string, amount: number) {
  console.log(`📡 Connexion à la gateway ${provider}...`);
  
  // Simulation d'un délai réseau
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Simulation : On accepte tout sauf les numéros commençant par "0000" (pour tester l'échec)
  if (phone.startsWith("0000")) {
    throw new Error("Numéro invalide ou rejeté par l'opérateur.");
  }

  // ICI : Intégrez votre vrai appel HTTP (Axios/Fetch)
  // const response = await fetch('https://api.wave.com/v1/payout', { ... })
  
  console.log(`✅ Paiement de ${amount} FCFA envoyé à ${phone} via ${provider}`);
  return { success: true, transactionId: `TX_${Date.now()}` };
}

// =====================================================================
// ROUTE PRINCIPALE
// =====================================================================
export async function POST(req: Request) {
  try {
    // 1. AUTHENTIFICATION
    const userEmail = req.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const admin = await prisma.user.findUnique({
      where: { email: userEmail },
      include: { agency: true }
    });

    if (!admin || admin.role !== "AGENCY_ADMIN") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    // 2. VALIDATION INPUT
    const body = await req.json();
    const amount = parseInt(body.amount);
    const { provider, phone } = body;

    if (!amount || amount < 1000) {
        return NextResponse.json({ error: "Montant minimum : 1000 FCFA" }, { status: 400 });
    }
    if (!["WAVE", "ORANGE_MONEY", "MTN_MOMO"].includes(provider)) {
        return NextResponse.json({ error: "Opérateur non supporté" }, { status: 400 });
    }

    // 3. VÉRIFICATION SOLDE
    if (admin.walletBalance < amount) {
        return NextResponse.json({ error: "Solde insuffisant" }, { status: 400 });
    }

    // ============================================================
    // ÉTAPE CRITIQUE : DÉBIT PRÉVENTIF (Atomicité)
    // On débite d'abord pour verrouiller les fonds.
    // ============================================================
    await prisma.$transaction([
        prisma.user.update({
            where: { id: admin.id },
            data: { walletBalance: { decrement: amount } }
        }),
        prisma.transaction.create({
            data: {
                amount: amount,
                type: "DEBIT",
                reason: `Retrait vers ${provider} (${phone}) - En cours...`,
                userId: admin.id
            }
        })
    ]);

    try {
        // 4. APPEL RÉEL À L'API DE PAIEMENT
        await sendMobileMoney(provider, phone, amount);

        // Si succès, tout va bien, l'argent est parti et le compte est débité.
        return NextResponse.json({ success: true, message: "Retrait effectué avec succès." });

    } catch (paymentError: any) {
        console.error("❌ Échec Paiement Gateway:", paymentError.message);

        // ============================================================
        // ROLLBACK : REMBOURSEMENT AUTOMATIQUE
        // Si l'API échoue, on recrédite l'utilisateur immédiatement.
        // ============================================================
        await prisma.$transaction([
            prisma.user.update({
                where: { id: admin.id },
                data: { walletBalance: { increment: amount } }
            }),
            prisma.transaction.create({
                data: {
                    amount: amount,
                    type: "CREDIT", // On recrédite
                    reason: `Remboursement (Échec retrait ${provider})`,
                    userId: admin.id
                }
            })
        ]);

        return NextResponse.json({ 
            error: `Échec du retrait : ${paymentError.message}. Vos fonds ont été restitués.` 
        }, { status: 502 });
    }

  } catch (error) {
    console.error("Withdraw Server Error:", error);
    return NextResponse.json({ error: "Erreur serveur critique" }, { status: 500 });
  }
}

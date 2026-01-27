import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

// Force dynamic pour ne pas cacher les réponses
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // 1. SÉCURITÉ : AUTHENTIFICATION
    // On récupère l'ID injecté par le Middleware (Preuve de connexion)
    const userId = request.headers.get("x-user-id");
    
    if (!userId) {
        return NextResponse.json({ error: "Accès refusé. Session invalide." }, { status: 401 });
    }

    const body = await request.json();
    const { referenceId, type, phone } = body; // referenceId = leaseId pour un loyer

    // 2. VALIDATION DES DONNÉES
    if (!referenceId || !phone) {
        return NextResponse.json({ error: "Données manquantes (ID Bail ou Téléphone)." }, { status: 400 });
    }

    // 3. LOGIQUE MÉTIER : LOYER
    if (type === 'RENT') {
        // A. Récupérer le Bail et le Montant
        const lease = await prisma.lease.findUnique({
            where: { id: referenceId },
            include: { property: true }
        });

        if (!lease) {
            return NextResponse.json({ error: "Bail introuvable." }, { status: 404 });
        }

        // B. Création de l'ID de Transaction Unique
        const transactionId = uuidv4();

        // C. Enregistrement Préliminaire en Base (Audit Log)
        // On crée le paiement en statut PENDING avant même d'appeler CinetPay
        await prisma.payment.create({
            data: {
                id: transactionId, // On force notre ID pour le retrouver
                amount: lease.monthlyRent,
                type: 'LOYER',
                status: 'PENDING',
                method: 'MOBILE_MONEY',
                leaseId: lease.id,
                // Ventilation (Exemple simple : 100% au proprio pour l'instant)
                amountOwner: lease.monthlyRent, 
                amountPlatform: 0,
                amountAgent: 0,
                amountAgency: 0
            }
        });

        // D. APPEL CINETPAY (Intégration Réelle ou Mock)
        const apikey = process.env.CINETPAY_API_KEY;
        const site_id = process.env.CINETPAY_SITE_ID;
        const mode = process.env.NODE_ENV === 'production' ? 'PRODUCTION' : 'TEST';

        // SI PAS DE CLÉS CONFIGURÉES -> MODE SIMULATION (Pour tester sans bloquer)
        if (!apikey || !site_id) {
            console.warn("⚠️ CINETPAY KEYS MANQUANTES - MODE SIMULATION ACTIVÉ");
            return NextResponse.json({ 
                success: true, 
                paymentUrl: `https://checkout.cinetpay.com/payment-dummy?amount=${lease.monthlyRent}&currency=XOF` // URL fictive ou redirection interne
            });
        }

        // APPEL RÉEL À CINETPAY
        const cinetPayData = {
            apikey: apikey,
            site_id: site_id,
            transaction_id: transactionId,
            amount: lease.monthlyRent,
            currency: 'XOF',
            description: `Loyer - ${lease.property.title}`,
            customer_id: userId,
            customer_name: "Locataire", // Idéalement le nom réel
            customer_surname: "ImmoFacile",
            customer_phone_number: phone,
            customer_email: "client@immofacile.ci", // Idéalement l'email réel
            customer_address: "CI",
            customer_city: "Abidjan",
            customer_country: "CI",
            notify_url: `${process.env.NEXTAUTH_URL}/api/payment/webhook`, // URL de notification serveur
            return_url: `${process.env.NEXTAUTH_URL}/dashboard/tenant`     // Redirection client après paiement
        };

        const response = await axios.post('https://api-checkout.cinetpay.com/v2/payment', cinetPayData);

        if (response.data.code === '201') {
            return NextResponse.json({ 
                success: true, 
                paymentUrl: response.data.data.payment_url 
            });
        } else {
            console.error("ERREUR CINETPAY:", response.data);
            return NextResponse.json({ error: "Erreur initialisation CinetPay" }, { status: 502 });
        }
    }

    return NextResponse.json({ error: "Type de paiement non supporté." }, { status: 400 });

  } catch (error) {
    console.error("🔥 CRASH PAYMENT INIT:", error);
    return NextResponse.json({ error: "Erreur interne serveur." }, { status: 500 });
  }
}

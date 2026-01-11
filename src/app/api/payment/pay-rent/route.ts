import { NextResponse } from 'next/server';
import { PaymentService } from '@/services/payment.service'; // Utilise l'alias @ pour trouver le dossier src

const paymentService = new PaymentService();

// Dans l'App Router, on exporte des fonctions nommées par méthode (POST, GET...)
export async function POST(request: Request) {
  try {
    // 1. Lire le body (différent de l'ancienne version)
    const body = await request.json();
    const { leaseId, email, phone, name } = body;

    // 2. Validation
    if (!leaseId || !phone) {
      return NextResponse.json(
        { error: "Téléphone et ID Bail obligatoires" },
        { status: 400 }
      );
    }

    // 3. Appel du service
    const result = await paymentService.initiateRentPayment(leaseId, { email, phone, name });

    // 4. Réponse JSON standard
    return NextResponse.json({ success: true, ...result });

  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}

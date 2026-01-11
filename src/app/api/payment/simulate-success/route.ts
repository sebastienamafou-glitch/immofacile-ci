import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    // 1. Récupération de l'ID du paiement dans l'URL
    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get('id');

    if (!paymentId) {
      return NextResponse.json({ error: "Paiement introuvable" });
    }

    // 2. Validation du paiement en base de données
    await prisma.payment.update({
      where: { id: paymentId },
      data: { status: "SUCCESS" } // Le loyer est payé !
    });

    // 3. Retour automatique vers le Tableau de Bord du Locataire
    // On ajoute ?payment=success pour pouvoir afficher un confetti ou un succès plus tard
    return NextResponse.redirect(new URL('/dashboard/tenant?payment=success', request.url));

  } catch (error) {
    console.error("Erreur validation:", error);
    return NextResponse.redirect(new URL('/dashboard/tenant?payment=error', request.url));
  }
}

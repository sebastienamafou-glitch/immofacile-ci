import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // ✅ Toujours utiliser le singleton

export const dynamic = 'force-dynamic';

export async function PUT(request: Request) {
  try {
    // 1. SÉCURITÉ (Standard utilisé partout ailleurs)
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) return NextResponse.json({ error: "Utilisateur inconnu" }, { status: 404 });

    // 2. VALIDATION
    const body = await request.json();
    const { provider, number } = body; 
    // provider attendu : "WAVE", "OM", "MTN", etc.

    if (!provider || !number) {
        return NextResponse.json({ error: "Moyen de paiement et numéro requis." }, { status: 400 });
    }

    // 3. MISE À JOUR
    await prisma.user.update({
      where: { id: user.id },
      data: {
        paymentMethod: provider,
        paymentNumber: number
      }
    });

    return NextResponse.json({ success: true, message: "Préférences bancaires mises à jour." });

  } catch (error) {
    console.error("Erreur Update Finance:", error);
    return NextResponse.json({ error: "Erreur serveur lors de la mise à jour." }, { status: 500 });
  }
}

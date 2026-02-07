import { NextResponse } from "next/server";
import { auth } from "@/auth";

import { prisma } from "@/lib/prisma";


export async function PUT(request: Request) {
  try {
    // 1. SÉCURITÉ : Session Serveur (v5)
    const session = await auth();
    const userId = session?.user?.id;
    
    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const body = await request.json();
    const { provider, number } = body;

    // Validation
    if (!provider || !number) {
        return NextResponse.json({ error: "Moyen de paiement requis" }, { status: 400 });
    }

    // 2. MISE À JOUR CIBLÉE (UserFinance)
    // On utilise upsert pour l'auto-guérison (si la finance n'existait pas, on la crée)
    await prisma.userFinance.upsert({
      where: { userId: userId },
      create: {
        userId: userId,
        paymentMethod: provider,
        paymentNumber: number,
        walletBalance: 0,
        version: 1,
        kycTier: 1
      },
      update: { 
        paymentMethod: provider,
        paymentNumber: number
      }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Update Finance Error:", error);
    return NextResponse.json({ error: "Erreur mise à jour finance" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. Identification Sécurisée (Middleware)
    const userId = request.headers.get("x-user-id");
    
    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    // 2. Récupération Données Sensibles
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        paymentMethod: true,
        paymentNumber: true,
        image: true,
        // On ne renvoie JAMAIS le mot de passe
      }
    });

    return NextResponse.json({ success: true, user });

  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

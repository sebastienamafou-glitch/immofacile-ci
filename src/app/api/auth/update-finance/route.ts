import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { verifyToken } from "@/lib/auth";

const prisma = new PrismaClient();

export async function PUT(request: Request) {
  try {
    const userAuth = verifyToken(request);
    const body = await request.json();

    // Mise à jour des préférences de paiement
    await prisma.user.update({
      where: { id: userAuth.id },
      data: {
        paymentMethod: body.provider, // Correspond à 'provider' envoyé par le front
        paymentNumber: body.number    // Correspond à 'number' envoyé par le front
      }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Erreur Update Finance:", error);
    return NextResponse.json({ error: "Erreur lors de la mise à jour bancaire" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(request: Request) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const body = await request.json();
    const { provider, number } = body;

    // Validation
    if (!provider || !number) {
        return NextResponse.json({ error: "Moyen de paiement requis" }, { status: 400 });
    }

    // Mise à jour
    await prisma.user.update({
      where: { id: userId },
      data: { 
        paymentMethod: provider,
        paymentNumber: number
      }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    return NextResponse.json({ error: "Erreur mise à jour finance" }, { status: 500 });
  }
}

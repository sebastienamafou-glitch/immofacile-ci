import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json();
    const { idType, idNumber, documentKey } = body;

    if (!idType || !idNumber || !documentKey) {
      return NextResponse.json({ error: "Données incomplètes" }, { status: 400 });
    }

    // Upsert permet de créer le KYC s'il n'existe pas, ou de le mettre à jour s'il avait été rejeté
    await prisma.userKYC.upsert({
      where: { userId: session.user.id },
      update: {
        idType,
        idNumber,
        documents: [documentKey],
        status: "PENDING",
        updatedAt: new Date()
      },
      create: {
        userId: session.user.id,
        idType,
        idNumber,
        documents: [documentKey],
        status: "PENDING"
      }
    });

    return NextResponse.json({ success: true, message: "Dossier KYC soumis" });

  } catch (error) {
    console.error("Erreur API KYC:", error);
    return NextResponse.json({ error: "Erreur lors de la soumission du dossier" }, { status: 500 });
  }
}

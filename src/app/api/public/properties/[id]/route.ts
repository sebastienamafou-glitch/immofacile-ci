import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const property = await prisma.property.findUnique({
      where: { id: params.id },
      include: {
        owner: { // On affiche juste le nom du proprio pour rassurer
            select: { name: true, kycStatus: true }
        }
      }
    });

    if (!property || !property.isPublished) {
      return NextResponse.json({ error: "Bien introuvable" }, { status: 404 });
    }

    return NextResponse.json(property);
  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

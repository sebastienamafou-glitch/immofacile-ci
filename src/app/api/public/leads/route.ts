import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { name, phone, propertyId, propertyTitle } = await req.json();

    if (!name || !phone || !propertyId) {
      return NextResponse.json({ error: "Données incomplètes" }, { status: 400 });
    }

    // On trouve le bien pour savoir à qui attribuer le prospect
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { ownerId: true }
    });

    if (!property) return NextResponse.json({ error: "Annonce introuvable" }, { status: 404 });

    // Création du Lead assigné au propriétaire/ambassadeur
    await prisma.lead.create({
      data: {
        name,
        phone,
        needs: `Intéressé(e) par : ${propertyTitle}`,
        agentId: property.ownerId // Attribution directe
      }
    });

    return NextResponse.json({ success: true, message: "Prospect enregistré" });

  } catch (error) {
    console.error("Erreur Capture Lead:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

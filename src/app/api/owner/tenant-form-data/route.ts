import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const owner = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!owner) return NextResponse.json({ error: "Inconnu" }, { status: 403 });

    // On récupère les biens avec leurs baux ACTIFS pour indiquer la disponibilité
    const properties = await prisma.property.findMany({
      where: { ownerId: owner.id },
      select: {
        id: true,
        title: true,
        commune: true,
        price: true,
        leases: {
            where: { isActive: true }
        }
      }
    });

    // ✅ CORRECTION ICI : On type 'p' en 'any' pour satisfaire TypeScript
    // (Ou on pourrait définir une interface précise, mais 'any' suffit ici pour le mapping)
    const formattedProperties = properties.map((p: any) => ({
        id: p.id,
        title: p.title,
        commune: p.commune,
        price: p.price,
        // Un bien est dispo s'il n'a aucun bail actif
        isAvailable: p.leases.length === 0 
    }));

    return NextResponse.json({ success: true, properties: formattedProperties });

  } catch (error) {
    console.error("Erreur Tenant Form Data:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

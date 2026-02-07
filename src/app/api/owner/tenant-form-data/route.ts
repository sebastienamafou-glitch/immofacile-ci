import { NextResponse } from "next/server";
import { auth } from "@/auth";

import { prisma } from "@/lib/prisma"; // Singleton

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. SÉCURITÉ
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const owner = await prisma.user.findUnique({ where: { email: userEmail } });
    
    // ✅ AJOUT SÉCURITÉ RÔLE (Manquait ici)
    if (!owner || owner.role !== "OWNER") {
        return NextResponse.json({ error: "Accès réservé aux propriétaires." }, { status: 403 });
    }

    // 2. RÉCUPÉRATION DES BIENS
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

    // 3. FORMATAGE
    const formattedProperties = properties.map((p) => ({
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

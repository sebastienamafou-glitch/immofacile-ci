import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PropertyType } from "@prisma/client";

export const dynamic = 'force-dynamic';

// ==========================================
// 1. GET : Lister MES biens
// ==========================================
export async function GET(req: Request) {
  try {
    // ✅ ZERO TRUST : Auth via ID
    const userId = req.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const properties = await prisma.property.findMany({
      where: {
        ownerId: userId // 🔒 Verrouillage Propriétaire
      },
      include: {
        leases: { where: { isActive: true }, select: { id: true } },
        _count: { select: { incidents: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formatted = properties.map((p) => ({
      ...p,
      isAvailable: p.leases.length === 0,
    }));

    return NextResponse.json({ success: true, properties: formatted });

  } catch (error) {
    console.error("Erreur GET Owner Properties:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// ==========================================
// 2. POST : Ajouter un bien
// ==========================================
export async function POST(req: Request) {
  try {
    // A. Authentification Zero Trust
    const userId = req.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    // B. Récupération User (pour vérifier Role & AgencyId)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, agencyId: true }
    });

    if (!user || user.role !== "OWNER") {
      return NextResponse.json({ error: "Vous devez être propriétaire pour publier." }, { status: 403 });
    }

    // C. Validation Données
    const body = await req.json();

    if (!body.title || !body.address || !body.price || !body.type) {
        return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 });
    }

    // D. Création
    const property = await prisma.property.create({
      data: {
        title: body.title,
        address: body.address,
        commune: body.commune || "Abidjan",
        description: body.description || "",
        
        price: Number(body.price),
        type: body.type as PropertyType,
        bedrooms: Number(body.bedrooms) || 0,
        bathrooms: Number(body.bathrooms) || 0,
        surface: body.surface ? Number(body.surface) : null,
        
        images: body.images || [], 
        isPublished: true,

        // 🟢 Liaison Propriétaire
        ownerId: user.id,

        // 🔗 Liaison Agence Automatique (si applicable)
        agencyId: user.agencyId 
      }
    });

    return NextResponse.json({ success: true, property });

  } catch (error: any) {
    console.error("Erreur création propriété owner:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

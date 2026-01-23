import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PropertyType } from "@prisma/client";

// ==========================================
// 1. GET : Lister MES biens (Espace Propriétaire)
// ==========================================
export async function GET(req: Request) {
  try {
    const userEmail = req.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const owner = await prisma.user.findUnique({
      where: { email: userEmail }
    });

    if (!owner || owner.role !== "OWNER") {
      return NextResponse.json({ error: "Espace réservé aux propriétaires" }, { status: 403 });
    }

    const properties = await prisma.property.findMany({
      where: {
        ownerId: owner.id // 🔒 FILTRE : Uniquement MES biens
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
// 2. POST : Ajouter un bien (Mode JSON / Client Upload)
// ==========================================
export async function POST(req: Request) {
  try {
    // A. Authentification
    const userEmail = req.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { email: userEmail }
    });

    // B. Sécurité Rôle : Êtes-vous bien un Propriétaire ?
    // ⚠️ Si vous avez toujours une erreur 403 ici, vérifiez dans Prisma Studio que votre user a bien le role "OWNER"
    if (!user || user.role !== "OWNER") {
      return NextResponse.json({ error: "Vous devez être propriétaire pour publier." }, { status: 403 });
    }

    // C. Lecture du JSON (Compatible avec AddPropertyPage)
    const body = await req.json();

    // D. Validation des champs
    if (!body.title || !body.address || !body.price || !body.type) {
        return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 });
    }

    // E. Création en base
    const property = await prisma.property.create({
      data: {
        title: body.title,
        address: body.address,
        commune: body.commune || "Abidjan",
        description: body.description || "",
        
        // Conversions sécurisées (le front envoie déjà des nombres, mais on s'assure)
        price: Number(body.price),
        type: body.type as PropertyType,
        bedrooms: Number(body.bedrooms) || 0,
        bathrooms: Number(body.bathrooms) || 0,
        surface: body.surface ? Number(body.surface) : null,
        
        // Les images sont déjà des URLs (String[])
        images: body.images || [], 
        isPublished: true,

        // 🟢 PROPRIÉTAIRE : C'est VOUS
        ownerId: user.id,

        // 🔗 AGENCE : Si vous êtes rattaché à une agence, on lie le bien automatiquement
        agencyId: user.agencyId 
      }
    });

    return NextResponse.json({ success: true, property });

  } catch (error: any) {
    console.error("Erreur création propriété owner:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

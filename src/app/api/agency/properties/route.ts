import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PropertyType } from "@prisma/client";

// ==========================================
// 1. GET : Lister les biens de l'agence
// ==========================================
export async function GET(req: Request) {
  try {
    const userEmail = req.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const admin = await prisma.user.findUnique({
      where: { email: userEmail },
      include: { agency: true }
    });

    // SÉCURITÉ : Seul l'Admin d'Agence accède à cette liste
    if (!admin || admin.role !== "AGENCY_ADMIN" || !admin.agencyId) {
      return NextResponse.json({ error: "Accès Agence requis" }, { status: 403 });
    }

    const properties = await prisma.property.findMany({
      where: {
        agencyId: admin.agencyId // 🔒 FILTRE STRICT : Uniquement les biens de CETTE agence
      },
      include: {
        owner: { select: { name: true, email: true } }, // On récupère les infos du bailleur
        leases: { 
            where: { isActive: true }, 
            select: { id: true } 
        }, // Pour vérifier l'occupation
        _count: { select: { incidents: true } } // Pour les alertes
      },
      orderBy: { createdAt: 'desc' }
    });

    // Formatage pour le front (Calcul de disponibilité)
    const formatted = properties.map((p) => ({
      ...p,
      isAvailable: p.leases.length === 0, 
    }));

    return NextResponse.json({ success: true, properties: formatted });

  } catch (error) {
    console.error("Erreur GET Agency Properties:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// ==========================================
// 2. POST : Créer un nouveau mandat (Bien)
// ==========================================
export async function POST(req: Request) {
  try {
    const userEmail = req.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const admin = await prisma.user.findUnique({
      where: { email: userEmail },
      include: { agency: true }
    });

    // SÉCURITÉ RÔLE
    if (!admin || admin.role !== "AGENCY_ADMIN" || !admin.agencyId) {
      return NextResponse.json({ error: "Accès Agence requis" }, { status: 403 });
    }

    const body = await req.json();

    // VALIDATION : Le Propriétaire (Bailleur) est OBLIGATOIRE
    if (!body.ownerId) {
        return NextResponse.json({ error: "Veuillez sélectionner un propriétaire pour ce mandat." }, { status: 400 });
    }

    // Vérification optionnelle : Est-ce que ce propriétaire existe ?
    const ownerExists = await prisma.user.findUnique({ where: { id: body.ownerId } });
    if (!ownerExists) {
        return NextResponse.json({ error: "Le propriétaire sélectionné est introuvable." }, { status: 404 });
    }

    // CRÉATION DU MANDAT
    const property = await prisma.property.create({
      data: {
        title: body.title,
        address: body.address,
        commune: body.commune || "Abidjan",
        description: body.description || "",
        
        // Conversions numériques
        price: Number(body.price),
        type: body.type as PropertyType,
        bedrooms: Number(body.bedrooms) || 0,
        bathrooms: Number(body.bathrooms) || 0,
        surface: body.surface ? Number(body.surface) : null,
        
        images: body.images || [], 
        isPublished: true,

        // 🟢 LIAISONS CRITIQUES AGENCE :
        ownerId: body.ownerId,     // Le bien appartient au CLIENT (Bailleur)
        agencyId: admin.agencyId   // Le bien est géré par VOTRE AGENCE
      }
    });

    return NextResponse.json({ success: true, property });

  } catch (error) {
    console.error("Erreur POST Agency Property:", error);
    return NextResponse.json({ error: "Erreur serveur lors de la création du mandat" }, { status: 500 });
  }
}

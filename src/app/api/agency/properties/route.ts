import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth"; // ✅ Sécurité Auth.js
import { PropertyType } from "@prisma/client";
import { logActivity } from "@/lib/logger"; // ✅ Audit Log

export const dynamic = 'force-dynamic';

// ============================================================================
// 1. GET : LISTER LES BIENS DE L'AGENCE (Sécurisé)
// ============================================================================
export async function GET(req: Request) {
  try {
    // 🔒 AUTHENTIFICATION ROBUSTE (Pas de headers bricolés)
    const session = await auth();
    if (!session || !session.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 🔒 CONTRÔLE D'ACCÈS (RBAC)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, agencyId: true }
    });

    if (!user || !user.agencyId || (user.role !== "AGENCY_ADMIN" && user.role !== "AGENT")) {
      return NextResponse.json({ error: "Accès réservé au personnel d'agence." }, { status: 403 });
    }

    // 🔍 RÉCUPÉRATION ISOLÉE (Multi-tenant)
    // On ne récupère QUE les biens de SON agence
    const properties = await prisma.property.findMany({
      where: { agencyId: user.agencyId },
      include: {
        owner: { select: { name: true, email: true, image: true } },
        leases: { select: { status: true } } // Pour voir si loué
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(properties);

  } catch (error) {
    console.error("API GET Properties Error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// ============================================================================
// 2. POST : CRÉER UN MANDAT (Corrigé & Audité)
// ============================================================================
export async function POST(req: Request) {
  try {
    // 🔒 1. AUTHENTIFICATION
    const session = await auth();
    if (!session || !session.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 🔒 2. VÉRIFICATION DES DROITS
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { agency: true }
    });

    // Seul un ADMIN d'agence peut créer un mandat (règle métier à confirmer, sinon AGENT aussi)
    if (!user || user.role !== "AGENCY_ADMIN" || !user.agencyId) {
      return NextResponse.json({ error: "Seuls les administrateurs d'agence peuvent créer des mandats." }, { status: 403 });
    }

    // 📝 3. VALIDATION DES DONNÉES
    const body = await req.json();

    if (!body.ownerId || !body.title || !body.price) {
        return NextResponse.json({ error: "Données manquantes (Propriétaire, Titre, Prix)." }, { status: 400 });
    }

    // 💾 4. CRÉATION (Database)
    const newProperty = await prisma.property.create({
      data: {
        title: body.title,
        description: body.description || "",
        address: body.address,
        commune: body.commune || "Abidjan",
        
        // Sécurisation des types numériques
        price: Number(body.price),
        surface: body.surface ? Number(body.surface) : null,
        bedrooms: Number(body.bedrooms) || 0,
        bathrooms: Number(body.bathrooms) || 0,
        type: body.type as PropertyType,
        
        images: body.images || [],
        isPublished: true, 

        // 🔗 LIAISONS CRITIQUES
        ownerId: body.ownerId,       // Le client
        agencyId: user.agencyId      // L'agence de l'admin connecté
      }
    });

    // 🕵️‍♂️ 5. AUDIT LOG (Le Mouchard)
    // On trace qui a créé le mandat et pour quel propriétaire
    await logActivity({
        action: "PROPERTY_CREATED", // Ajoutez ce type dans logger.ts si absent, ou utilisez un générique
        entityId: newProperty.id,
        entityType: "PROPERTY",
        userId: session.user.id,
        metadata: {
            agencyId: user.agencyId,
            ownerId: body.ownerId,
            price: newProperty.price,
            title: newProperty.title
        }
    });

    return NextResponse.json({ success: true, property: newProperty });

  } catch (error) {
    console.error("API POST Property Error:", error);
    return NextResponse.json({ error: "Erreur lors de la création du mandat" }, { status: 500 });
  }
}

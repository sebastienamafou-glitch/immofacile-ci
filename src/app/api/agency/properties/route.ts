import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PropertyType } from "@prisma/client";
import { auth } from "@/auth";

export const dynamic = 'force-dynamic';

// ==========================================
// 1. GET : Lister les biens de l'agence
// ==========================================
export async function GET(req: Request) {
  try {
    // 1. SÉCURITÉ ZERO TRUST (ID injecté par Middleware)
    const session = await auth();
if (!session || !session.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const userId = session.user.id;
    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    // 2. VÉRIFICATION RÔLE & AGENCE
    const admin = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, agencyId: true }
    });

    if (!admin || !admin.agencyId || (admin.role !== "AGENCY_ADMIN" && admin.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Accès Agence requis." }, { status: 403 });
    }

    // 3. RÉCUPÉRATION DES MANDATS
    const properties = await prisma.property.findMany({
      where: {
        agencyId: admin.agencyId // 🔒 FILTRE STRICT : Uniquement les biens de CETTE agence
      },
      include: {
        owner: { select: { name: true, email: true, phone: true } }, 
        leases: { 
            where: { isActive: true }, 
            select: { id: true } 
        },
        _count: { select: { incidents: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Formatage (Disponibilité)
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

// 2. POST : CRÉER UN NOUVEAU MANDAT
// ==========================================
export async function POST(req: Request) {
  try {
    // 1. SÉCURITÉ ZERO TRUST (ID injecté par Middleware)
    const session = await auth();
if (!session || !session.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const userId = session.user.id;
    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    // 2. VÉRIFICATION ADMIN AGENCE
    const admin = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, agencyId: true }
    });

    if (!admin || !admin.agencyId || (admin.role !== "AGENCY_ADMIN" && admin.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Accès Agence requis." }, { status: 403 });
    }

    // 3. VALIDATION DONNÉES
    const body = await req.json();

    if (!body.ownerId || !body.title || !body.price) {
        return NextResponse.json({ error: "Propriétaire, Titre et Prix requis." }, { status: 400 });
    }

    // 4. CRÉATION SÉCURISÉE (Contexte Agence Forcé)
    const property = await prisma.property.create({
      data: {
        title: body.title,
        description: body.description || "",
        address: body.address,
        commune: body.commune || "Abidjan",
        
        price: Number(body.price),
        surface: body.surface ? Number(body.surface) : null,
        bedrooms: Number(body.bedrooms) || 0,
        bathrooms: Number(body.bathrooms) || 0,
        type: body.type as PropertyType,
        
        images: body.images || [],
        isPublished: true, 

        // 🟢 SÉCURITÉ CRITIQUE :
        ownerId: body.ownerId,       // Le bien appartient au client sélectionné
        agencyId: admin.agencyId     // Le bien est VERROUILLÉ sur votre agence
      }
    });

    return NextResponse.json({ success: true, property });

  } catch (error: any) {
    console.error("Create Agency Property Error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

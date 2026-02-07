import { NextResponse } from "next/server";
import { auth } from "@/auth";

import { prisma } from "@/lib/prisma";


export const dynamic = 'force-dynamic';

// =========================================================
// 1. GET : Récupérer UN bien spécifique
// =========================================================
export async function GET(
  req: Request,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  try {
    const { propertyId } = await params;

    // ✅ SÉCURITÉ ZERO TRUST : Identification par ID (Middleware)
    const session = await auth();
if (!session || !session.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const userId = session.user.id;
    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const property = await prisma.property.findUnique({
      where: { 
        id: propertyId,
        ownerId: userId // 🔒 Vérifie que l'ID correspond au propriétaire du bien
      },
      include: {
        leases: { 
            include: { tenant: { select: { name: true, email: true, phone: true } } } 
        },
        incidents: true,
        agency: { select: { name: true, phone: true } }
      }
    });

    if (!property) {
      return NextResponse.json({ error: "Bien introuvable ou accès refusé" }, { status: 404 });
    }

    // Calcul disponibilité en temps réel
    const activeLease = property.leases.find(l => l.isActive);
    const formattedProperty = {
        ...property,
        isAvailable: !activeLease
    };

    return NextResponse.json({ success: true, property: formattedProperty });

  } catch (error) {
    console.error("Error GET Property:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// =========================================================
// 2. PUT : Modifier le bien
// =========================================================
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  try {
    const { propertyId } = await params;
    const session = await auth();
if (!session || !session.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const userId = session.user.id;
    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const body = await req.json();

    // Mise à jour sécurisée (Directement avec ownerId)
    // Prisma lancera une erreur si l'enregistrement n'existe pas pour cet ownerId
    const updatedProperty = await prisma.property.update({
      where: { 
        id: propertyId,
        ownerId: userId 
      },
      data: {
        title: body.title,
        price: Number(body.price),
        description: body.description,
        // Validation stricte du type PropertyType si nécessaire, ici on fait confiance au schéma
        bedrooms: body.bedrooms ? Number(body.bedrooms) : undefined,
        bathrooms: body.bathrooms ? Number(body.bathrooms) : undefined,
        surface: body.surface ? Number(body.surface) : undefined,
        isPublished: body.isPublished
      }
    });

    return NextResponse.json({ success: true, property: updatedProperty });

  } catch (error) {
    console.error("Error UPDATE Property:", error);
    // Gestion fine : Si l'erreur vient du fait que le record n'existe pas (P2025)
    return NextResponse.json({ error: "Impossible de modifier (Bien introuvable ou droits insuffisants)" }, { status: 500 });
  }
}

// =========================================================
// 3. DELETE : Supprimer le bien (Blindé)
// =========================================================
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  try {
    const { propertyId } = await params;
    const session = await auth();
if (!session || !session.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const userId = session.user.id;
    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    // 1. Vérification Métier : Baux actifs
    const property = await prisma.property.findUnique({
        where: { id: propertyId, ownerId: userId },
        include: { leases: { where: { isActive: true } } }
    });

    if (!property) return NextResponse.json({ error: "Bien introuvable" }, { status: 404 });

    if (property.leases.length > 0) {
        return NextResponse.json({ error: "Impossible de supprimer un bien avec un locataire en place." }, { status: 409 }); // 409 Conflict
    }

    // 2. Suppression (Cascade gérée par Prisma ou manuellement selon schéma)
    // Ici on supprime le bien, Prisma gérera les cascades si configuré (listings, incidents...)
    await prisma.property.delete({
      where: { id: propertyId }
    });

    return NextResponse.json({ success: true, message: "Bien supprimé" });

  } catch (error) {
    console.error("Error DELETE Property:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

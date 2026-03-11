import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireKyc } from "@/lib/gatekeeper"; 

export const dynamic = 'force-dynamic';

// =========================================================
// 1. GET : Récupérer UN bien spécifique
// =========================================================
export async function GET(
  req: Request,
  { params }: { params: Promise<{ propertyId: string }> } // ✅ Restauration stricte du nom de dossier
) {
  try {
    const { propertyId } = await params;

    const session = await auth();
    if (!session || !session.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = session.user.id;

    const property = await prisma.property.findUnique({
      where: { 
        id: propertyId,
        ownerId: userId 
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

    const activeLease = property.leases.find(l => l.isActive);
    const formattedProperty = { ...property, isAvailable: !activeLease };

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
  { params }: { params: Promise<{ propertyId: string }> } // ✅ Restauration stricte
) {
  try {
    const { propertyId } = await params;
    
    const session = await auth();
    if (!session || !session.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = session.user.id;

    try {
        await requireKyc(userId);
    } catch (e) {
        return NextResponse.json({ error: "Action refusée : Identité non vérifiée.", code: "KYC_REQUIRED" }, { status: 403 });
    }

    const body = await req.json();

    const updatedProperty = await prisma.property.update({
      where: { id: propertyId, ownerId: userId },
      data: {
        title: body.title,
        price: Number(body.price),
        description: body.description,
        bedrooms: body.bedrooms ? Number(body.bedrooms) : undefined,
        bathrooms: body.bathrooms ? Number(body.bathrooms) : undefined,
        surface: body.surface ? Number(body.surface) : undefined,
        isPublished: body.isPublished
      }
    });

    return NextResponse.json({ success: true, property: updatedProperty });

  } catch (error) {
    console.error("Error UPDATE Property:", error);
    return NextResponse.json({ error: "Impossible de modifier" }, { status: 500 });
  }
}

// =========================================================
// 3. DELETE : Supprimer le bien
// =========================================================
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ propertyId: string }> } // ✅ Restauration stricte
) {
  try {
    const { propertyId } = await params;
    
    const session = await auth();
    if (!session || !session.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = session.user.id;

    try {
        await requireKyc(userId);
    } catch (e) {
        return NextResponse.json({ error: "Action refusée : Identité non vérifiée.", code: "KYC_REQUIRED" }, { status: 403 });
    }

    const property = await prisma.property.findUnique({
        where: { id: propertyId, ownerId: userId },
        include: { leases: { where: { isActive: true } } }
    });

    if (!property) return NextResponse.json({ error: "Bien introuvable" }, { status: 404 });
    if (property.leases.length > 0) return NextResponse.json({ error: "Impossible de supprimer un bien avec un locataire en place." }, { status: 409 });

    await prisma.property.delete({ where: { id: propertyId } });

    return NextResponse.json({ success: true, message: "Bien supprimé" });

  } catch (error) {
    console.error("Error DELETE Property:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

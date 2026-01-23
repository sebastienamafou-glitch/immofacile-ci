import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// =========================================================
// 1. GET : Récupérer UN bien spécifique (Détails)
// =========================================================
export async function GET(
  req: Request,
  { params }: { params: { propertyId: string } }
) {
  try {
    const userEmail = req.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const propertyId = params.propertyId;

    // Vérification que le demandeur est bien le propriétaire du bien
    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) return NextResponse.json({ error: "Utilisateur inconnu" }, { status: 403 });

    const property = await prisma.property.findUnique({
      where: { 
        id: propertyId,
        // 🔒 SÉCURITÉ CRITIQUE : On vérifie que c'est bien SON bien
        ownerId: user.id 
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

    // Calcul disponibilité
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
// 2. PUT : Modifier le bien (Titre, Prix, Desc...)
// =========================================================
export async function PUT(
  req: Request,
  { params }: { params: { propertyId: string } }
) {
  try {
    const userEmail = req.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    const body = await req.json();

    // Mise à jour sécurisée
    const updatedProperty = await prisma.property.update({
      where: { 
        id: params.propertyId,
        ownerId: user.id // Sécurité
      },
      data: {
        title: body.title,
        price: Number(body.price),
        description: body.description,
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
  { params }: { params: { propertyId: string } }
) {
  try {
    const userEmail = req.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    // On vérifie s'il y a des baux actifs avant de supprimer
    const property = await prisma.property.findUnique({
        where: { id: params.propertyId },
        include: { leases: { where: { isActive: true } } }
    });

    if (property?.leases && property.leases.length > 0) {
        return NextResponse.json({ error: "Impossible de supprimer un bien avec un locataire en place." }, { status: 400 });
    }

    await prisma.property.delete({
      where: { 
        id: params.propertyId,
        ownerId: user.id 
      }
    });

    return NextResponse.json({ success: true, message: "Bien supprimé" });

  } catch (error) {
    console.error("Error DELETE Property:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

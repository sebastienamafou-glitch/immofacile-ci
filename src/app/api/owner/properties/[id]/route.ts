import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// --- 1. GET : DÉTAILS DU BIEN ---
export async function GET(
  request: Request,
  // ✅ CORRECTION NEXT.JS 15 : params est une Promise
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params; // On attend l'ID

    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const owner = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!owner) return NextResponse.json({ error: "Inconnu" }, { status: 403 });

    const property = await prisma.property.findFirst({
      where: {
        id: id,
        ownerId: owner.id, // Sécurité : On vérifie que c'est bien son bien
      },
      include: {
        leases: {
            where: { isActive: true },
            select: { id: true, startDate: true, tenant: { select: { name: true } } }
        },
        missions: {
            orderBy: { createdAt: 'desc' },
            take: 5
        },
        incidents: {
            where: { status: { not: 'CLOSED' } },
            take: 3
        }
      },
    });

    if (!property) return NextResponse.json({ error: "Bien introuvable" }, { status: 404 });

    const isAvailable = property.leases.length === 0;

    return NextResponse.json({
      success: true,
      property: {
        ...property,
        isAvailable,
      },
    });

  } catch (error) {
    console.error("Erreur GET Property:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// --- 2. PUT : MODIFICATION DES INFOS ---
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
     const { id } = await params;

     const userEmail = request.headers.get("x-user-email");
     if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

     const owner = await prisma.user.findUnique({ where: { email: userEmail } });
     if (!owner) return NextResponse.json({ error: "Interdit" }, { status: 403 });

     const body = await request.json();

     const updatedProperty = await prisma.property.update({
        where: { id: id, ownerId: owner.id },
        data: {
            title: body.title,
            description: body.description,
            price: body.price ? Math.abs(parseInt(body.price)) : undefined,
            isPublished: body.isPublished
        }
     });

     return NextResponse.json({ success: true, property: updatedProperty });

  } catch (error) {
      console.error("Erreur PUT Property:", error);
      return NextResponse.json({ error: "Impossible de mettre à jour" }, { status: 500 });
  }
}

// --- 3. DELETE : SUPPRESSION INTELLIGENTE ---
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
  ) {
    try {
       const { id } = await params;

       const userEmail = request.headers.get("x-user-email");
       if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  
       const owner = await prisma.user.findUnique({ where: { email: userEmail } });
       if (!owner) return NextResponse.json({ error: "Interdit" }, { status: 403 });
  
       // TRANSACTION
       await prisma.$transaction([
           prisma.mission.deleteMany({ where: { propertyId: id } }),
           prisma.incident.deleteMany({ where: { propertyId: id } }),
           prisma.property.delete({
              where: { id: id, ownerId: owner.id }
           })
       ]);
  
       return NextResponse.json({ success: true });
  
    } catch (error) {
        console.error("Erreur DELETE Property:", error);
        return NextResponse.json({ 
            error: "Impossible de supprimer : Ce bien a des baux ou des paiements actifs." 
        }, { status: 500 });
    }
  }

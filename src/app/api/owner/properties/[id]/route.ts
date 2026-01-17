import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Singleton

export const dynamic = 'force-dynamic';

// --- 1. GET : DÉTAILS DU BIEN ---
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> } // ✅ Next.js 15
) {
  try {
    const { id } = await params;

    // 1. SÉCURITÉ
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const owner = await prisma.user.findUnique({ where: { email: userEmail } });
    
    // ✅ CHECK RÔLE
    if (!owner || owner.role !== "OWNER") {
        return NextResponse.json({ error: "Accès réservé aux propriétaires." }, { status: 403 });
    }

    // 2. RÉCUPÉRATION
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

    // Un bien est disponible s'il n'a AUCUN bail actif
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
     
     // ✅ CHECK RÔLE
     if (!owner || owner.role !== "OWNER") {
         return NextResponse.json({ error: "Interdit" }, { status: 403 });
     }

     const body = await request.json();

     // Mise à jour sécurisée (Seul le propriétaire du bien peut modifier)
     const updatedProperty = await prisma.property.update({
        where: { id: id, ownerId: owner.id },
        data: {
            title: body.title,
            description: body.description,
            price: body.price ? Math.abs(parseInt(body.price)) : undefined,
            isPublished: body.isPublished, // Boolean
            // On ne permet pas de modifier 'ownerId' ici
        }
     });

     return NextResponse.json({ success: true, property: updatedProperty });

  } catch (error) {
      console.error("Erreur PUT Property:", error);
      return NextResponse.json({ error: "Impossible de mettre à jour" }, { status: 500 });
  }
}

// --- 3. DELETE : SUPPRESSION SÉCURISÉE ---
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
  ) {
    try {
       const { id } = await params;

       const userEmail = request.headers.get("x-user-email");
       if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  
       const owner = await prisma.user.findUnique({ where: { email: userEmail } });
       
       // ✅ CHECK RÔLE
       if (!owner || owner.role !== "OWNER") {
           return NextResponse.json({ error: "Interdit" }, { status: 403 });
       }
  
       // 🚨 VÉRIFICATION PRÉALABLE (CRUCIAL)
       // On vérifie s'il y a des baux (passés ou présents) liés à ce bien
       const propertyWithLeases = await prisma.property.findFirst({
           where: { id: id, ownerId: owner.id },
           include: { 
               leases: { select: { id: true } } // On vérifie juste l'existence
           }
       });

       if (!propertyWithLeases) return NextResponse.json({ error: "Bien introuvable" }, { status: 404 });

       // Si le bien a déjà eu des locataires, on INTERDIT la suppression pour raisons comptables/légales
       if (propertyWithLeases.leases.length > 0) {
           return NextResponse.json({ 
               error: "Impossible de supprimer ce bien car il possède un historique de location (baux). Veuillez plutôt le désactiver (dépublier)." 
           }, { status: 400 });
       }

       // S'il est vierge (pas de baux), on peut supprimer proprement
       await prisma.$transaction([
           prisma.mission.deleteMany({ where: { propertyId: id } }),
           prisma.incident.deleteMany({ where: { propertyId: id } }),
           // On supprime le bien
           prisma.property.delete({
              where: { id: id }
           })
       ]);
  
       return NextResponse.json({ success: true, message: "Bien supprimé définitivement" });
  
    } catch (error) {
        console.error("Erreur DELETE Property:", error);
        return NextResponse.json({ 
            error: "Erreur serveur lors de la suppression." 
        }, { status: 500 });
    }
  }

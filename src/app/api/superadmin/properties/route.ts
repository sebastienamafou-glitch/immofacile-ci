import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export const dynamic = 'force-dynamic';

// --- HELPER DE SÉCURITÉ ---
async function checkSuperAdminPermission(request: Request) {
  const userEmail = request.headers.get("x-user-email");
  if (!userEmail) return { authorized: false, status: 401, error: "Non authentifié" };

  const admin = await prisma.user.findUnique({ 
    where: { email: userEmail },
    select: { role: true }
  });

  if (!admin || admin.role !== Role.SUPER_ADMIN) {
    return { authorized: false, status: 403, error: "Accès refusé" };
  }

  return { authorized: true };
}

// --- GET : LISTER TOUT LE PARC IMMOBILIER ---
export async function GET(request: Request) {
  try {
    // 1. Sécurité
    const auth = await checkSuperAdminPermission(request);
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status });

    // 2. Requête Complexe (Eager Loading)
    const properties = await prisma.property.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        owner: {
            select: { name: true, email: true, phone: true }
        },
        agency: { // Support du mode SaaS (Agences)
            select: { name: true, logoUrl: true }
        },
        leases: {
            where: { isActive: true }, // Pour savoir si c'est loué actuellement
            select: { id: true }
        }
      }
    });

    // 3. Transformation des données (DTO) pour le Frontend
    const formatted = properties.map(p => ({
        id: p.id,
        title: p.title,
        price: p.price,
        commune: p.commune,
        type: p.type,
        isPublished: p.isPublished,
        images: p.images,
        // Logique : Si Agence, on affiche l'Agence. Sinon le Proprio.
        manager: p.agency 
            ? { name: p.agency.name, type: "AGENCY", sub: "Agence Partenaire" }
            : { name: p.owner.name || "Inconnu", type: "OWNER", sub: p.owner.email },
        status: p.leases.length > 0 ? "OCCUPIED" : "AVAILABLE",
        createdAt: p.createdAt
    }));

    return NextResponse.json({ success: true, properties: formatted });

  } catch (error) {
    console.error("[API_PROPERTIES] Error:", error);
    return NextResponse.json({ error: "Erreur chargement parc immobilier" }, { status: 500 });
  }
}

// --- DELETE : SUPPRESSION SÉCURISÉE ---
export async function DELETE(request: Request) {
    try {
        // 1. Sécurité
        const auth = await checkSuperAdminPermission(request);
        if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status });

        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) return NextResponse.json({ error: "ID requis" }, { status: 400 });

        // 2. Vérification d'Intégrité (Règle Métier)
        const property = await prisma.property.findUnique({
            where: { id },
            include: { leases: true } // On vérifie TOUT l'historique
        });

        if (!property) return NextResponse.json({ error: "Bien introuvable" }, { status: 404 });

        // 🛑 BLOQUAGE : Si le bien a un historique, on interdit la suppression
        if (property.leases.length > 0) {
            return NextResponse.json({ 
                error: "IMPOSSIBLE DE SUPPRIMER : Ce bien est lié à des contrats de bail (actifs ou passés). Archivez-le plutôt en le dépubliant." 
            }, { status: 409 });
        }

        // 3. Nettoyage en cascade (Transaction)
        await prisma.$transaction([
            prisma.mission.deleteMany({ where: { propertyId: id } }), // Missions techniques
            prisma.incident.deleteMany({ where: { propertyId: id } }), // Signalements
            prisma.listing.deleteMany({ where: { propertyId: id } }), // Annonces Airbnb liées
            prisma.property.delete({ where: { id } }) // Le bien lui-même
        ]);

        return NextResponse.json({ success: true, message: "Bien supprimé du parc." });

    } catch (error: any) {
        console.error("[API_PROPERTIES_DELETE] Error:", error);
        return NextResponse.json({ error: "Erreur technique lors de la suppression." }, { status: 500 });
    }
}

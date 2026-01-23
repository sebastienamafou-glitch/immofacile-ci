import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client"; 

export const dynamic = 'force-dynamic';

// Typage avancé : On ajoute l'Agence ici
type AdminProperty = Prisma.PropertyGetPayload<{
  include: {
    owner: { select: { name: true, email: true, phone: true } },
    agency: { select: { name: true } }, // 👈 AJOUT : Info Agence
    leases: { where: { isActive: true } }
  }
}>;

// --- GET : VOIR TOUS LES BIENS (Agences + Propriétaires directs) ---
export async function GET(request: Request) {
  try {
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const admin = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!admin || admin.role !== "SUPER_ADMIN") {
        return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
    }

    const properties = await prisma.property.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        owner: {
            select: { name: true, email: true, phone: true }
        },
        agency: { // 👈 AJOUT : On charge la relation Agence
            select: { name: true }
        },
        leases: {
            where: { isActive: true }
        }
      }
    });

    const formatted = (properties as AdminProperty[]).map(p => ({
        ...p,
        isAvailable: p.leases.length === 0,
        ownerName: p.owner?.name || "Inconnu",
        agencyName: p.agency?.name || null, // 👈 AJOUT : Nom de l'agence ou null
        managerType: p.agency ? "AGENCY" : "OWNER" // Petit helper pour le frontend
    }));

    return NextResponse.json(formatted);

  } catch (error: any) {
    console.error("Erreur GET Properties:", error);
    return NextResponse.json({ error: "Erreur serveur", details: error.message }, { status: 500 });
  }
}

// --- DELETE : SUPPRIMER UN BIEN ---
export async function DELETE(request: Request) {
    try {
        const userEmail = request.headers.get("x-user-email");
        if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

        const admin = await prisma.user.findUnique({ where: { email: userEmail } });
        if (!admin || admin.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Interdit" }, { status: 403 });

        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) return NextResponse.json({ error: "ID manquant" }, { status: 400 });

        // 1. VÉRIFICATION AVANT SUPPRESSION (CRITIQUE)
        const property = await prisma.property.findUnique({
            where: { id },
            include: { leases: true } // On vérifie TOUS les baux (actifs ou passés)
        });

        if (!property) return NextResponse.json({ error: "Bien introuvable" }, { status: 404 });

        // Si le bien a déjà servi (baux existants), on INTERDIT la suppression pour garder l'historique
        if (property.leases.length > 0) {
            return NextResponse.json({ 
                error: "Impossible de supprimer ce bien car il possède un historique de location. Veuillez plutôt le modifier en 'Non publié'." 
            }, { status: 409 });
        }

        // 2. NETTOYAGE ET SUPPRESSION
        // On peut supprimer uniquement s'il est vierge de tout contrat
        await prisma.$transaction([
            prisma.mission.deleteMany({ where: { propertyId: id } }),
            prisma.incident.deleteMany({ where: { propertyId: id } }),
            prisma.property.delete({ where: { id } })
        ]);

        return NextResponse.json({ success: true, message: "Bien supprimé définitivement." });

    } catch (error: any) {
        console.error("Erreur Delete Property:", error);
        return NextResponse.json({ error: "Impossible de supprimer (Dépendances existantes).", details: error.message }, { status: 500 });
    }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client"; 

export const dynamic = 'force-dynamic';

// Typage avancé (Très bien joué !)
type AdminProperty = Prisma.PropertyGetPayload<{
  include: {
    owner: { select: { name: true, email: true, phone: true } },
    leases: { where: { isActive: true } }
  }
}>;

// --- GET : VOIR TOUS LES BIENS ---
export async function GET(request: Request) {
  try {
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const admin = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!admin || admin.role !== "ADMIN") {
        return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
    }

    const properties = await prisma.property.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        owner: {
            select: { name: true, email: true, phone: true }
        },
        leases: {
            where: { isActive: true }
        }
      }
    });

    const formatted = (properties as AdminProperty[]).map(p => ({
        ...p,
        isAvailable: p.leases.length === 0,
        ownerName: p.owner?.name || "Inconnu", // Sécurité null check
        ownerEmail: p.owner?.email,
        ownerPhone: p.owner?.phone
    }));

    return NextResponse.json({ success: true, properties: formatted });

  } catch (error) {
    console.error("Erreur Admin Properties:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// --- DELETE : SUPPRESSION SÉCURISÉE ---
export async function DELETE(request: Request) {
    try {
        const userEmail = request.headers.get("x-user-email");
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!userEmail || !id) return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });

        const admin = await prisma.user.findUnique({ where: { email: userEmail } });
        if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Interdit" }, { status: 403 });

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

    } catch (error) {
        console.error("Erreur Delete Property:", error);
        return NextResponse.json({ error: "Impossible de supprimer (Dépendances existantes)." }, { status: 500 });
    }
}

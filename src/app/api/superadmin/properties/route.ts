import { NextResponse } from "next/server";
import { auth } from "@/auth";

import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// --- HELPER DE SÉCURITÉ (ZERO TRUST) ---
async function checkSuperAdminPermission(request: Request) {
  // 1. Identification par ID (Session via Middleware)
  const session = await auth();
  
  // 🔒 CORRECTION : Retourner l'objet standardisé au lieu de NextResponse
  if (!session || !session.user?.id) {
    return { authorized: false, status: 401, error: "Non authentifié" };
  }
  
  const userId = session.user.id;

  // 2. Vérification Rôle
  const admin = await prisma.user.findUnique({ 
    where: { id: userId },
    select: { id: true, role: true }
  });

  if (!admin || admin.role !== "SUPER_ADMIN") {
    return { authorized: false, status: 403, error: "Accès refusé. Réservé au Super Admin." };
  }

  return { authorized: true, admin };
}

// ==========================================
// 1. GET : LISTER TOUT LE PARC
// ==========================================
export async function GET(request: Request) {
  try {
    const auth = await checkSuperAdminPermission(request);
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status });

    // Requête Eager Loading (Proprio + Agence + Baux)
    const properties = await prisma.property.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        owner: {
            select: { name: true, email: true, phone: true }
        },
        agency: { 
            select: { name: true, logoUrl: true }
        },
        leases: {
            where: { isActive: true }, 
            select: { id: true }
        }
      }
    });

    // DTO Frontend
    const formatted = properties.map(p => ({
        id: p.id,
        title: p.title,
        price: p.price,
        commune: p.commune,
        type: p.type,
        isPublished: p.isPublished,
        images: p.images,
        // Logique d'affichage Gestionnaire
        manager: p.agency 
            ? { name: p.agency.name, type: "AGENCY", sub: "Agence Partenaire" }
            : { name: p.owner.name || "Inconnu", type: "OWNER", sub: p.owner.email },
        // Statut calculé
        status: p.leases.length > 0 ? "OCCUPIED" : "AVAILABLE",
        createdAt: p.createdAt
    }));

    return NextResponse.json({ success: true, properties: formatted });

  } catch (error) {
    console.error("[API_PROPERTIES_GET] Error:", error);
    return NextResponse.json({ error: "Erreur chargement parc" }, { status: 500 });
  }
}

// ==========================================
// 2. DELETE : SUPPRESSION SÉCURISÉE
// ==========================================
export async function DELETE(request: Request) {
    try {
        const auth = await checkSuperAdminPermission(request);
        if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status });

        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) return NextResponse.json({ error: "ID requis" }, { status: 400 });

        // ✅ CORRECTION : On passe par 'listings' pour trouver les 'bookings'
        const property = await prisma.property.findUnique({
            where: { id },
            include: { 
                leases: true,
                listings: {
                    include: { bookings: true } // On regarde dans les annonces liées
                }
            } 
        });

        if (!property) return NextResponse.json({ error: "Bien introuvable" }, { status: 404 });

        // Calcul du nombre total de réservations sur toutes les annonces de ce bien
        const totalBookings = property.listings.reduce((acc, listing) => acc + listing.bookings.length, 0);

        // 🛑 BLOQUAGE SÉCURISÉ
        if (property.leases.length > 0 || totalBookings > 0) {
            return NextResponse.json({ 
                error: "SUPPRESSION IMPOSSIBLE : Ce bien possède un historique (Baux ou Réservations via des annonces). Veuillez l'archiver." 
            }, { status: 409 });
        }

        // Nettoyage en cascade
        await prisma.$transaction([
            prisma.mission.deleteMany({ where: { propertyId: id } }),
            prisma.incident.deleteMany({ where: { propertyId: id } }),
            // On supprime d'abord les annonces liées pour éviter les contraintes de clé étrangère
            prisma.listing.deleteMany({ where: { propertyId: id } }), 
            prisma.property.delete({ where: { id } })
        ]);

        return NextResponse.json({ success: true, message: "Bien supprimé définitivement." });

    } catch (error: any) {
        console.error("[API_PROPERTIES_DELETE] Error:", error);
        return NextResponse.json({ error: "Erreur technique lors de la suppression." }, { status: 500 });
    }
}

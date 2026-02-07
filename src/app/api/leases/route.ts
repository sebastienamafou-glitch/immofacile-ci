import { NextResponse } from "next/server";
import { auth } from "@/auth";

import { prisma } from "@/lib/prisma"; // Singleton

export const dynamic = 'force-dynamic';

// =====================================================================
// 1. GET : RÉCUPÉRER LES CONTRATS (FILTRAGE STRICT PAR RÔLE)
// =====================================================================
export async function GET(request: Request) {
  try {
    // A. AUTHENTIFICATION
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

    let leases = [];

    // B. LOGIQUE DE FILTRAGE SELON LE RÔLE
    if (user.role === "SUPER_ADMIN") {
        // L'Admin voit TOUT
        leases = await prisma.lease.findMany({
            include: {
                property: { select: { title: true, address: true } },
                tenant: { select: { name: true, email: true } },
                signatures: true // Pour voir l'état des signatures
            },
            orderBy: { createdAt: 'desc' }
        });

    } else if (user.role === "OWNER") {
        // Le Propriétaire ne voit que les baux de SES biens
        leases = await prisma.lease.findMany({
            where: {
                property: {
                    ownerId: user.id // 🔒 SÉCURITÉ CRITIQUE
                }
            },
            include: {
                property: { select: { title: true } },
                tenant: { select: { name: true, email: true, phone: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

    } else if (user.role === "TENANT") {
        // Le Locataire ne voit que SES propres baux
        leases = await prisma.lease.findMany({
            where: {
                tenantId: user.id // 🔒 CLOISONNEMENT
            },
            include: {
                property: { select: { title: true, address: true, owner: { select: { name: true } } } }
            },
            orderBy: { createdAt: 'desc' }
        });
    } else {
        // Agents / Artisans : accès restreint pour l'instant
        return NextResponse.json({ error: "Accès non autorisé aux contrats." }, { status: 403 });
    }

    return NextResponse.json({ success: true, leases });

  } catch (error) {
    console.error("Erreur GET Leases:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// =====================================================================
// 2. POST : CRÉER UN NOUVEAU BAIL (PROPRIÉTAIRE SEULEMENT)
// =====================================================================
export async function POST(request: Request) {
  try {
    // A. SÉCURITÉ
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const owner = await prisma.user.findUnique({ where: { email: userEmail } });
    
    // Seuls les propriétaires (ou admin) peuvent générer un bail
    if (!owner || (owner.role !== "OWNER" && owner.role !== "ADMIN")) {
        return NextResponse.json({ error: "Seul un propriétaire peut créer un bail." }, { status: 403 });
    }

    // B. VALIDATION DONNÉES
    const body = await request.json();
    const { propertyId, tenantEmail, startDate, endDate, rentAmount, depositAmount } = body;

    if (!propertyId || !tenantEmail || !startDate || !rentAmount) {
        return NextResponse.json({ error: "Données manquantes (Bien, Locataire, Date, Loyer)." }, { status: 400 });
    }

    // C. VÉRIFICATIONS MÉTIER
    
    // 1. Est-ce que le bien appartient à ce propriétaire ? (Anti-IDOR)
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) return NextResponse.json({ error: "Bien introuvable." }, { status: 404 });
    
    if (owner.role !== "ADMIN" && property.ownerId !== owner.id) {
        return NextResponse.json({ error: "Ce bien ne vous appartient pas." }, { status: 403 });
    }

    // 2. Est-ce que le locataire existe ?
    const tenant = await prisma.user.findUnique({ where: { email: tenantEmail } });
    if (!tenant) {
        return NextResponse.json({ error: "Aucun utilisateur trouvé avec cet email. Invitez-le d'abord." }, { status: 404 });
    }

    // D. CRÉATION DU BAIL
    const newLease = await prisma.lease.create({
        data: {
            startDate: new Date(startDate),
            endDate: endDate ? new Date(endDate) : null,
            monthlyRent: parseInt(rentAmount),
            depositAmount: depositAmount ? parseInt(depositAmount) : 0,
            status: "PENDING", // En attente de signature
            isActive: false,   // Pas encore actif
            
            tenant: { connect: { id: tenant.id } },
            property: { connect: { id: propertyId } }
        }
    });

    return NextResponse.json({ success: true, message: "Bail créé, en attente de signature.", lease: newLease });

  } catch (error) {
    console.error("Erreur POST Lease:", error);
    return NextResponse.json({ error: "Impossible de créer le bail." }, { status: 500 });
  }
}

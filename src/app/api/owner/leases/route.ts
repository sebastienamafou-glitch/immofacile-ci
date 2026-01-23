import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Singleton
import bcrypt from "bcryptjs"; 

export const dynamic = 'force-dynamic';

// ============================================================================
// GET : Lister les baux du propriétaire (Corrigé et Trié)
// ============================================================================
export async function GET(request: Request) {
  try {
    // 1. SÉCURITÉ
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const owner = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!owner || owner.role !== "OWNER") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    // 2. RÉCUPÉRATION AVEC TRI INTELLIGENT
    const leases = await prisma.lease.findMany({
      where: { 
          property: { ownerId: owner.id },
          // Optionnel : Décommentez pour masquer complètement les dossiers annulés
          // status: { not: 'CANCELLED' } 
      },
      orderBy: [
          { isActive: 'desc' }, // 1. Les baux ACTIFS en priorité absolue
          { status: 'asc' },    // 2. Ensuite les PENDING (En attente)
          { createdAt: 'desc' } // 3. Enfin les plus récents
      ],
      include: {
        tenant: { 
            select: { 
                id: true, 
                name: true, 
                phone: true, 
                email: true,
                image: true // Pour afficher l'avatar si disponible
            } 
        },
        property: { 
            select: { 
                id: true, 
                title: true, 
                commune: true,
                address: true,
                images: true
            } 
        }
      }
    });

    return NextResponse.json({ success: true, leases });

  } catch (error) {
    console.error("Erreur GET Leases:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// ============================================================================
// POST : Créer un nouveau bail (Avec protection Anti-Confusion)
// ============================================================================
export async function POST(request: Request) {
  try {
    // 1. SÉCURITÉ
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const owner = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!owner || owner.role !== "OWNER") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    const body = await request.json();
    
    // 2. VALIDATION ENTRÉES
    if (!body.propertyId || !body.tenantEmail || !body.rent || !body.startDate) {
        return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 });
    }

    const rent = parseInt(body.rent);
    const deposit = parseInt(body.deposit || '0');

    if (isNaN(rent) || rent <= 0) {
        return NextResponse.json({ error: "Montant du loyer invalide" }, { status: 400 });
    }

    // 3. VÉRIFICATION DU BIEN (Anti-IDOR)
    const property = await prisma.property.findUnique({
        where: { id: body.propertyId }
    });

    if (!property || property.ownerId !== owner.id) {
        return NextResponse.json({ error: "Ce bien ne vous appartient pas." }, { status: 403 });
    }

    // 4. GESTION DU LOCATAIRE
    let tenant = await prisma.user.findUnique({
        where: { email: body.tenantEmail }
    });

    // 🛡️ SÉCURITÉ CRITIQUE : Empêche d'ajouter un autre Propriétaire comme Locataire
    if (tenant && tenant.role !== "TENANT" && tenant.role !== "GUEST") {
        return NextResponse.json({ 
            error: `Cet email correspond à un compte '${tenant.role}'. Impossible de l'assigner comme locataire.` 
        }, { status: 409 });
    }

    let isNewUser = false;
    let tempPassword = "";

    if (!tenant) {
        // Création du compte Locataire à la volée
        isNewUser = true;
        tempPassword = Math.random().toString(36).slice(-8) + "Immo!"; // Mot de passe fort
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        try {
            tenant = await prisma.user.create({
                data: {
                    name: body.tenantName || "Locataire",
                    email: body.tenantEmail,
                    phone: body.tenantPhone || undefined,
                    password: hashedPassword,
                    role: "TENANT",
                    kycStatus: "PENDING"
                }
            });
        } catch (e: any) {
            if (e.code === 'P2002') {
                return NextResponse.json({ error: "Ce numéro de téléphone est déjà associé à un autre compte." }, { status: 409 });
            }
            throw e;
        }
    }

    // 5. CRÉATION DU BAIL
    // On vérifie s'il n'y a pas déjà un bail actif pour ce bien
    const existingActiveLease = await prisma.lease.findFirst({
        where: { 
            propertyId: property.id,
            isActive: true
        }
    });

    if (existingActiveLease) {
         return NextResponse.json({ error: "Ce bien a déjà un locataire actif." }, { status: 409 });
    }

    const newLease = await prisma.lease.create({
        data: {
            startDate: new Date(body.startDate),
            monthlyRent: rent,
            depositAmount: deposit,
            status: "PENDING",    // En attente de signature
            isActive: false,      // Inactif tant que pas signé/payé
            signatureStatus: "PENDING",
            tenant: { connect: { id: tenant.id } },
            property: { connect: { id: property.id } }
        }
    });

    // 6. RÉPONSE
    return NextResponse.json({
        success: true,
        lease: newLease,
        credentials: isNewUser ? { email: body.tenantEmail, password: tempPassword } : null
    });

  } catch (error: any) {
    console.error("Erreur Création Bail:", error);
    return NextResponse.json({ error: "Erreur serveur lors de la création du bail." }, { status: 500 });
  }
}

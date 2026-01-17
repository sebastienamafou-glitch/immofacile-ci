import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Singleton
import bcrypt from "bcryptjs"; 

export const dynamic = 'force-dynamic';

// GET : Lister les baux du propriétaire
export async function GET(request: Request) {
  try {
    // 1. SÉCURITÉ
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const owner = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!owner || owner.role !== "OWNER") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    // 2. RÉCUPÉRATION
    const leases = await prisma.lease.findMany({
      where: { property: { ownerId: owner.id } },
      orderBy: { createdAt: 'desc' },
      include: {
        tenant: { select: { name: true, phone: true, email: true } },
        property: { select: { title: true, commune: true } }
      }
    });

    return NextResponse.json({ success: true, leases });

  } catch (error) {
    console.error("Erreur GET Leases:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST : Créer un nouveau bail
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

    // 🛡️ SÉCURITÉ AJOUTÉE : Vérification du conflit de rôle
    if (tenant && tenant.role !== "TENANT") {
        return NextResponse.json({ 
            error: "Cet email est déjà utilisé par un compte Propriétaire ou Artisan. Impossible de l'assigner comme locataire." 
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
                    phone: body.tenantPhone || undefined, // undefined permet d'éviter l'erreur unique sur NULL
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
    const newLease = await prisma.lease.create({
        data: {
            startDate: new Date(body.startDate),
            monthlyRent: rent,
            depositAmount: deposit,
            status: "PENDING",    // En attente de signature
            isActive: false,      // Inactif par défaut
            signatureStatus: "PENDING",
            tenant: { connect: { id: tenant.id } },
            property: { connect: { id: property.id } }
        }
    });

    // 6. RÉPONSE
    return NextResponse.json({
        success: true,
        lease: newLease,
        // On renvoie les identifiants UNIQUEMENT si c'est un nouveau compte
        credentials: isNewUser ? { email: body.tenantEmail, password: tempPassword } : null
    });

  } catch (error: any) {
    console.error("Erreur Création Bail:", error);
    return NextResponse.json({ error: "Erreur serveur lors de la création du bail." }, { status: 500 });
  }
}

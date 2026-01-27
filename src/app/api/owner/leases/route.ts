import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs"; 

export const dynamic = 'force-dynamic';

// ============================================================================
// GET : Lister les baux (Sécurisé par ID)
// ============================================================================
export async function GET(request: Request) {
  try {
    // 1. SÉCURITÉ : Identification par ID injecté
    const userId = request.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    // 2. REQUÊTE OPTIMISÉE (Directement liée à l'OwnerId)
    const leases = await prisma.lease.findMany({
      where: { 
          property: { ownerId: userId }, // 🔒 Cadenas : Mes propriétés uniquement
          status: { not: 'CANCELLED' }   // Filtre par défaut
      },
      orderBy: [
          { isActive: 'desc' },
          { status: 'asc' },   
          { createdAt: 'desc' }
      ],
      include: {
        tenant: { 
            select: { id: true, name: true, phone: true, email: true, image: true } 
        },
        property: { 
            select: { id: true, title: true, commune: true, address: true, images: true } 
        }
      }
    });

    return NextResponse.json({ success: true, leases });

  } catch (error) {
    console.error("🚨 Erreur GET Leases:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// ============================================================================
// POST : Créer un bail (Zero Trust)
// ============================================================================
export async function POST(request: Request) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const body = await request.json();
    
    // Validation des entrées
    if (!body.propertyId || !body.tenantEmail || !body.rent || !body.startDate) {
        return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 });
    }

    const rent = Number(body.rent);
    const deposit = Number(body.deposit || 0);

    if (isNaN(rent) || rent <= 0) {
        return NextResponse.json({ error: "Loyer invalide" }, { status: 400 });
    }

    // 1. VÉRIFICATION PROPRIÉTÉ + APPARTENANCE (Anti-IDOR)
    const property = await prisma.property.findUnique({
        where: { id: body.propertyId }
    });

    if (!property) return NextResponse.json({ error: "Propriété introuvable." }, { status: 404 });
    
    // Le verrou critique : Est-ce bien MON bien ?
    if (property.ownerId !== userId) {
        return NextResponse.json({ error: "Vous n'êtes pas le propriétaire de ce bien." }, { status: 403 });
    }

    // 2. GESTION DU LOCATAIRE (Création ou Récupération)
    let tenant = await prisma.user.findUnique({ where: { email: body.tenantEmail } });

    // Sécurité Rôle : On n'ajoute pas un Admin comme locataire par erreur
    if (tenant && !["TENANT", "GUEST"].includes(tenant.role)) {
        return NextResponse.json({ 
            error: `Cet email est déjà utilisé par un compte ${tenant.role}.` 
        }, { status: 409 });
    }

    let isNewUser = false;
    let tempPassword = "";

    if (!tenant) {
        isNewUser = true;
        // Mot de passe fort généré côté serveur
        tempPassword = Math.random().toString(36).slice(-8) + "Immo2026!";
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        try {
            tenant = await prisma.user.create({
                data: {
                    name: body.tenantName || "Locataire",
                    email: body.tenantEmail,
                    password: hashedPassword,
                    role: "TENANT",
                    kycStatus: "PENDING",
                    phone: body.tenantPhone || null // Optionnel à la création
                }
            });
        } catch (e) {
            return NextResponse.json({ error: "Impossible de créer le locataire (Email déjà pris ?)" }, { status: 409 });
        }
    }

    // 3. VÉRIFICATION DE LA VACANCE
    const activeLease = await prisma.lease.findFirst({
        where: { propertyId: property.id, isActive: true }
    });
    
    if (activeLease) {
         return NextResponse.json({ error: "Ce bien est déjà sous contrat actif !" }, { status: 409 });
    }

    // 4. CRÉATION DU BAIL
    const newLease = await prisma.lease.create({
        data: {
            startDate: new Date(body.startDate),
            endDate: body.endDate ? new Date(body.endDate) : null, // Optionnel
            monthlyRent: rent,
            depositAmount: deposit,
            status: "PENDING",
            isActive: false, // Inactif tant que pas signé/validé
            signatureStatus: "PENDING",
            tenantId: tenant.id,
            propertyId: property.id,
            // Lien Agence automatique si le propriétaire est géré
            // (Supposons que l'on ait récupéré l'info, pour l'instant on laisse null)
        }
    });

    return NextResponse.json({
        success: true,
        lease: newLease,
        // On ne renvoie les credentials QUE si on vient de créer le user
        credentials: isNewUser ? { email: body.tenantEmail, password: tempPassword } : null
    });

  } catch (error: any) {
    console.error("🚨 CRASH POST Lease:", error);
    return NextResponse.json({ error: "Erreur interne système." }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs"; // Assurez-vous d'avoir installé bcryptjs

export const dynamic = 'force-dynamic';

// GET : Lister les baux (Déjà existant)
export async function GET(request: Request) {
  try {
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const owner = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!owner) return NextResponse.json({ error: "Inconnu" }, { status: 403 });

    const leases = await prisma.lease.findMany({
      where: { property: { ownerId: owner.id } },
      orderBy: { startDate: 'desc' },
      include: {
        tenant: { select: { name: true, phone: true, email: true } },
        property: { select: { title: true, commune: true } }
      }
    });

    return NextResponse.json({ success: true, leases });
  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST : CRÉER UN NOUVEAU BAIL (Ajouter Locataire)
export async function POST(request: Request) {
  try {
    // 1. SÉCURITÉ
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const owner = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!owner) return NextResponse.json({ error: "Inconnu" }, { status: 403 });

    const body = await request.json();
    // body = { propertyId, tenantName, tenantPhone, tenantEmail, rent, deposit, startDate }

    // 2. VÉRIFICATION DU BIEN
    const property = await prisma.property.findUnique({
        where: { id: body.propertyId }
    });

    if (!property || property.ownerId !== owner.id) {
        return NextResponse.json({ error: "Ce bien ne vous appartient pas ou n'existe pas." }, { status: 403 });
    }

    // 3. GESTION DU LOCATAIRE (Find or Create)
    let tenant = await prisma.user.findUnique({
        where: { email: body.tenantEmail }
    });

    let isNewUser = false;
    let tempPassword = "";

    if (!tenant) {
        // Création à la volée
        isNewUser = true;
        tempPassword = Math.random().toString(36).slice(-8) + "Loc!";
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        try {
            tenant = await prisma.user.create({
                data: {
                    name: body.tenantName,
                    email: body.tenantEmail,
                    phone: body.tenantPhone,
                    password: hashedPassword,
                    role: "TENANT",
                    kycStatus: "PENDING"
                }
            });
        } catch (e) {
            return NextResponse.json({ error: "Email ou Téléphone déjà utilisé par un autre compte." }, { status: 409 });
        }
    }

    // 4. CRÉATION DU BAIL
    const newLease = await prisma.lease.create({
        data: {
            startDate: new Date(body.startDate),
            monthlyRent: parseInt(body.rent),
            depositAmount: parseInt(body.deposit),
            status: "ACTIVE",
            isActive: true,
            tenant: { connect: { id: tenant.id } },
            property: { connect: { id: property.id } }
        }
    });

    // 5. UPDATE DISPONIBILITÉ BIEN (Optionnel, implicite via lease actif)
    // Pas besoin de changer un champ 'isAvailable' si on se base sur lease.isActive

    return NextResponse.json({
        success: true,
        lease: newLease,
        credentials: isNewUser ? { email: body.tenantEmail, password: tempPassword } : null
    });

  } catch (error) {
    console.error("Erreur Création Bail:", error);
    return NextResponse.json({ error: "Erreur lors de la création du contrat." }, { status: 500 });
  }
}

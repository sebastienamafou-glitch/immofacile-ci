import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs"; 

export const dynamic = 'force-dynamic';

// ============================================================================
// 1. GET : Lister les baux du propriétaire connecté
// ============================================================================
export async function GET() {
    try {
        const session = await auth();
        const userId = session?.user?.id;
        if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

        const leases = await prisma.lease.findMany({
            where: {
                property: {
                    ownerId: userId // On récupère les baux des propriétés appartenant au user
                }
            },
            include: {
                property: {
                    select: { title: true, commune: true } // Données minimales pour la carte
                },
                tenant: {
                    select: { name: true, email: true } // Données minimales pour le footer
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({ success: true, leases });

    } catch (error) {
        console.error("🚨 CRASH GET Leases:", error);
        return NextResponse.json({ error: "Erreur lors de la récupération des baux." }, { status: 500 });
    }
}


// ============================================================================
// 2. POST : Créer un nouveau bail (VOTRE CODE ORIGINAL)
// ============================================================================
export async function POST(request: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const body = await request.json();
    
    if (!body.propertyId || !body.tenantEmail || !body.rent || !body.startDate) {
        return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 });
    }

    const rent = Number(body.rent);
    const deposit = Number(body.depositAmount || 0); 
    const advance = Number(body.advanceAmount || 0);

    // 🛑 BOUCLIER JURIDIQUE BACKEND : LOI N° 2019-576
    if (deposit > rent * 2) {
        return NextResponse.json({ 
            error: "Violation de la Loi n° 2019-576 : Le dépôt de garantie ne peut excéder 2 mois de loyer." 
        }, { status: 400 });
    }

    if (advance > rent * 2) {
        return NextResponse.json({ 
            error: "Violation de la Loi n° 2019-576 : L'avance sur loyer ne peut excéder 2 mois." 
        }, { status: 400 });
    }

    // VÉRIFICATION PROPRIÉTÉ
    const property = await prisma.property.findUnique({
        where: { id: body.propertyId }
    });

    if (!property) return NextResponse.json({ error: "Propriété introuvable." }, { status: 404 });
    if (property.ownerId !== userId) {
        return NextResponse.json({ error: "Vous n'êtes pas le propriétaire." }, { status: 403 });
    }

    // GESTION LOCATAIRE
    let tenant = await prisma.user.findUnique({ where: { email: body.tenantEmail } });

    if (tenant && !["TENANT", "GUEST"].includes(tenant.role)) {
        return NextResponse.json({ 
            error: `Email déjà utilisé par un ${tenant.role}.` 
        }, { status: 409 });
    }

    let isNewUser = false;
    let tempPassword = "";

    if (!tenant) {
        isNewUser = true;
        tempPassword = Math.random().toString(36).slice(-8) + "Immo2026!";
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        try {
            tenant = await prisma.user.create({
                data: {
                    name: body.tenantName || "Locataire",
                    email: body.tenantEmail,
                    password: hashedPassword,
                    role: "TENANT",
                    phone: body.tenantPhone || undefined,
                    kyc: { create: { status: "PENDING", documents: [] } },
                    finance: { create: { walletBalance: 0, version: 1, kycTier: 1 } }
                }
            });
        } catch (e) {
            console.error(e);
            return NextResponse.json({ error: "Erreur création locataire" }, { status: 409 });
        }
    }

    // VÉRIFICATION VACANCE
    const activeLease = await prisma.lease.findFirst({
        where: { propertyId: property.id, isActive: true }
    });
    
    if (activeLease) {
         return NextResponse.json({ error: "Bien déjà loué !" }, { status: 409 });
    }

    // CRÉATION BAIL
    const newLease = await prisma.lease.create({
        data: {
            startDate: new Date(body.startDate),
            endDate: body.endDate ? new Date(body.endDate) : null,
            monthlyRent: rent,
            depositAmount: deposit,
            advanceAmount: advance,
            status: "PENDING",
            isActive: false, 
            signatureStatus: "PENDING",
            tenantId: tenant.id,
            propertyId: property.id,
        }
    });

    return NextResponse.json({
        success: true,
        lease: newLease,
        credentials: isNewUser ? { email: body.tenantEmail, password: tempPassword } : null
    });

  } catch (error: unknown) {
    console.error("🚨 CRASH POST Lease:", error);
    return NextResponse.json({ error: "Erreur interne." }, { status: 500 });
  }
}

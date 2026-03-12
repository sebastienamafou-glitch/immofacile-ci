import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs"; 

export const dynamic = 'force-dynamic';

// ============================================================================
// GET : Lister les baux (VOTRE CODE ORIGINAL INTACT)
// ============================================================================
// app/api/owner/leases/route.ts - Bloc POST modifié

export async function POST(request: Request) {
  try {
    // 1. SÉCURITÉ : Auth v5
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const body = await request.json();
    
    // Validation
    if (!body.propertyId || !body.tenantEmail || !body.rent || !body.startDate) {
        return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 });
    }

    const rent = Number(body.rent);
    // ✅ Alignement strict avec le payload du frontend
    const deposit = Number(body.depositAmount || 0); 
    const advance = Number(body.advanceAmount || 0);

    // 🛑 2. BOUCLIER JURIDIQUE BACKEND : LOI N° 2019-576 🛑
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

    // 3. VÉRIFICATION PROPRIÉTÉ
    const property = await prisma.property.findUnique({
        where: { id: body.propertyId }
    });

    if (!property) return NextResponse.json({ error: "Propriété introuvable." }, { status: 404 });
    if (property.ownerId !== userId) {
        return NextResponse.json({ error: "Vous n'êtes pas le propriétaire." }, { status: 403 });
    }

    // 4. GESTION LOCATAIRE (Upsert-like logic)
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
                    
                    kyc: {
                        create: {
                            status: "PENDING",
                            documents: []
                        }
                    },
                    finance: {
                        create: {
                            walletBalance: 0,
                            version: 1,
                            kycTier: 1
                        }
                    }
                }
            });
        } catch (e) {
            console.error(e);
            return NextResponse.json({ error: "Erreur création locataire" }, { status: 409 });
        }
    }

    // 5. VÉRIFICATION VACANCE
    const activeLease = await prisma.lease.findFirst({
        where: { propertyId: property.id, isActive: true }
    });
    
    if (activeLease) {
         return NextResponse.json({ error: "Bien déjà loué !" }, { status: 409 });
    }

    // 6. CRÉATION BAIL
    const newLease = await prisma.lease.create({
        data: {
            startDate: new Date(body.startDate),
            endDate: body.endDate ? new Date(body.endDate) : null,
            monthlyRent: rent,
            depositAmount: deposit,
            advanceAmount: advance, // ✅ Enregistrement validé par le schéma
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

  } catch (error: unknown) { // ✅ Typage strict appliqué
    console.error("🚨 CRASH POST Lease:", error);
    return NextResponse.json({ error: "Erreur interne." }, { status: 500 });
  }
}

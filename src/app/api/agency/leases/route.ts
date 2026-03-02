import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs"; 

export const dynamic = 'force-dynamic';

// ============================================================================
// GET : Récupérer tous les baux sous mandat de l'agence
// ============================================================================
export async function GET(request: Request) {
  try {
    const session = await auth();
    const agencyId = session?.user?.agencyId;
    
    if (!agencyId) {
        return NextResponse.json({ error: "Accès agence requis." }, { status: 401 });
    }

    const leases = await prisma.lease.findMany({
      where: {
        property: { agencyId: agencyId } // 🔒 Filtre par agence uniquement
      },
      include: {
        property: {
          select: { id: true, title: true, commune: true, images: true, price: true }
        },
        tenant: {
          select: { id: true, name: true, email: true, phone: true, image: true, 
                    kyc: { select: { status: true } } }
        },
        agent: { select: { name: true } } // L'agent qui gère le dossier
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, leases });

  } catch (error) {
    console.error("🚨 GET AGENCY LEASES ERROR:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// ============================================================================
// POST : Créer un nouveau bail (Conformité Loi n° 2019-576)
// ============================================================================
export async function POST(request: Request) {
  try {
    const session = await auth();
    const agencyId = session?.user?.agencyId;
    const agentId = session?.user?.id;
    
    if (!agencyId || !agentId) {
        return NextResponse.json({ error: "Identification agence impossible." }, { status: 401 });
    }

    const body = await request.json();
    
    // 1. Validation de présence
    if (!body.propertyId || !body.tenantEmail || !body.rent || !body.startDate) {
        return NextResponse.json({ error: "Données manquantes pour le contrat." }, { status: 400 });
    }

    const rent = Number(body.rent);
    const deposit = Number(body.deposit || 0);
    const advance = Number(body.advance || 0);

    // 🛑 2. BOUCLIER JURIDIQUE : LOI N° 2019-576 🛑
    // On bloque au niveau serveur pour garantir l'intégrité légale
    if (deposit > rent * 2) {
        return NextResponse.json({ 
            error: "Illégal : Le dépôt de garantie excède le plafond de 2 mois." 
        }, { status: 400 });
    }

    if (advance > rent * 2) {
        return NextResponse.json({ 
            error: "Illégal : L'avance sur loyer excède le plafond de 2 mois." 
        }, { status: 400 });
    }

    // 3. Vérification du mandat
    const property = await prisma.property.findUnique({
        where: { id: body.propertyId }
    });

    if (!property || property.agencyId !== agencyId) {
        return NextResponse.json({ error: "Ce bien n'est pas sous votre gestion." }, { status: 403 });
    }

    // 4. Gestion du Locataire
    let tenant = await prisma.user.findUnique({ where: { email: body.tenantEmail } });
    let isNewUser = false;
    let tempPassword = "";

    if (!tenant) {
        isNewUser = true;
        tempPassword = Math.random().toString(36).slice(-8) + "Agency2026!";
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        // Création complète du profil locataire (Identity + Finance + KYC)
        tenant = await prisma.user.create({
            data: {
                name: body.tenantName || "Locataire",
                email: body.tenantEmail,
                password: hashedPassword,
                role: "TENANT",
                phone: body.tenantPhone || undefined,
                agencyId: agencyId, // Liaison du locataire à l'agence pour le suivi
                kyc: { create: { status: "PENDING", documents: [] } },
                finance: { create: { walletBalance: 0, version: 1, kycTier: 1 } }
            }
        });
    }

    // 5. Création du Bail
    const newLease = await prisma.lease.create({
        data: {
            startDate: new Date(body.startDate),
            monthlyRent: rent,
            depositAmount: deposit,
            advanceAmount: advance, // Champ ajouté au schéma Prisma
            status: "PENDING",
            isActive: false, 
            signatureStatus: "PENDING",
            tenantId: tenant.id,
            propertyId: property.id,
            agentId: agentId, // Trace de l'agent créateur
        }
    });

    // 6. Mise à jour de la disponibilité du bien
    await prisma.property.update({
        where: { id: property.id },
        data: { isAvailable: false }
    });

    // 7. Log d'Audit (Traçabilité légale)
    await prisma.auditLog.create({
        data: {
            action: "AGENCY_LEASE_CREATED",
            entityId: newLease.id,
            entityType: "LEASE",
            userId: agentId,
            metadata: { agencyId, rent, deposit, advance, compliance: "LAW_2019_576" }
        }
    });

    return NextResponse.json({
        success: true,
        lease: newLease,
        credentials: isNewUser ? { email: body.tenantEmail, password: tempPassword } : null
    });

  } catch (error: any) {
    console.error("🚨 API AGENCY LEASE CRASH:", error);
    return NextResponse.json({ error: "Erreur technique lors du traitement." }, { status: 500 });
  }
}

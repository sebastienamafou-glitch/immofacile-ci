import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs"; 

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await auth();
    const agencyId = session?.user?.agencyId;
    
    if (!agencyId) {
        return NextResponse.json({ error: "Accès agence requis." }, { status: 401 });
    }

    const leases = await prisma.lease.findMany({
      where: {
        property: { agencyId: agencyId }
      },
      include: {
        property: {
          select: { id: true, title: true, commune: true, images: true, price: true }
        },
        tenant: {
          select: { id: true, name: true, email: true, phone: true, image: true, 
                    kyc: { select: { status: true } } }
        },
        agent: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, leases });

  } catch (error: unknown) {
    console.error("GET AGENCY LEASES ERROR:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    const agencyId = session?.user?.agencyId;
    const agentId = session?.user?.id;
    
    if (!agencyId || !agentId) {
        return NextResponse.json({ error: "Identification agence impossible." }, { status: 401 });
    }

    const body = await request.json();
    const hasTenantIdentifier = body.tenantId || body.tenantEmail;
    
    if (!body.propertyId || !hasTenantIdentifier || !body.rent || !body.startDate) {
        return NextResponse.json({ 
            error: "Données manquantes : Un locataire, un bien et un loyer sont requis." 
        }, { status: 400 });
    }

    const rent = Number(body.rent);
    const deposit = Number(body.deposit || 0);
    const advance = Number(body.advance || 0);

    // Blocage strict de la loi ivoirienne (2+2)
    if (deposit > rent * 2) {
        return NextResponse.json({ error: "Le dépôt de garantie excède le plafond légal de 2 mois." }, { status: 400 });
    }
    if (advance > rent * 2) {
        return NextResponse.json({ error: "L'avance sur loyer excède le plafond légal de 2 mois." }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
        const property = await tx.property.findUnique({
            where: { id: body.propertyId }
        });

        if (!property || property.agencyId !== agencyId) {
            throw new Error("UNAUTHORIZED_PROPERTY");
        }

        let tenant = null;
        let isNewUser = false;
        let tempPassword = "";

        if (body.tenantId) {
            tenant = await tx.user.findUnique({ where: { id: body.tenantId } });
        }

        if (!tenant && body.tenantEmail) {
            tenant = await tx.user.findUnique({ where: { email: body.tenantEmail } });

            if (!tenant) {
                isNewUser = true;
                tempPassword = Math.random().toString(36).slice(-8) + "Agency2026!";
                const hashedPassword = await bcrypt.hash(tempPassword, 10);

                tenant = await tx.user.create({
                    data: {
                        name: body.tenantName || "Locataire",
                        email: body.tenantEmail,
                        password: hashedPassword,
                        role: "TENANT",
                        phone: body.tenantPhone || undefined,
                        agencyId: agencyId,
                        kyc: { create: { status: "PENDING", documents: [] } },
                        finance: { create: { walletBalance: 0, version: 1, kycTier: 1 } }
                    }
                });
            }
        }

        if (!tenant) throw new Error("TENANT_NOT_FOUND");

        const newLease = await tx.lease.create({
            data: {
                startDate: new Date(body.startDate),
                monthlyRent: rent,
                depositAmount: deposit,
                advanceAmount: advance,
                status: "PENDING",
                isActive: false, 
                signatureStatus: "PENDING",
                tenantId: tenant.id,
                propertyId: property.id,
                agentId: agentId, 
            }
        });

        await tx.property.update({
            where: { id: property.id },
            data: { isAvailable: false }
        });

        await tx.auditLog.create({
            data: {
                action: "PROPERTY_UPDATED", 
                entityId: newLease.id,
                entityType: "LEASE",
                userId: agentId,
                metadata: { actionOrigin: "AGENCY_LEASE_CREATED", agencyId, rent, deposit, advance, compliance: "LAW_2019_576" }
            }
        });

        return { lease: newLease, isNewUser, tempPassword, tenantEmail: body.tenantEmail };
    });

    return NextResponse.json({
        success: true,
        lease: result.lease,
        credentials: result.isNewUser ? { email: result.tenantEmail, password: result.tempPassword } : null
    });

  } catch (error: unknown) {
    console.error("API AGENCY LEASE CRASH:", error);
    if (error instanceof Error) {
        if (error.message === "UNAUTHORIZED_PROPERTY") return NextResponse.json({ error: "Ce bien n'est pas sous votre gestion." }, { status: 403 });
        if (error.message === "TENANT_NOT_FOUND") return NextResponse.json({ error: "Impossible de résoudre le profil du locataire." }, { status: 404 });
    }
    return NextResponse.json({ error: "Erreur technique lors du traitement." }, { status: 500 });
  }
}

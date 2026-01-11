import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. SÉCURITÉ : On récupère l'email injecté par le middleware ou le header
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // 2. Identification du Locataire
    const tenant = await prisma.user.findUnique({ 
        where: { email: userEmail } 
    });
    
    if (!tenant) {
        return NextResponse.json({ error: "Compte introuvable" }, { status: 403 });
    }

    // 3. Récupération du Bail Actif (et du bien associé)
    // On cherche un bail où le locataire est l'utilisateur connecté
    const activeLease = await prisma.lease.findFirst({
        where: {
            tenantId: tenant.id,
            isActive: true
        },
        include: {
            property: {
                select: {
                    title: true,
                    address: true,
                    commune: true,
                    owner: { select: { name: true } }
                }
            },
            payments: {
                orderBy: { date: 'desc' },
                take: 5 // On prend les 5 derniers pour l'aperçu
            }
        }
    });

    // 4. Récupération des Incidents (Pannes signalées par ce locataire)
    const incidents = await prisma.incident.findMany({
        where: { reporterId: tenant.id },
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: {
            id: true,
            title: true,
            status: true
        }
    });

    // 5. Construction de la réponse pour le Frontend
    // On structure exactement comme l'interface TenantDashboardData l'attend
    return NextResponse.json({
        success: true,
        user: {
            id: tenant.id,
            name: tenant.name,
            email: tenant.email,
            walletBalance: tenant.walletBalance,
            isVerified: tenant.kycStatus === 'VERIFIED'
        },
        lease: activeLease ? {
            id: activeLease.id,
            monthlyRent: activeLease.monthlyRent,
            depositAmount: activeLease.depositAmount,
            status: activeLease.status,
            property: activeLease.property
        } : null,
        payments: activeLease?.payments || [],
        incidents: incidents
    });

  } catch (error) {
    console.error("Erreur Tenant Dashboard:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

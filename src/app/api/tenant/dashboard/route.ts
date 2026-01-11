import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. SÉCURITÉ : Récupération via l'email injecté
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const tenant = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!tenant) return NextResponse.json({ error: "Compte introuvable" }, { status: 403 });

    // 2. RÉCUPÉRATION DU BAIL ACTIF
    // On cherche un bail où le locataire est l'utilisateur connecté ET qui est actif
    const activeLease = await prisma.lease.findFirst({
        where: {
            tenantId: tenant.id,
            isActive: true
        },
        include: {
            property: {
                include: {
                    owner: { select: { name: true, phone: true, email: true } }
                }
            },
            payments: {
                orderBy: { date: 'desc' },
                take: 5 // Les 5 derniers paiements pour l'historique rapide
            }
        }
    });

    // 3. RÉCUPÉRATION DES INCIDENTS (Pannes signalées)
    const incidents = await prisma.incident.findMany({
        where: { reporterId: tenant.id },
        orderBy: { createdAt: 'desc' },
        take: 3
    });

    // 4. FORMATAGE DE LA RÉPONSE
    return NextResponse.json({
        success: true,
        user: {
            id: tenant.id,
            name: tenant.name,
            email: tenant.email,
            walletBalance: tenant.walletBalance,
            isVerified: tenant.kycStatus === 'VERIFIED'
        },
        // Si pas de bail actif, on renvoie null pour que le front affiche "Pas de logement"
        lease: activeLease ? {
            id: activeLease.id,
            monthlyRent: activeLease.monthlyRent,
            depositAmount: activeLease.depositAmount,
            status: activeLease.status,
            startDate: activeLease.startDate,
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

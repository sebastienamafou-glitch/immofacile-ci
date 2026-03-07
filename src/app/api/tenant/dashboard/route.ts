import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { TenantDashboardResponse } from "@/lib/types/tenant";

export const dynamic = 'force-dynamic';

// ✅ BONNE PRATIQUE : Utilisation du wrapper auth() pour l'injection de session
export const GET = auth(async (req) => {
  try {
    const session = req.auth;
    const userId = session?.user?.id;
    
    if (!userId) {
        return NextResponse.json(
            { error: "Accès refusé. Non authentifié." }, 
            { status: 401 }
        );
    }

    // 1. RÉCUPÉRATION OPTIMISÉE (User + Finance + KYC + Bail + Incidents en 1 requête)
    const user = await prisma.user.findUnique({ 
        where: { id: userId },
        select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            finance: { select: { walletBalance: true } },
            kyc: { select: { status: true } },
            // Récupération du Bail actif ou en attente
            leases: {
                where: {
                    status: { in: ['ACTIVE', 'PENDING'] }
                },
                orderBy: { createdAt: 'desc' },
                take: 1,
                include: {
                    property: {
                        select: {
                            id: true, title: true, address: true, commune: true,
                            owner: { select: { name: true, email: true, phone: true } }
                        }
                    },
                    payments: {
                        take: 5,
                        orderBy: { date: 'desc' }
                    }
                }
            },
            // Récupération des Incidents
            incidentsReported: {
                orderBy: { createdAt: 'desc' },
                take: 3,
                select: {
                    id: true, title: true, status: true, createdAt: true
                }
            }
        }
    });

    if (!user) {
        return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
    }

    // 2. SÉCURITÉ : VÉRIFICATION DU RÔLE
    if (user.role !== 'TENANT' && user.role !== 'SUPER_ADMIN') {
        return NextResponse.json({ error: "Accès réservé aux locataires." }, { status: 403 });
    }
    
    // 3. CONSTRUCTION DE LA RÉPONSE
    const kycStatus = user.kyc?.status || "PENDING";
    const walletBalance = user.finance?.walletBalance || 0;
    const activeLease = user.leases[0] || null;

    const responseData: TenantDashboardResponse = {
        success: true,
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            walletBalance: walletBalance,
            isVerified: kycStatus === 'VERIFIED',
            kycStatus: kycStatus
        },
        lease: activeLease as any, // Type casté nativement par Prisma vers ton interface
        incidents: user.incidentsReported as any
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error("🔥 CRASH API TENANT:", error);
    return NextResponse.json(
        { error: "Erreur interne du serveur." }, 
        { status: 500 }
    );
  }
});

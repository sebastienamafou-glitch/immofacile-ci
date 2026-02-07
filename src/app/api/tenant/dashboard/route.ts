import { NextResponse } from "next/server";
import { auth } from "@/auth";

import { prisma } from "@/lib/prisma";
// ✅ IMPORT DU TYPE SSOT
import { TenantDashboardResponse } from "@/lib/types/tenant";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // -------------------------------------------------------------------------
    // 1. SÉCURITÉ & AUTHENTIFICATION (Migration v5)
    // -------------------------------------------------------------------------
    const session = await auth();
    const userEmail = session?.user?.email;
    
    if (!userEmail) {
        return NextResponse.json(
            { error: "Accès refusé. Non authentifié." }, 
            { status: 401 }
        );
    }

    // 2. RÉCUPÉRATION USER + FINANCE + KYC
    const user = await prisma.user.findUnique({ 
        where: { email: userEmail },
        include: {
            finance: { select: { walletBalance: true } }, // ✅ Relation Finance
            kyc: { select: { status: true } }             // ✅ Relation KYC
        }
    });

    if (!user) {
        return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
    }

    // -------------------------------------------------------------------------
    // 3. RÉCUPÉRATION DES DONNÉES MÉTIER
    // -------------------------------------------------------------------------
    
    // A. Récupération du Bail
    const lease = await prisma.lease.findFirst({
        where: {
            tenantId: user.id, // 🔒 SÉCURITÉ : Cloisonnement strict
            status: { in: ['ACTIVE', 'PENDING'] }
        },
        orderBy: { createdAt: 'desc' },
        include: {
            property: {
                select: {
                    id: true,
                    title: true,
                    address: true,
                    commune: true,
                    owner: {
                        select: { name: true, email: true, phone: true }
                    }
                }
            },
            payments: {
                take: 5,
                orderBy: { date: 'desc' }
            }
        }
    });

    // B. Récupération des Incidents
    const incidents = await prisma.incident.findMany({
        where: { reporterId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: {
            id: true,
            title: true,
            status: true,
            createdAt: true
        }
    });

    // -------------------------------------------------------------------------
    // 4. CONSTRUCTION DE LA RÉPONSE
    // -------------------------------------------------------------------------
    
    // Extraction sécurisée des données relationnelles
    const kycStatus = user.kyc?.status || "PENDING";
    const walletBalance = user.finance?.walletBalance || 0;

    const responseData: TenantDashboardResponse = {
        success: true,
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            
            // ✅ CORRECTION SCHEMA : On mappe les nouvelles sources
            walletBalance: walletBalance,
            isVerified: kycStatus === 'VERIFIED',
            kycStatus: kycStatus
        },
        lease: lease, 
        incidents: incidents
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error("🔥 CRASH API TENANT:", error);
    return NextResponse.json(
        { error: "Erreur interne du serveur." }, 
        { status: 500 }
    );
  }
}

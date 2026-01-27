import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
// ✅ IMPORT DU TYPE SSOT (Source of Truth)
import { TenantDashboardResponse } from "@/lib/types/tenant";

// Force le mode dynamique pour ne pas cacher les données utilisateur
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // -------------------------------------------------------------------------
    // 1. SÉCURITÉ & AUTHENTIFICATION (Niveau Bancaire)
    // -------------------------------------------------------------------------
    const userEmail = request.headers.get("x-user-email");
    
    if (!userEmail) {
        return NextResponse.json(
            { error: "Accès refusé. Token manquant." }, 
            { status: 401 }
        );
    }

    const user = await prisma.user.findUnique({ 
        where: { email: userEmail } 
    });

    if (!user) {
        return NextResponse.json(
            { error: "Utilisateur introuvable." }, 
            { status: 404 }
        );
    }

    // -------------------------------------------------------------------------
    // 2. RÉCUPÉRATION DES DONNÉES (Conforme au Type SSOT)
    // -------------------------------------------------------------------------
    
    // A. Récupération du Bail (Priorité : ACTIF, sinon PENDING)
    // On utilise exactement les mêmes 'select/include' que dans tenant.ts
    const lease = await prisma.lease.findFirst({
        where: {
            tenantId: user.id, // 🔒 SÉCURITÉ : Cloisonnement strict
            status: { in: ['ACTIVE', 'PENDING'] }
        },
        orderBy: { createdAt: 'desc' }, // Le plus récent en premier
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

    // B. Récupération des Incidents (Seulement ceux créés par le locataire)
    const incidents = await prisma.incident.findMany({
        where: { reporterId: user.id }, // 🔒 SÉCURITÉ
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
    // 3. CONSTRUCTION DE LA RÉPONSE
    // -------------------------------------------------------------------------
    
    const responseData: TenantDashboardResponse = {
        success: true,
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            walletBalance: user.walletBalance,
            isVerified: user.kycStatus === 'VERIFIED',
            kycStatus: user.kycStatus
        },
        // Grâce au typage SSOT, TypeScript vérifie que 'lease' correspond exactement
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

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Singleton

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. SÉCURITÉ : Auth Serveur
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const tenant = await prisma.user.findUnique({ where: { email: userEmail } });
    
    // ✅ VÉRIFICATION STRICTE DU RÔLE
    if (!tenant || tenant.role !== "TENANT") {
        return NextResponse.json({ error: "Accès refusé. Espace Locataire uniquement." }, { status: 403 });
    }

    // 2. RÉCUPÉRATION DU BAIL ACTIF (Avec 'select' pour la précision)
    const activeLease = await prisma.lease.findFirst({
        where: {
            tenantId: tenant.id,
            isActive: true
        },
        select: {
            id: true,
            monthlyRent: true,
            depositAmount: true,
            status: true,
            startDate: true,
            endDate: true,
            // Relation Propriété : On ne prend que l'utile (Titre, Adresse, Info Proprio)
            property: {
                select: {
                    title: true,
                    address: true,
                    commune: true,
                    owner: { 
                        select: { name: true, email: true, phone: true } 
                    }
                }
            },
            // Historique Paiements
            payments: {
                orderBy: { date: 'desc' },
                take: 5,
                select: {
                    id: true,
                    amount: true,
                    date: true,
                    status: true,
                    type: true
                }
            }
        }
    });

    // 3. RÉCUPÉRATION DES INCIDENTS
    const incidents = await prisma.incident.findMany({
        where: { reporterId: tenant.id },
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: {
            id: true,
            title: true,
            status: true,
            createdAt: true,
            priority: true
        }
    });

    // 4. RÉPONSE
    return NextResponse.json({
        success: true,
        user: {
            id: tenant.id,
            name: tenant.name,
            email: tenant.email,
            walletBalance: tenant.walletBalance,
            isVerified: tenant.kycStatus === 'VERIFIED'
        },
        // Si pas de bail actif, on renvoie null proprement
        lease: activeLease ? activeLease : null,
        payments: activeLease?.payments || [],
        incidents: incidents
    });

  } catch (error) {
    console.error("Erreur Tenant Dashboard:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

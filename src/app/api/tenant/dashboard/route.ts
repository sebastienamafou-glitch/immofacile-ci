import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. SÉCURITÉ
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) return NextResponse.json({ error: "Utilisateur inconnu" }, { status: 404 });

    // ✅ CORRECTION : On accepte GUEST s'il a une candidature
    // On ne bloque plus strictement sur "TENANT"

    // 2. RECHERCHE DU BAIL (Actif OU En attente)
    // On priorise le bail ACTIF, sinon on prend le PENDING (Candidature)
    const lease = await prisma.lease.findFirst({
        where: {
            tenantId: user.id,
            status: { in: ['ACTIVE', 'PENDING'] } // On récupère aussi les candidatures
        },
        orderBy: { createdAt: 'desc' }, // Le plus récent
        include: {
            property: {
                select: {
                    title: true,
                    address: true,
                    commune: true,
                    owner: { select: { name: true, email: true, phone: true } }
                }
            },
            payments: {
                orderBy: { date: 'desc' },
                take: 5
            }
        }
    });

    // 3. INCIDENTS (Si locataire)
    const incidents = await prisma.incident.findMany({
        where: { reporterId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 3
    });

    return NextResponse.json({
        success: true,
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            walletBalance: user.walletBalance,
            isVerified: user.kycStatus === 'VERIFIED',
            kycStatus: user.kycStatus // Utile pour l'affichage
        },
        lease: lease || null, // Peut être null si nouveau user sans dossier
        payments: lease?.payments || [],
        incidents: incidents
    });

  } catch (error) {
    console.error("Erreur Tenant Dashboard:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

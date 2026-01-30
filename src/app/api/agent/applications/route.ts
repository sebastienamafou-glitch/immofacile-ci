import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. SÉCURITÉ ZERO TRUST (ID injecté par Middleware)
    const userId = request.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    // 2. VÉRIFICATION RÔLE VIA ID
    const agent = await prisma.user.findUnique({ 
        where: { id: userId },
        select: { id: true, role: true }
    });

    if (!agent || agent.role !== "AGENT") {
        return NextResponse.json({ error: "Accès refusé. Réservé aux agents." }, { status: 403 });
    }

    // 3. RÉCUPÉRATION DES DOSSIERS (Baux en attente "PENDING")
    // Règle métier : On récupère tous les baux en attente où l'agent est potentiellement impliqué
    // Si l'agent doit voir TOUS les baux de son agence, il faudrait filtrer par agencyId.
    // Ici, on suppose qu'il voit les baux PENDING globaux ou assignés. 
    // Pour simplifier et sécuriser, on va dire qu'il voit les baux PENDING liés à son Agence (si applicable) ou tous si freelance.
    
    // Optimisation : On ne charge que le strict nécessaire
    const rawApplications = await prisma.lease.findMany({
      where: {
        status: "PENDING",
        // Optionnel : property: { agencyId: agent.agencyId } si multi-tenant strict
      },
      include: {
        property: {
            select: { title: true, address: true }
        },
        tenant: {
            select: { 
                name: true, 
                email: true, 
                phone: true, 
                kycStatus: true,
                kycDocuments: true, // Tableau de strings
                income: true,        
                jobTitle: true       
            }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // 4. FORMATAGE POUR LE FRONTEND
    const applications = rawApplications.map(app => {
        // Logique robuste pour récupérer l'image KYC
        let kycUrl = null;
        if (app.tenant.kycDocuments && app.tenant.kycDocuments.length > 0) {
            kycUrl = app.tenant.kycDocuments[0];
        }

        return {
            id: app.id,
            status: app.status,
            createdAt: app.createdAt,
            property: app.property,
            tenant: {
                name: app.tenant.name,
                email: app.tenant.email,
                phone: app.tenant.phone,
                kycStatus: app.tenant.kycStatus,
                kycDocumentUrl: kycUrl, // Champ aplati pour le front
                income: app.tenant.income,
                jobTitle: app.tenant.jobTitle
            }
        };
    });

    return NextResponse.json({ success: true, applications });

  } catch (error: any) {
    console.error("Erreur Applications:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

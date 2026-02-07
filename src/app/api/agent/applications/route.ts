import { NextResponse } from "next/server";
import { auth } from "@/auth";

import { prisma } from "@/lib/prisma";


export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. SÉCURITÉ : Session Serveur (v5)
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    // 2. VÉRIFICATION RÔLE
    const agent = await prisma.user.findUnique({ 
        where: { id: userId },
        select: { id: true, role: true, agencyId: true }
    });

    if (!agent || agent.role !== "AGENT") {
        return NextResponse.json({ error: "Accès refusé. Réservé aux agents." }, { status: 403 });
    }

    // 3. RÉCUPÉRATION DES DOSSIERS (CORRIGÉE)
    const rawApplications = await prisma.lease.findMany({
      where: {
        status: "PENDING",
        // Filtre de sécurité : Uniquement les baux de son agence
        property: { agencyId: agent.agencyId || undefined } 
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
                jobTitle: true,
                
                // ✅ CORRECTION 1 : On va chercher le KYC dans la table liée
                kyc: {
                    select: {
                        status: true,
                        documents: true
                    }
                },
                
                // ✅ CORRECTION 2 : On va chercher les Revenus dans la table Finance
                finance: {
                    select: {
                        income: true
                    }
                }
            }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // 4. FORMATAGE POUR LE FRONTEND (Mapping intelligent)
    const applications = rawApplications.map(app => {
        // Extraction sécurisée des données imbriquées
        const kycData = app.tenant.kyc;
        const financeData = app.tenant.finance;

        let kycUrl = null;
        if (kycData?.documents && kycData.documents.length > 0) {
            kycUrl = kycData.documents[0];
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
                jobTitle: app.tenant.jobTitle,
                
                // Mapping des nouveaux champs
                kycStatus: kycData?.status || "PENDING",
                kycDocumentUrl: kycUrl,
                income: financeData?.income || 0,
            }
        };
    });

    return NextResponse.json({ success: true, applications });

  } catch (error: any) {
    console.error("Erreur Applications:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

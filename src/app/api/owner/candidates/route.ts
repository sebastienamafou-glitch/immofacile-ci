import { NextResponse } from "next/server";
import { auth } from "@/auth";

import { prisma } from "@/lib/prisma";


export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. SÉCURITÉ (Migration Auth v5)
    const session = await auth();
    const userId = session?.user?.id;
    
    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    // 2. RÉCUPÉRATION (Avec les nouvelles relations)
    const pendingLeases = await prisma.lease.findMany({
      where: {
        status: "PENDING",
        property: { ownerId: userId } // 🔒 Verrou Propriétaire
      },
      include: {
        tenant: {
            // ✅ On inclut les tables satellites
            include: {
                finance: true,
                kyc: true
            }
        },
        property: { select: { id: true, title: true, price: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    // 3. TRUST SCORE ALGORITHM (Adapté au nouveau schéma)
    const candidates = pendingLeases.map((lease) => {
        let score = 50; // Base
        const details: string[] = [];
        const tenant = lease.tenant;

        // ✅ Extraction sécurisée des nouvelles sources de données
        const walletBalance = tenant.finance?.walletBalance || 0;
        const kycStatus = tenant.kyc?.status || "PENDING";

        // A. Solvabilité (Basée sur le Wallet)
        if (walletBalance >= lease.monthlyRent * 3) {
            score += 30;
            details.push("💰 Solvabilité Excellente (> 3 mois)");
        } else if (walletBalance >= lease.monthlyRent) {
            score += 10;
            details.push("✅ Solde suffisant");
        } else {
            score -= 20;
            details.push("⚠️ Solde Wallet faible");
        }

        // B. Identité (KYC)
        if (kycStatus === "VERIFIED") {
            score += 20;
            details.push("✅ Identité Vérifiée");
        } else {
            details.push("⏳ KYC en attente");
        }

        // C. Profil
        if (tenant.jobTitle) score += 5;
        // Note: 'isAvailable' retiré par sécurité si absent du schéma User standard

        // Bornage
        score = Math.min(Math.max(score, 0), 100);

        // Grade
        let grade = "C";
        if (score >= 80) grade = "A";
        else if (score >= 60) grade = "B";

        return {
            id: lease.id,
            createdAt: lease.createdAt,
            monthlyRent: lease.monthlyRent,
            status: lease.status,
            tenant: {
                id: tenant.id,
                name: tenant.name || "Candidat",
                phone: tenant.phone || "",
                email: tenant.email || "",
                // ✅ On renvoie les valeurs extraites pour le front
                walletBalance: walletBalance,
                kycStatus: kycStatus,
                image: tenant.image
            },
            property: lease.property,
            trustScore: { score, grade, details }
        };
    });

    return NextResponse.json({ success: true, candidates });

  } catch (error) {
    console.error("🚨 API Candidates:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

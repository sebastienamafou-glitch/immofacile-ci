import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// ============================================================================
// GET : Lister les candidatures (Baux en attente) + Scoring IA
// ============================================================================
export async function GET(request: Request) {
  try {
    // 1. SÉCURITÉ ZERO TRUST
    const userId = request.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    // 2. RÉCUPÉRATION (Baux PENDING sur mes propriétés)
    const pendingLeases = await prisma.lease.findMany({
      where: {
        status: "PENDING",
        property: { ownerId: userId } // 🔒 Verrou Propriétaire
      },
      include: {
        tenant: true,
        property: { select: { id: true, title: true, price: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    // 3. TRUST SCORE ALGORITHM
    const candidates = pendingLeases.map((lease) => {
        let score = 50; // Base
        const details: string[] = [];
        const tenant = lease.tenant;

        // A. Solvabilité (Basée sur le Wallet)
        if (tenant.walletBalance >= lease.monthlyRent * 3) {
            score += 30;
            details.push("💰 Solvabilité Excellente (> 3 mois)");
        } else if (tenant.walletBalance >= lease.monthlyRent) {
            score += 10;
            details.push("✅ Solde suffisant");
        } else {
            score -= 20;
            details.push("⚠️ Solde Wallet faible");
        }

        // B. Identité (KYC)
        if (tenant.kycStatus === "VERIFIED") {
            score += 20;
            details.push("✅ Identité Vérifiée");
        } else {
            details.push("⏳ KYC en attente");
        }

        // C. Profil
        if (tenant.jobTitle) score += 5;
        if (tenant.isAvailable) score += 5;

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
                walletBalance: tenant.walletBalance,
                kycStatus: tenant.kycStatus,
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

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. SÉCURITÉ
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const owner = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!owner) return NextResponse.json({ error: "Inconnu" }, { status: 403 });

    // 2. RÉCUPÉRATION DES CANDIDATURES (Baux en attente)
    const pendingLeases = await prisma.lease.findMany({
      where: {
        status: "PENDING",
        property: {
            ownerId: owner.id // Sécurité : Uniquement pour SES biens
        }
      },
      include: {
        tenant: true,
        property: {
            select: { id: true, title: true, price: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // 3. CALCUL DU "TRUST SCORE" (Algorithme d'aide à la décision)
    const candidates = pendingLeases.map((lease: any) => {
        let score = 50; // Base neutre
        const details: string[] = [];
        const tenant = lease.tenant;

        // Critère Financier
        if (tenant.walletBalance >= lease.monthlyRent * 3) {
            score += 30;
            details.push("💰 Solvabilité Excellente (> 3 mois)");
        } else if (tenant.walletBalance >= lease.monthlyRent) {
            score += 10;
            details.push("✅ Solde suffisant pour démarrer");
        } else {
            score -= 20;
            details.push("⚠️ Solde Wallet faible");
        }

        // Critère Identité
        if (tenant.kycStatus === "VERIFIED") {
            score += 20;
            details.push("✅ Identité Vérifiée (KYC)");
        } else {
            details.push("⚠️ Dossier KYC incomplet");
        }

        // Grade Final
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
                name: tenant.name,
                phone: tenant.phone,
                email: tenant.email,
                walletBalance: tenant.walletBalance,
                kycStatus: tenant.kycStatus
            },
            property: lease.property,
            trustScore: {
                score,
                grade,
                details
            }
        };
    });

    return NextResponse.json({ success: true, candidates });

  } catch (error) {
    console.error("Erreur API Candidates:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

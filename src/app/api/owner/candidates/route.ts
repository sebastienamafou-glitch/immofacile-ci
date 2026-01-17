import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Singleton

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. SÉCURITÉ
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const owner = await prisma.user.findUnique({ where: { email: userEmail } });
    
    // ✅ Vérification stricte du rôle OWNER
    if (!owner || owner.role !== "OWNER") {
        return NextResponse.json({ error: "Accès réservé aux propriétaires." }, { status: 403 });
    }

    // 2. RÉCUPÉRATION DES CANDIDATURES (Baux en attente)
    const pendingLeases = await prisma.lease.findMany({
      where: {
        status: "PENDING",
        property: {
            ownerId: owner.id // Sécurité : Uniquement pour SES biens
        }
      },
      include: {
        tenant: true, // On récupère tout le profil locataire pour le scoring
        property: {
            select: { id: true, title: true, price: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // 3. CALCUL DU "TRUST SCORE" (Algorithme d'aide à la décision)
    // On retire 'any' pour profiter du typage automatique de Prisma
    const candidates = pendingLeases.map((lease) => {
        let score = 50; // Base neutre
        const details: string[] = [];
        const tenant = lease.tenant;

        // --- A. Critère Financier (Capacité à payer) ---
        // Note : On suppose que walletBalance est en centimes ou unité standard, à adapter selon votre règle
        if (tenant.walletBalance >= lease.monthlyRent * 3) {
            score += 30;
            details.push("💰 Solvabilité Excellente (> 3 mois d'avance)");
        } else if (tenant.walletBalance >= lease.monthlyRent) {
            score += 10;
            details.push("✅ Solde suffisant pour démarrer");
        } else {
            score -= 20;
            details.push("⚠️ Solde Wallet faible");
        }

        // --- B. Critère Identité & KYC ---
        if (tenant.kycStatus === "VERIFIED") {
            score += 20;
            details.push("✅ Identité Vérifiée (KYC)");
        } else if (tenant.kycStatus === "PENDING") {
             details.push("⏳ KYC en cours de vérification");
        } else {
            score -= 10;
            details.push("⚠️ Dossier KYC incomplet ou rejeté");
        }

        // --- C. Stabilité Professionnelle (Bonus) ---
        if (tenant.jobTitle) {
            score += 5; // Petit bonus si le job est renseigné
        }

        // Bornage du score (0 à 100)
        if (score > 100) score = 100;
        if (score < 0) score = 0;

        // Grade Final (A, B, C)
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
                // On n'expose pas tout le wallet, juste le score calculé, 
                // mais pour l'instant on garde balance pour l'UI
                walletBalance: tenant.walletBalance, 
                kycStatus: tenant.kycStatus,
                jobTitle: tenant.jobTitle
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

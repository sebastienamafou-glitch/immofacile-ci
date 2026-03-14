import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { IncidentStatus } from "@prisma/client";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    // 1. AUTHENTIFICATION ZERO TRUST
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
        return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // 2. REQUÊTE PRISMA OPTIMISÉE
    const artisan = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isAvailable: true, 
        isVerified: true, // ✅ CORRECTION : Nécessaire pour le Widget KYC
        finance: {
            select: { walletBalance: true }
        },
        incidentsAssigned: { 
          where: {
            // ✅ CORRECTION : Ajout de QUOTATION pour voir les devis en attente
            status: { in: [IncidentStatus.OPEN, IncidentStatus.IN_PROGRESS, IncidentStatus.QUOTATION, IncidentStatus.RESOLVED] }
          },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
            priority: true,
            createdAt: true,
            quote: { // ✅ CORRECTION : On va chercher le vrai montant du devis généré
                select: { totalAmount: true } 
            },
            property: { 
                select: { address: true, commune: true } 
            },
            reporter: { 
                select: { name: true, phone: true } 
            }
          }
        }
      }
    });

    // 3. CONTRÔLE RBAC
    if (!artisan || (artisan.role !== "ARTISAN" && artisan.role !== "SUPER_ADMIN")) {
        return NextResponse.json({ error: "Accès réservé aux artisans partenaires." }, { status: 403 });
    }

    const currentBalance = artisan.finance?.walletBalance || 0;
    const incidents = artisan.incidentsAssigned || [];

    // 4. FORMATAGE DU DTO POUR LE FRONTEND
    const formattedJobs = incidents.map((j) => ({
        id: j.id,
        title: j.title,
        description: j.description,
        status: j.status,
        priority: j.priority,
        address: j.property ? `${j.property.address}, ${j.property.commune}` : "Adresse inconnue",
        reporterName: j.reporter?.name || "Locataire",
        reporterPhone: j.reporter?.phone || "",
        quoteAmount: j.quote?.totalAmount || 0, // ✅ CORRECTION : Utilisation du montant du devis
        createdAt: j.createdAt
    }));

    return NextResponse.json({
      success: true,
      user: {
        id: artisan.id,
        name: artisan.name,
        email: artisan.email,
        walletBalance: currentBalance,
        isAvailable: artisan.isAvailable ?? true,
        isVerified: artisan.isVerified ?? false // ✅ CORRECTION : Transmission au frontend
      },
      stats: {
        jobsCount: formattedJobs.length,
        rating: 4.8, 
        earnings: currentBalance
      },
      jobs: formattedJobs
    });

  } catch (error) {
    console.error("🔥 Erreur Artisan Dashboard API:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

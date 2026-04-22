import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { IncidentStatus } from "@prisma/client";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
        return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const artisan = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isAvailable: true, 
        isVerified: true,
        incidentsAssigned: { 
          where: {
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
            quote: { select: { totalAmount: true } },
            property: { select: { address: true, commune: true } },
            reporter: { select: { name: true, phone: true } }
          }
        }
      }
    });

    if (!artisan || (artisan.role !== "ARTISAN" && artisan.role !== "SUPER_ADMIN")) {
        return NextResponse.json({ error: "Accès réservé aux artisans partenaires." }, { status: 403 });
    }

    // 🚀 AGRÉGATION : Calcul des revenus réels encaissés (Wave/OM)
    const earningsAggregation = await prisma.transaction.aggregate({
        where: {
            userId: userId,
            status: 'SUCCESS',
            type: 'CREDIT'
        },
        _sum: { amount: true }
    });
    
    const totalEarnings = earningsAggregation._sum.amount || 0;
    const incidents = artisan.incidentsAssigned || [];

    const formattedJobs = incidents.map((j) => ({
        id: j.id,
        title: j.title,
        description: j.description,
        status: j.status,
        priority: j.priority,
        address: j.property ? `${j.property.address}, ${j.property.commune}` : "Adresse inconnue",
        reporterName: j.reporter?.name || "Locataire",
        reporterPhone: j.reporter?.phone || "",
        quoteAmount: j.quote?.totalAmount || 0, 
        createdAt: j.createdAt
    }));

    return NextResponse.json({
      success: true,
      user: {
        id: artisan.id,
        name: artisan.name,
        email: artisan.email,
        isAvailable: artisan.isAvailable ?? true,
        isVerified: artisan.isVerified ?? false 
      },
      stats: {
        jobsCount: formattedJobs.length,
        rating: 4.8, 
        totalEarnings: totalEarnings // On injecte le vrai total ici
      },
      jobs: formattedJobs
    });

  } catch (error) {
    console.error("🔥 Erreur Artisan Dashboard API:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

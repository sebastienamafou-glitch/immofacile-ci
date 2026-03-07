import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// ✅ BONNE PRATIQUE : On enveloppe la route avec auth() pour la session v5
export const GET = auth(async (req) => {
  try {
    const session = req.auth;
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
        finance: {
            select: { walletBalance: true }
        },
        incidentsAssigned: { 
          where: {
            status: { in: ['OPEN', 'IN_PROGRESS', 'RESOLVED'] }
          },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
            priority: true,
            createdAt: true,
            quoteAmount: true,
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

    // Autorisation : Artisan ou Super Admin (pour maintenance)
    if (!artisan || (artisan.role !== "ARTISAN" && artisan.role !== "SUPER_ADMIN")) {
        return NextResponse.json({ error: "Accès réservé aux artisans partenaires." }, { status: 403 });
    }

    const currentBalance = artisan.finance?.walletBalance || 0;
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
        quoteAmount: j.quoteAmount || 0,
        createdAt: j.createdAt
    }));

    return NextResponse.json({
      success: true,
      user: {
        id: artisan.id,
        name: artisan.name,
        email: artisan.email,
        walletBalance: currentBalance,
        isAvailable: artisan.isAvailable ?? true 
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
});

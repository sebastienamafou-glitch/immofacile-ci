import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const artisan = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        walletBalance: true,
        isAvailable: true, 
        
        // ✅ CORRECTION ICI : "incidentsAssigned" (Comme dans le schema.prisma)
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

    if (!artisan || artisan.role !== "ARTISAN") {
        return NextResponse.json({ error: "Accès réservé aux artisans." }, { status: 403 });
    }

    // ✅ MAPPING CORRIGÉ
    const incidents = artisan.incidentsAssigned || [];

    const formattedJobs = incidents.map((j: any) => ({
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
        name: artisan.name,
        email: artisan.email,
        walletBalance: artisan.walletBalance,
        isAvailable: artisan.isAvailable ?? true 
      },
      stats: {
        jobsCount: formattedJobs.length,
        rating: 4.8, 
        earnings: artisan.walletBalance
      },
      jobs: formattedJobs
    });

  } catch (error) {
    console.error("Erreur Artisan Dashboard:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

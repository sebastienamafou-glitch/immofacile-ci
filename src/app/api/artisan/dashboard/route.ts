import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const artisan = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!artisan || artisan.role !== "ARTISAN") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    // Récupérer les incidents assignés (ou disponibles dans sa zone si vous faites un système Uber-like plus tard)
    // Pour l'instant : on récupère ceux qui lui sont assignés explicitement
    const jobs = await prisma.incident.findMany({
      where: {
        assignedToId: artisan.id,
        status: { in: ['OPEN', 'IN_PROGRESS', 'RESOLVED'] } // On cache les CLOSED (archivés)
      },
      include: {
        property: { select: { address: true, commune: true } },
        reporter: { select: { name: true, phone: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formattedJobs = jobs.map(j => ({
        id: j.id,
        title: j.title,
        description: j.description,
        status: j.status,
        priority: j.priority,
        address: `${j.property.address}, ${j.property.commune}`,
        reporterName: j.reporter.name,
        reporterPhone: j.reporter.phone,
        quoteAmount: j.quoteAmount || 0,
        createdAt: j.createdAt
    }));

    return NextResponse.json({
      success: true,
      user: {
        name: artisan.name,
        email: artisan.email,
        walletBalance: artisan.walletBalance,
        isAvailable: artisan.isAvailable // ✅ Le nouveau champ
      },
      stats: {
        jobsCount: jobs.filter(j => j.status === 'RESOLVED').length,
        rating: 4.8, // Simulé pour l'instant (nécessite un système de notation)
        earnings: artisan.walletBalance // Ou calculé sur l'historique
      },
      jobs: formattedJobs
    });

  } catch (error: any) {
    console.error("Erreur Artisan Dashboard:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

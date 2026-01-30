import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. SÉCURITÉ : AUTHENTIFICATION (ID)
    const userId = request.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    // 2. RÉCUPÉRATION DES INTERVENTIONS (Incidents assignés)
    // On cherche les incidents assignés à cet artisan qui sont "EN COURS" ou "PLANIFIÉS"
    const jobs = await prisma.incident.findMany({
      where: {
        assignedToId: userId,
        status: { in: ['IN_PROGRESS', 'RESOLVED'] } // On peut ajuster les statuts selon votre logique
      },
      orderBy: { updatedAt: 'desc' }, // Ou une date d'intervention si vous en avez une
      include: {
        property: {
          select: { address: true, commune: true }
        },
        reporter: {
          select: { name: true, phone: true }
        }
      }
    });

    // 3. FORMATAGE POUR LE FRONTEND (ScheduleItem)
    const schedule = jobs.map(job => ({
      id: job.id,
      title: job.title,
      // Pour la date, on utilise updatedAt par défaut, ou une date spécifique si vous l'ajoutez au schéma
      date: job.updatedAt.toISOString(), 
      timeSlot: "09:00 - 12:00", // Valeur par défaut ou à récupérer d'un champ 'scheduledAt'
      address: `${job.property.address}, ${job.property.commune}`,
      clientName: job.reporter.name || "Client",
      clientPhone: job.reporter.phone || "",
      status: job.status === 'RESOLVED' ? 'COMPLETED' : 'CONFIRMED'
    }));

    return NextResponse.json(schedule);

  } catch (error) {
    console.error("Erreur Schedule API:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

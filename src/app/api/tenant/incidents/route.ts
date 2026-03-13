import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Role, LeaseStatus } from "@prisma/client";

export const dynamic = 'force-dynamic';

// 1. VALIDATION STRICTE DU PAYLOAD (Zod)
const incidentSchema = z.object({
    type: z.string().optional(),
    title: z.string().optional(),
    description: z.string().min(10, "La description doit être détaillée (10 caractères min)."),
    priority: z.string().default('NORMAL'),
    propertyId: z.string().optional(),
    photos: z.array(z.string().url("URL invalide")).default([])
}).refine(data => data.title || data.type, {
    message: "Le type ou le titre de l'incident est obligatoire.",
    path: ["title"]
});

export async function GET(request: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const incidents = await prisma.incident.findMany({
      where: { reporterId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        assignedTo: { select: { name: true, phone: true } },
        property: { select: { title: true } }
      }
    });

    return NextResponse.json({ success: true, incidents });

  } catch (error) {
    console.error("[API_INCIDENTS_GET]", error);
    return NextResponse.json({ error: "Erreur serveur lors de la récupération des incidents." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // 2. SÉCURITÉ & AUTHENTIFICATION BLINDÉE
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
    });

    // Escalade de privilèges bloquée
    if (!user || user.role !== Role.TENANT) {
        return NextResponse.json({ error: "Seul un locataire peut déclarer un incident." }, { status: 403 });
    }

    // 3. VALIDATION DU BODY
    const body = await request.json();
    const validation = incidentSchema.safeParse(body);

    if (!validation.success) {
        return NextResponse.json({ error: "Données invalides", details: validation.error.format() }, { status: 400 });
    }

    let { title, type, description, priority, propertyId, photos } = validation.data;
    const finalTitle = title || type || "Incident non qualifié";

    // 4. RÉSOLUTION DU BIEN (Uniquement les contrats ACTIFS)
    if (!propertyId) {
        const activeLeases = await prisma.lease.findMany({
            where: { 
                tenantId: userId, 
                status: LeaseStatus.ACTIVE // ❌ Fini le 'PENDING', on ne déclare pas de fuite sur un bail non signé
            },
            select: { propertyId: true }
        });

        if (activeLeases.length === 1) {
            propertyId = activeLeases[0].propertyId; // Auto-assignation chirurgicale
        } else if (activeLeases.length === 0) {
            return NextResponse.json({ error: "Vous n'avez aucun contrat de bail actif." }, { status: 403 });
        } else {
            return NextResponse.json({ error: "Vous avez plusieurs contrats. Veuillez préciser le bien concerné." }, { status: 400 });
        }
    }

    // 5. CRÉATION DE L'INCIDENT
    const newIncident = await prisma.incident.create({
      data: {
        title: finalTitle,
        description,
        priority,
        status: 'OPEN',
        photos,
        reporterId: userId,
        propertyId: propertyId
      }
    });

    return NextResponse.json({ success: true, incident: newIncident });

  } catch (error) {
    console.error("[API_INCIDENTS_POST]", error);
    return NextResponse.json({ error: "Erreur critique lors de la création de l'incident." }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Role, Prisma, IncidentStatus } from "@prisma/client";

export const dynamic = 'force-dynamic';

const updateIncidentSchema = z.object({
    id: z.string().min(1, "L'ID de l'incident est requis"),
    status: z.nativeEnum(IncidentStatus).optional(),
    finalCost: z.number().int().nonnegative().optional(),
    assignedToId: z.string().optional()
});

export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

        // 🔍 CORRECTIF : On récupère l'agencyId en base de données de manière sécurisée
        const admin = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { agencyId: true }
        });

        if (!admin?.agencyId) return NextResponse.json({ error: "Accès agence requis." }, { status: 403 });
        
        const incidents = await prisma.incident.findMany({
            where: { property: { agencyId: admin.agencyId } }, // Le filtre magique fonctionne enfin !
            orderBy: [ { status: 'asc' }, { createdAt: 'desc' } ],
            include: { 
                property: { select: { id: true, title: true } }, 
                reporter: { select: { name: true, phone: true, role: true } },
                assignedTo: { select: { id: true, name: true, jobTitle: true, phone: true } }
            }
        });
        
        return NextResponse.json({ success: true, incidents });
    } catch (e) { 
        console.error("Erreur GET Agency Maintenance", e);
        return NextResponse.json({ error: "Erreur serveur." }, { status: 500 }); 
    }
}

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

    const admin = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { agencyId: true }
    });

    if (!admin?.agencyId) return NextResponse.json({ error: "Accès agence requis." }, { status: 403 });

    const body = await req.json();
    const validation = updateIncidentSchema.safeParse(body);

    if (!validation.success) {
        return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    const { id, status, finalCost, assignedToId } = validation.data;

    const incident = await prisma.incident.findUnique({
      where: { id },
      include: { property: { select: { agencyId: true } } } 
    });

    if (!incident) return NextResponse.json({ error: "Incident introuvable" }, { status: 404 });
    if (incident.property.agencyId !== admin.agencyId) {
        return NextResponse.json({ error: "Ce bien n'est pas sous votre gestion." }, { status: 403 });
    }

    const updateData: Prisma.IncidentUpdateInput = {};
    if (status) updateData.status = status;
    if (finalCost !== undefined) updateData.finalCost = finalCost;
    
    if (assignedToId) {
        const artisan = await prisma.user.findUnique({
            where: { id: assignedToId },
            select: { role: true, agencyId: true }
        });

        if (!artisan || artisan.role !== Role.ARTISAN) {
            return NextResponse.json({ error: "Artisan invalide." }, { status: 400 });
        }

        updateData.assignedTo = { connect: { id: assignedToId } };
        
        if (incident.status === IncidentStatus.OPEN && !status) {
            updateData.status = IncidentStatus.IN_PROGRESS;
        }
    }

    const updatedIncident = await prisma.incident.update({
      where: { id },
      data: updateData,
      include: { assignedTo: { select: { name: true } } }
    });

    return NextResponse.json({ success: true, incident: updatedIncident });

  } catch (error) {
    console.error("Erreur PUT Agency Maintenance", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

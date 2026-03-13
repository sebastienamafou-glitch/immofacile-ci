import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Role, Prisma, IncidentStatus } from "@prisma/client";

export const dynamic = 'force-dynamic';

// 1. SCHÉMA DE VALIDATION STRICTE (PUT)
const updateIncidentSchema = z.object({
    id: z.string().min(1, "L'ID de l'incident est requis"),
    status: z.nativeEnum(IncidentStatus).optional(),
    finalCost: z.number().int().nonnegative("Le coût final ne peut pas être négatif").optional(),
    assignedToId: z.string().optional()
});

// 2. GET : LISTER LES INCIDENTS DU PROPRIÉTAIRE
export async function GET(req: Request) {
    try {
        const session = await auth();
        const userId = session?.user?.id;

        if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
        
        const incidents = await prisma.incident.findMany({
            where: { property: { ownerId: userId } },
            orderBy: [ { status: 'asc' }, { createdAt: 'desc' } ],
            include: { 
                property: { select: { id: true, title: true } }, 
                reporter: { select: { name: true, phone: true, role: true } },
                assignedTo: { select: { id: true, name: true, jobTitle: true, phone: true } }
            }
        });
        
        return NextResponse.json({ success: true, incidents });
    } catch (e) { 
        console.error("[API_OWNER_MAINTENANCE_GET]", e);
        return NextResponse.json({ error: "Erreur serveur lors de la récupération." }, { status: 500 }); 
    }
}

// 3. PUT : ASSIGNER UN ARTISAN OU METTRE À JOUR LE STATUT
export async function PUT(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const body = await req.json();
    const validation = updateIncidentSchema.safeParse(body);

    if (!validation.success) {
        return NextResponse.json({ error: "Données invalides", details: validation.error.format() }, { status: 400 });
    }

    const { id, status, finalCost, assignedToId } = validation.data;

    // A. Vérification de propriété
    const incident = await prisma.incident.findUnique({
      where: { id },
      include: { property: { select: { ownerId: true } } } 
    });

    if (!incident) return NextResponse.json({ error: "Incident introuvable" }, { status: 404 });
    if (incident.property.ownerId !== userId) return NextResponse.json({ error: "Accès refusé. Vous ne possédez pas ce bien." }, { status: 403 });

    // B. Préparation de la mise à jour (Typage strict Prisma)
    const updateData: Prisma.IncidentUpdateInput = {};
    if (status) updateData.status = status;
    if (finalCost !== undefined) updateData.finalCost = finalCost;
    
    // C. Vérification métier : L'assigné est-il vraiment un artisan ?
    if (assignedToId) {
        const artisan = await prisma.user.findUnique({
            where: { id: assignedToId },
            select: { role: true }
        });

        if (!artisan || artisan.role !== Role.ARTISAN) {
            return NextResponse.json({ error: "L'utilisateur ciblé n'est pas un artisan certifié." }, { status: 400 });
        }

        updateData.assignedTo = { connect: { id: assignedToId } };
        
        // Auto-bascule du statut si l'incident vient d'être ouvert
        if (incident.status === IncidentStatus.OPEN && !status) {
            updateData.status = IncidentStatus.IN_PROGRESS;
        }
    }

    // D. Exécution de la mise à jour
    const updatedIncident = await prisma.incident.update({
      where: { id },
      data: updateData,
      include: { assignedTo: { select: { name: true } } }
    });

    return NextResponse.json({ success: true, incident: updatedIncident });

  } catch (error) {
    console.error("[API_OWNER_MAINTENANCE_PUT]", error);
    return NextResponse.json({ error: "Erreur serveur lors de la mise à jour." }, { status: 500 });
  }
}

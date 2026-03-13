import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Role, IncidentStatus } from "@prisma/client";
import { z } from "zod";

// 1. SCHÉMA DE VALIDATION (Plus d'email dans le payload)
const resolveSchema = z.object({
  incidentId: z.string().min(1, "L'ID de l'incident est requis"),
  finalCost: z.number().int().nonnegative("Le coût final ne peut pas être négatif").optional()
});

export async function POST(req: Request) {
  try {
    // 2. IDENTITÉ SERVEUR (Inviolable)
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (!user) return NextResponse.json({ error: "Utilisateur inconnu" }, { status: 401 });

    const body = await req.json();
    const validation = resolveSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: "Données invalides", details: validation.error.format() }, { status: 400 });
    }

    const { incidentId, finalCost } = validation.data;

    // 3. VÉRIFICATION DE LA PROPRIÉTÉ
    const incident = await prisma.incident.findUnique({
      where: { id: incidentId },
      include: { property: { select: { ownerId: true } } } 
    });

    if (!incident) return NextResponse.json({ error: "Incident introuvable" }, { status: 404 });

    const isOwner = incident.property.ownerId === userId;
    const isAdmin = user.role === Role.SUPER_ADMIN || user.role === Role.ADMIN;

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Action non autorisée. Vous n'êtes pas le propriétaire de ce bien." }, { status: 403 });
    }

    // 4. RÉSOLUTION SÉCURISÉE
    const updatedIncident = await prisma.incident.update({
      where: { id: incidentId },
      data: {
        status: IncidentStatus.RESOLVED,
        finalCost: finalCost !== undefined ? finalCost : incident.finalCost,
      }
    });

    return NextResponse.json({ 
        success: true, 
        message: "Incident résolu avec succès.",
        incident: updatedIncident 
    });

  } catch (error) {
    console.error("[API_RESOLVE_POST]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

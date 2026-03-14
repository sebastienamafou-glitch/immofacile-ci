import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // 1. SÉCURITÉ : AUTHENTIFICATION ET RBAC
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const user = await prisma.user.findUnique({ 
        where: { id: userId }, 
        select: { role: true } 
    });

    if (user?.role !== Role.ARTISAN && user?.role !== Role.SUPER_ADMIN) {
        return NextResponse.json({ error: "Accès réservé aux artisans" }, { status: 403 });
    }

    const incidentId = params.id;

    // 2. RÉCUPÉRATION DE L'INCIDENT
    const incident = await prisma.incident.findUnique({
      where: { id: incidentId },
      include: {
        property: {
          select: { address: true, commune: true } 
        },
        reporter: {
          select: { name: true, phone: true }
        },
        quote: true 
      }
    });

    if (!incident) {
       return NextResponse.json({ error: "Dossier introuvable" }, { status: 404 });
    }

    // 3. VÉRIFICATION D'ASSIGNATION (Sécurité Critique)
    if (incident.assignedToId !== userId) {
       return NextResponse.json({ error: "Accès refusé à ce dossier." }, { status: 403 });
    }

    return NextResponse.json({ success: true, incident });

  } catch (error) {
    console.error("[API_ARTISAN_INCIDENT_GET]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

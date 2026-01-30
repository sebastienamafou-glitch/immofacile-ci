import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // 1. SÉCURITÉ : AUTHENTIFICATION
    const userId = request.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const incidentId = params.id;

    // 2. RÉCUPÉRATION DE L'INCIDENT
    const incident = await prisma.incident.findUnique({
      where: { id: incidentId },
      include: {
        property: {
          select: { address: true, commune: true } // Contexte pour le devis
        },
        reporter: {
          select: { name: true, phone: true }
        },
        quote: true // On vérifie s'il y a déjà un devis
      }
    });

    if (!incident) {
       return NextResponse.json({ error: "Dossier introuvable" }, { status: 404 });
    }

    // 3. VÉRIFICATION D'ASSIGNATION (Sécurité Critique)
    // Un artisan ne peut pas voir les détails d'un incident qui ne lui est pas assigné
    if (incident.assignedToId !== userId) {
       return NextResponse.json({ error: "Accès refusé à ce dossier." }, { status: 403 });
    }

    return NextResponse.json({ success: true, incident });

  } catch (error) {
    console.error("Erreur Detail Incident:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

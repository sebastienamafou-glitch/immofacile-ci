import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const incidentId = params.id;

    const incident = await prisma.incident.findUnique({
      where: { id: incidentId },
      include: {
        // ✅ On garde uniquement la relation (Artisan)
        assignedTo: {
            select: { 
                name: true, 
                phone: true, 
                jobTitle: true, 
                address: true 
            }
        }
        // ❌ J'ai retiré 'photos: true' car c'est un champ standard, il est déjà là !
      }
    });

    if (!incident) {
       return NextResponse.json({ error: "Dossier introuvable" }, { status: 404 });
    }

    if (incident.reporterId !== userId) {
       return NextResponse.json({ error: "Accès interdit à ce dossier." }, { status: 403 });
    }

    return NextResponse.json({ success: true, incident });

  } catch (error) {
    console.error("Erreur Detail Tenant:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

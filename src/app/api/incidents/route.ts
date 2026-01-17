import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Singleton

export const dynamic = 'force-dynamic';

// GET : Le Propriétaire voit les incidents sur SES biens
export async function GET(request: Request) {
  try {
    // 1. SÉCURITÉ
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const owner = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!owner || owner.role !== "OWNER") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    // 2. RÉCUPÉRATION FILTRÉE
    // On cherche les incidents liés aux propriétés de CE propriétaire
    const incidents = await prisma.incident.findMany({
      where: {
        property: {
            ownerId: owner.id // 🔒 Sécurité cruciale
        }
      },
      include: {
        property: { select: { title: true, address: true } },
        reporter: { select: { name: true, phone: true } }, // Infos du locataire pour le contacter
        assignedTo: { select: { name: true, phone: true, email: true } } // Infos de l'artisan si assigné
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, incidents });

  } catch (error) {
    console.error("Erreur Owner Incidents:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// PUT : Le Propriétaire met à jour (Assigne un artisan ou ferme le ticket)
export async function PUT(request: Request) {
  try {
    // 1. SÉCURITÉ
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const owner = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!owner || owner.role !== "OWNER") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    const body = await request.json();
    const { incidentId, status, artisanId } = body;

    // 2. VÉRIFICATION
    const incident = await prisma.incident.findUnique({
        where: { id: incidentId },
        include: { property: true }
    });

    if (!incident || incident.property.ownerId !== owner.id) {
        return NextResponse.json({ error: "Incident introuvable ou non autorisé" }, { status: 403 });
    }

    // 3. MISE À JOUR
    const updateData: any = {};
    
    if (status) updateData.status = status; // ex: RESOLVED
    
    // Si on assigne un artisan
    if (artisanId) {
        // On vérifie que l'artisan existe et est disponible (optionnel mais recommandé)
        const artisan = await prisma.user.findUnique({
            where: { id: artisanId, role: 'ARTISAN' }
        });
        
        if (!artisan) return NextResponse.json({ error: "Artisan invalide" }, { status: 400 });

        updateData.assignedToId = artisanId;
        updateData.status = 'IN_PROGRESS'; // Passe automatiquement en cours
    }

    const updatedIncident = await prisma.incident.update({
        where: { id: incidentId },
        data: updateData
    });

    return NextResponse.json({ success: true, incident: updatedIncident });

  } catch (error) {
    console.error("Erreur Update Incident:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

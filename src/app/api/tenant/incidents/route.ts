import { NextResponse } from "next/server";
import { auth } from "@/auth";

import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// GET : Liste historique des incidents
export async function GET(request: Request) {
  try {
    const session = await auth();
if (!session || !session.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const userId = session.user.id;
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
    console.error("Erreur GET Incidents:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST : Créer un incident
export async function POST(request: Request) {
  try {
    const session = await auth();
if (!session || !session.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const userId = session.user.id;
    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const body = await request.json();
    
    // ✅ CORRECTIF ICI : On récupère aussi 'type'
    let { title, type, description, priority, propertyId, photos } = body;

    // ✅ MAPPING INTELLIGENT : Si 'title' est vide mais que 'type' est là, on utilise 'type'
    if (!title && type) {
        title = type; // Ex: "PLOMBERIE" devient le titre
    }

    // Validation
    if (!title || !description) {
        return NextResponse.json({ error: "Le type et la description sont obligatoires" }, { status: 400 });
    }

    // 2. RÉSOLUTION DU BIEN (Auto-Detection)
    if (!propertyId) {
        const activeLeases = await prisma.lease.findMany({
            where: { tenantId: userId, status: { in: ['ACTIVE', 'PENDING'] } },
            select: { propertyId: true }
        });

        if (activeLeases.length === 1) {
            propertyId = activeLeases[0].propertyId; // ✅ Auto-assignation
        } else if (activeLeases.length === 0) {
            return NextResponse.json({ error: "Aucun contrat actif." }, { status: 403 });
        } else {
            return NextResponse.json({ error: "Veuillez préciser le bien concerné." }, { status: 400 });
        }
    }

    // 3. CRÉATION
    const newIncident = await prisma.incident.create({
      data: {
        title: title, // On utilise le titre consolidé
        description,
        priority: priority || 'NORMAL',
        status: 'OPEN',
        photos: photos || [],
        reporterId: userId,
        propertyId: propertyId
      }
    });

    return NextResponse.json({ success: true, incident: newIncident });

  } catch (error: any) {
    console.error("Erreur Création Incident:", error);
    return NextResponse.json({ error: "Erreur serveur", details: error.message }, { status: 500 });
  }
}

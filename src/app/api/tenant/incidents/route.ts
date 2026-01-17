import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Singleton

export const dynamic = 'force-dynamic';

// GET : Liste historique des incidents
export async function GET(request: Request) {
  try {
    // 1. SÉCURITÉ
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const tenant = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!tenant || tenant.role !== "TENANT") {
        return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    // 2. RÉCUPÉRATION
    const incidents = await prisma.incident.findMany({
      where: { reporterId: tenant.id },
      orderBy: { createdAt: 'desc' },
      include: {
        assignedTo: { select: { name: true, phone: true } }, // Infos artisan
        property: { select: { title: true } } // Infos bien
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
    // 1. SÉCURITÉ
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const tenant = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!tenant || tenant.role !== "TENANT") {
        return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, priority, propertyId, photos } = body;

    // Validation
    if (!title || !description || !propertyId) {
        return NextResponse.json({ error: "Titre, description et bien concerné sont requis" }, { status: 400 });
    }

    // 2. VÉRIFICATION STRICTE (Le locataire loue-t-il CE bien ?)
    const lease = await prisma.lease.findFirst({
      where: { 
        tenantId: tenant.id, 
        propertyId: propertyId, // ✅ On vérifie le lien spécifique Bien <-> Locataire
        status: { in: ['ACTIVE', 'PENDING'] } 
      }
    });

    if (!lease) {
      return NextResponse.json({ error: "Aucun bail valide trouvé pour ce bien" }, { status: 403 });
    }

    // 3. CRÉATION
    const newIncident = await prisma.incident.create({
      data: {
        title,
        description,
        priority: priority || 'NORMAL',
        status: 'OPEN',
        photos: photos || [], // ✅ Support des photos
        reporterId: tenant.id,
        propertyId: propertyId
      }
    });

    return NextResponse.json({ success: true, incident: newIncident });

  } catch (error: any) {
    console.error("Erreur Création Incident:", error);
    return NextResponse.json({ error: "Erreur serveur", details: error.message }, { status: 500 });
  }
}

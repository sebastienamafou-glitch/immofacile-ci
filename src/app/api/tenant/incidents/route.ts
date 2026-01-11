import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/lib/auth';

const prisma = new PrismaClient();

// GET : Récupérer tous les incidents du locataire
export async function GET(request: Request) {
  try {
    const user = verifyToken(request);
    
    // On récupère les incidents et l'artisan assigné (s'il y en a un)
    const incidents = await prisma.incident.findMany({
      where: { reporterId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        assignedTo: { // L'artisan
          select: { name: true, phone: true }
        }
      }
    });

    return NextResponse.json({ success: true, incidents });

  } catch (error) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
}

// POST : Créer un nouveau signalement
export async function POST(request: Request) {
  try {
    const user = verifyToken(request);
    const body = await request.json();
    const { type, description } = body;

    if (!type || !description) {
      return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
    }

    // On doit trouver la propriété liée au locataire (via son bail actif)
    const lease = await prisma.lease.findFirst({
      where: { tenantId: user.id, status: { in: ['ACTIVE', 'PENDING'] } }
    });

    if (!lease) {
      return NextResponse.json({ error: "Aucun bail actif trouvé" }, { status: 404 });
    }

    const newIncident = await prisma.incident.create({
      data: {
        title: `${type} - ${user.name || 'Locataire'}`, // Titre auto généré
        description: description,
        priority: 'NORMAL',
        status: 'OPEN',
        reporterId: user.id,
        propertyId: lease.propertyId
      }
    });

    return NextResponse.json({ success: true, incident: newIncident });

  } catch (error) {
    console.error("Erreur Création Incident:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

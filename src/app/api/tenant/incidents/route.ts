import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // ✅ 1. Utilisation du Singleton

export const dynamic = 'force-dynamic';

// Fonction utilitaire pour récupérer l'utilisateur via le header sécurisé
async function getAuthenticatedUser(request: Request) {
  const email = request.headers.get("x-user-email"); // ✅ 2. Sécurité via Middleware
  if (!email) return null;
  
  return await prisma.user.findUnique({
    where: { email }
  });
}

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    
    const incidents = await prisma.incident.findMany({
      where: { reporterId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        assignedTo: { 
          select: { name: true, phone: true }
        }
      }
    });

    return NextResponse.json({ success: true, incidents });

  } catch (error) {
    console.error("Erreur GET Incidents:", error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // 1. Identification robuste
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: 'Session expirée' }, { status: 401 });

    const body = await request.json();
    const { type, description } = body;

    if (!type || !description) {
      return NextResponse.json({ error: "Type et description requis" }, { status: 400 });
    }

    // 2. Trouver la propriété liée via le bail actif
    const lease = await prisma.lease.findFirst({
      where: { 
        tenantId: user.id, 
        status: { in: ['ACTIVE', 'PENDING'] } 
      }
    });

    if (!lease) {
      return NextResponse.json({ error: "Aucun bail actif trouvé pour ce compte" }, { status: 404 });
    }

    // 3. Création sécurisée avec l'ID confirmé
    const newIncident = await prisma.incident.create({
      data: {
        title: `${type} - ${user.name || 'Locataire'}`,
        description: description,
        priority: 'NORMAL',
        status: 'OPEN',
        reporterId: user.id, // ✅ Ici, user.id vient de la DB, il n'est jamais undefined
        propertyId: lease.propertyId
      }
    });

    return NextResponse.json({ success: true, incident: newIncident });

  } catch (error: any) {
    console.error("Erreur Création Incident:", error);
    return NextResponse.json({ error: "Erreur serveur", details: error.message }, { status: 500 });
  }
}

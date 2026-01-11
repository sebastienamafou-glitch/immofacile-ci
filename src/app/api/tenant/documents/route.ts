import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/lib/auth'; // On importe notre nouveau vérificateur

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    // 1. SÉCURITÉ : On utilise le vérificateur centralisé
    let userId;
    try {
      const user = verifyToken(request);
      userId = user.id;
    } catch (authError) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // 2. RÉCUPÉRATION : Bail actif + Quittances (Paiements SUCCESS uniquement)
    const lease = await prisma.lease.findFirst({
      where: {
        tenantId: userId,
        status: { in: ['ACTIVE', 'PENDING'] }
      },
      include: {
        payments: {
          where: { status: 'SUCCESS' }, // Seuls les paiements validés génèrent des quittances
          orderBy: { date: 'desc' },
          select: {
            id: true,
            date: true,
            amount: true,
            status: true,
            type: true
          }
        }
      }
    });

    // 3. RÉPONSE
    // Même si aucun bail n'est trouvé, on renvoie une structure vide pour ne pas faire planter le frontend
    return NextResponse.json({
      success: true,
      lease: lease ? {
        id: lease.id,
        startDate: lease.startDate,
        status: lease.status
      } : null,
      payments: lease?.payments || []
    });

  } catch (error) {
    console.error("API Documents Error:", error);
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

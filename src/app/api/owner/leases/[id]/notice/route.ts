import { NextResponse } from "next/server";
import { auth } from "@/auth";

import { prisma } from "@/lib/prisma";
export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> } // ✅ Next.js 15 Standard
) {
  try {
    const { id } = await params;

    // 1. SÉCURITÉ ZERO TRUST (Middleware ID)
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    // 2. RÉCUPÉRATION SÉCURISÉE (Bail + Paiements)
    const lease = await prisma.lease.findFirst({
      where: {
        id: id,
        property: { ownerId: userId } // 🔒 Anti-IDOR : Seul le propriétaire peut voir ça
      },
      include: {
        property: { select: { address: true, commune: true, title: true } },
        tenant: { select: { name: true, email: true, phone: true } },
        payments: {
            where: { 
                status: 'SUCCESS',
                type: 'LOYER' // On ne compte que les loyers pour la dette
            },
            select: { amount: true, date: true }
        }
      }
    });

    if (!lease) return NextResponse.json({ error: "Bail introuvable" }, { status: 404 });

    // 3. LOGIQUE COMPTABLE (Calcul de la dette)
    const today = new Date();
    const startDate = new Date(lease.startDate);
    
    // Curseur au 1er du mois de départ
    let cursorDate = new Date(startDate);
    cursorDate.setDate(1); 
    cursorDate.setHours(0, 0, 0, 0); 
    
    let totalExpectedRent = 0;
    const monthsList: Date[] = [];

    // On boucle jusqu'aujourd'hui
    while (cursorDate <= today) {
        // Si le bail est terminé avant aujourd'hui, on arrête de compter
        if (lease.endDate && cursorDate > lease.endDate) break;

        totalExpectedRent += lease.monthlyRent;
        monthsList.push(new Date(cursorDate));
        
        // Mois suivant
        cursorDate.setMonth(cursorDate.getMonth() + 1); 
    }

    const totalPaid = lease.payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
    let debtAmount = totalExpectedRent - totalPaid;
    let unpaidMonthsText = "Aucun impayé";

    if (debtAmount > 1000) { // Seuil de tolérance (1000 F)
        const numberOfMonthsLate = Math.floor(debtAmount / lease.monthlyRent);
        const remainder = debtAmount % lease.monthlyRent;
        
        // On prend les X derniers mois comme "impayés"
        const problematicMonths = monthsList.slice(-numberOfMonthsLate);
        
        unpaidMonthsText = problematicMonths
            .map(date => date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }))
            .map(s => s.charAt(0).toUpperCase() + s.slice(1))
            .join(", ");

        if (remainder > 0 && numberOfMonthsLate > 0) {
            unpaidMonthsText += ` (+ Reliquat de ${remainder.toLocaleString()} FCFA)`;
        } else if (numberOfMonthsLate === 0 && remainder > 0) {
            unpaidMonthsText = `Reliquat divers (${remainder.toLocaleString()} FCFA)`;
        }
    } else {
        debtAmount = 0;
    }

    // Récupérer le nom du proprio (pour l'affichage sur le document)
    const owner = await prisma.user.findUnique({ 
        where: { id: userId },
        select: { name: true } 
    });

    return NextResponse.json({
      success: true,
      data: {
        lease: {
            ...lease,
            payments: undefined // Clean response
        },
        debtAmount,
        unpaidMonths: unpaidMonthsText,
        ownerName: owner?.name || "Le Propriétaire",
        tenantName: lease.tenant.name
      }
    });

  } catch (error) {
    console.error("Erreur API Notice:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

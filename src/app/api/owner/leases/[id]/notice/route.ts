import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> } // Correction Next.js 15: params est une Promise
) {
  try {
    const { id } = await params; // On await les params

    // 1. SÉCURITÉ
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const owner = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!owner) return NextResponse.json({ error: "Inconnu" }, { status: 403 });

    // 2. RÉCUPÉRATION DU BAIL
    const lease = await prisma.lease.findFirst({
      where: {
        id: id,
        property: { ownerId: owner.id }
      },
      include: {
        property: { select: { address: true, commune: true, title: true } },
        tenant: { select: { name: true } },
        payments: {
            where: { status: 'SUCCESS' },
            select: { amount: true, date: true }
        }
      }
    });

    if (!lease) return NextResponse.json({ error: "Bail introuvable" }, { status: 404 });

    // 3. LOGIQUE COMPTABLE
    const today = new Date();
    const startDate = new Date(lease.startDate);
    
    // Curseur au 1er du mois de début
    let cursorDate = new Date(startDate);
    cursorDate.setDate(1); 
    cursorDate.setHours(0, 0, 0, 0); // Reset heure pour être sûr
    
    let totalExpectedRent = 0;
    const monthsList: Date[] = [];

    // Calcul du dû théorique
    while (cursorDate <= today) {
        totalExpectedRent += lease.monthlyRent;
        monthsList.push(new Date(cursorDate));
        cursorDate.setMonth(cursorDate.getMonth() + 1);
    }

    // ✅ CORRECTION TYPESCRIPT ICI :
    // On type explicitement les arguments de reduce
    const totalPaid = lease.payments.reduce((sum: number, payment: { amount: number }) => {
        return sum + payment.amount;
    }, 0);

    // Calcul Solde
    let debtAmount = totalExpectedRent - totalPaid;
    let unpaidMonths = "Aucun impayé à ce jour";

    if (debtAmount > 0) {
        const numberOfMonthsLate = Math.ceil(debtAmount / lease.monthlyRent);
        const problematicMonths = monthsList.slice(-numberOfMonthsLate);
        
        unpaidMonths = problematicMonths
            .map(date => date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }))
            .map(s => s.charAt(0).toUpperCase() + s.slice(1))
            .join(", ");
    } else {
        debtAmount = 0;
    }

    return NextResponse.json({
      success: true,
      data: {
        lease,
        debtAmount,
        unpaidMonths,
        ownerName: owner.name
      }
    });

  } catch (error) {
    console.error("Erreur API Notice:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

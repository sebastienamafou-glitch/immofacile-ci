import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Singleton

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> } // ✅ Next.js 15
) {
  try {
    const { id } = await params;

    // 1. SÉCURITÉ
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const owner = await prisma.user.findUnique({ where: { email: userEmail } });
    
    // ✅ Vérification Rôle
    if (!owner || owner.role !== "OWNER") {
        return NextResponse.json({ error: "Accès réservé aux propriétaires." }, { status: 403 });
    }

    // 2. RÉCUPÉRATION DU BAIL ET PAIEMENTS
    const lease = await prisma.lease.findFirst({
      where: {
        id: id,
        property: { ownerId: owner.id } // Sécurité IDOR
      },
      include: {
        property: { select: { address: true, commune: true, title: true } },
        tenant: { select: { name: true, email: true, phone: true } },
        payments: {
            where: { 
                status: 'SUCCESS',
                type: 'LOYER' // ✅ CRITIQUE : On exclut les cautions (DEPOSIT)
            },
            select: { amount: true, date: true }
        }
      }
    });

    if (!lease) return NextResponse.json({ error: "Bail introuvable" }, { status: 404 });

    // 3. LOGIQUE COMPTABLE (Calcul strict des arriérés)
    const today = new Date();
    const startDate = new Date(lease.startDate);
    
    // On cale le curseur au 1er jour du mois de début pour compter les mois pleins
    let cursorDate = new Date(startDate);
    cursorDate.setDate(1); 
    cursorDate.setHours(0, 0, 0, 0); 
    
    let totalExpectedRent = 0;
    const monthsList: Date[] = [];

    // On boucle jusqu'au mois actuel inclus
    // (Si on est le 5 du mois, le loyer du mois est considéré comme DÛ car payable d'avance)
    while (cursorDate <= today) {
        totalExpectedRent += lease.monthlyRent;
        monthsList.push(new Date(cursorDate));
        
        // Mois suivant
        cursorDate.setMonth(cursorDate.getMonth() + 1); 
    }

    // Calcul du payé réel (Uniquement les LOYERS)
    const totalPaid = lease.payments.reduce((sum, payment) => {
        return sum + (payment.amount || 0);
    }, 0);

    // Calcul Solde (Dette)
    let debtAmount = totalExpectedRent - totalPaid;
    let unpaidMonthsText = "Aucun impayé";

    // Si dette significative (supérieure à 1000 FCFA pour éviter les erreurs d'arrondi)
    if (debtAmount > 1000) {
        // Estimation du nombre de mois de retard
        const numberOfMonthsLate = Math.floor(debtAmount / lease.monthlyRent);
        const remainder = debtAmount % lease.monthlyRent;
        
        // Génération du texte des mois
        const problematicMonths = monthsList.slice(-numberOfMonthsLate);
        
        unpaidMonthsText = problematicMonths
            .map(date => date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }))
            .map(s => s.charAt(0).toUpperCase() + s.slice(1)) // Capitalize
            .join(", ");

        if (remainder > 0 && numberOfMonthsLate > 0) {
            unpaidMonthsText += ` (+ Reliquat de ${remainder.toLocaleString()} FCFA)`;
        } else if (numberOfMonthsLate === 0 && remainder > 0) {
            unpaidMonthsText = `Reliquat divers (${remainder.toLocaleString()} FCFA)`;
        }
    } else {
        debtAmount = 0; // Nettoyage des petits négatifs ou zéro
    }

    return NextResponse.json({
      success: true,
      data: {
        lease: {
            ...lease,
            payments: undefined // On n'envoie pas la liste brute des paiements au front, juste le résumé
        },
        debtAmount,
        unpaidMonths: unpaidMonthsText,
        ownerName: owner.name,
        tenantName: lease.tenant.name
      }
    });

  } catch (error) {
    console.error("Erreur API Notice:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

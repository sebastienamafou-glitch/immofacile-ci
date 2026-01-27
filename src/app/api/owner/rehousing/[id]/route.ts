import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    // 1. SÉCURITÉ ZERO TRUST (Via ID injecté par Middleware)
    const userId = req.headers.get("x-user-id");
    
    // Protection radicale : Pas d'ID = Pas d'accès
    if (!userId) return NextResponse.json({ error: "Session invalide ou expirée" }, { status: 401 });

    const leaseId = params.id;

    // 2. RÉCUPÉRATION DU BAIL (Avec vérification propriétaire immédiate)
    const currentLease = await prisma.lease.findUnique({
        where: { id: leaseId },
        include: {
            tenant: true,
            property: true,
            payments: true 
        }
    });

    // 3. VÉRIFICATION ANTI-IDOR
    // Le bail doit exister ET la propriété doit appartenir à l'utilisateur connecté
    if (!currentLease || currentLease.property.ownerId !== userId) {
        return NextResponse.json({ error: "Dossier introuvable ou accès refusé." }, { status: 404 }); // 404 pour ne pas fuiter l'existence du dossier
    }

    // =========================================================
    // 🧠 ALGORITHME DE SCORING "MILITARY GRADE"
    // =========================================================
    
    // A. Détection des impayés bloquants (Statut FAILED)
    const failedPayments = currentLease.payments.filter(p => p.status === 'FAILED').length;
    
    // B. Détection des retards chroniques
    // Règle : Le loyer est dû le 5. Tolérance jusqu'au 10.
    let latePayments = 0;
    currentLease.payments.forEach(payment => {
        const paymentDate = new Date(payment.date);
        const paymentDay = paymentDate.getDate();
        
        // Si payé après le 10 du mois
        if (paymentDay > 10) {
            latePayments++;
        }
    });

    // CRITÈRES D'EXCELLENCE :
    // - 0 Impayé définitif
    // - Moins de 3 retards significatifs sur toute la durée
    const isGoodTenant = failedPayments === 0 && latePayments < 3;

    // =========================================================

    // 4. CROSS-SELLING (Recherche Opportunités)
    // On cherche les biens VACANTS appartenant à ce propriétaire (userId)
    const vacantProperties = await prisma.property.findMany({
        where: {
            ownerId: userId, // 🔒 Verrouillage Propriétaire
            isPublished: true,
            id: { not: currentLease.propertyId }, // Pas le bien qu'il vient de quitter
            leases: { none: { isActive: true } }  // Aucun bail actif dessus
        },
        select: {
            id: true,
            title: true,
            commune: true,
            price: true
        },
        take: 3 // Top 3 des opportunités
    });

    return NextResponse.json({
        success: true,
        data: {
            tenant: { 
                name: currentLease.tenant.name || "Locataire", 
                phone: currentLease.tenant.phone || "" 
            },
            property: { title: currentLease.property.title },
            isGoodTenant,
            stats: { failedPayments, latePayments },
            vacantProperties
        }
    });

  } catch (error) {
    console.error("Rehousing API Error:", error);
    return NextResponse.json({ error: "Erreur serveur lors de l'analyse du dossier." }, { status: 500 });
  }
}

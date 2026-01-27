import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    // 1. AUTH ZERO TRUST (ID injecté par Middleware)
    const userId = req.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    // 2. RÉCUPÉRATION DES DONNÉES
    const body = await req.json();
    const { leaseId, decision } = body; 

    if (!leaseId || !['APPROVED', 'REJECTED'].includes(decision)) {
        return NextResponse.json({ error: "Données invalides. Decision doit être APPROVED ou REJECTED." }, { status: 400 });
    }

    // 3. SÉCURITÉ : Le bail existe-t-il et appartient-il à ce propriétaire ?
    // Optimisation : On vérifie directement le lien property.ownerId
    const lease = await prisma.lease.findUnique({
        where: { id: leaseId },
        include: { property: true }
    });

    if (!lease) {
        return NextResponse.json({ error: "Dossier introuvable." }, { status: 404 });
    }

    // VERROU CRITIQUE
    if (lease.property.ownerId !== userId) {
        return NextResponse.json({ error: "Accès interdit à ce dossier." }, { status: 403 });
    }

    // 4. LOGIQUE MÉTIER

    // --- CAS A : REFUS DU DOSSIER ---
    if (decision === 'REJECTED') {
        const updatedLease = await prisma.lease.update({
            where: { id: leaseId },
            data: { 
                status: 'CANCELLED',
                isActive: false
            }
        });

        return NextResponse.json({ 
            success: true, 
            message: "Candidature refusée.",
            lease: updatedLease
        });
    } 
    
    // --- CAS B : ACCEPTATION DU DOSSIER ---
    if (decision === 'APPROVED') {
        
        // Vérification anti-doublon : Le bien est-il déjà occupé ?
        // On cherche un AUTRE bail actif sur ce bien
        const activeLease = await prisma.lease.findFirst({
            where: { 
                propertyId: lease.propertyId, 
                isActive: true,
                id: { not: leaseId } // Pas celui qu'on traite
            }
        });

        if (activeLease) {
            return NextResponse.json({ error: "Impossible d'accepter : Ce bien est déjà loué à quelqu'un d'autre." }, { status: 409 });
        }

        // TRANSACTION ATOMIQUE : On active le bail ET on verrouille le bien
        await prisma.$transaction([
            // 1. Activer ce bail
            prisma.lease.update({
                where: { id: leaseId },
                data: {
                    status: 'ACTIVE', // Le dossier est validé, le locataire est en place
                    isActive: true,
                    signatureStatus: 'PENDING' // Prêt pour signature
                }
            }),
            // 2. Marquer la propriété comme occupée
            prisma.property.update({
                where: { id: lease.propertyId },
                data: { isAvailable: false }
            }),
            // 3. (Optionnel) Rejeter automatiquement les autres candidats ?
            // Pour l'instant on les laisse en PENDING, le propriétaire gérera.
        ]);
        
        return NextResponse.json({ 
            success: true, 
            message: "Candidature validée ! Le bien est maintenant occupé.",
        });
    }

    return NextResponse.json({ error: "Action non gérée" }, { status: 400 });

  } catch (error) {
    console.error("🚨 Erreur Review Candidate:", error);
    return NextResponse.json({ error: "Erreur serveur critique." }, { status: 500 });
  }
}

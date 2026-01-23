import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    // 1. Authentification & Sécurité Propriétaire
    const userEmail = req.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const owner = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!owner || owner.role !== "OWNER") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    // 2. Récupération des données
    const body = await req.json();
    const { leaseId, decision } = body; // decision attendue : 'ACCEPTED' ou 'REJECTED'

    if (!leaseId || !['ACCEPTED', 'REJECTED'].includes(decision)) {
        return NextResponse.json({ error: "Données invalides. Decision doit être ACCEPTED ou REJECTED." }, { status: 400 });
    }

    // 3. Vérification : Le dossier (Bail) existe-t-il et appartient-il à ce propriétaire ?
    const lease = await prisma.lease.findUnique({
        where: { id: leaseId },
        include: { property: true }
    });

    // Sécurité : On empêche de toucher au dossier d'un autre
    if (!lease || lease.property.ownerId !== owner.id) {
        return NextResponse.json({ error: "Dossier introuvable ou accès interdit." }, { status: 404 });
    }

    // 4. LOGIQUE MÉTIER

    // CAS A : REFUS DU DOSSIER
    if (decision === 'REJECTED') {
        const updatedLease = await prisma.lease.update({
            where: { id: leaseId },
            data: { 
                status: 'CANCELLED',
                // On peut ajouter une note interne ou un motif ici si le schéma le permettait
            }
        });

        return NextResponse.json({ 
            success: true, 
            message: "Candidature refusée. Le dossier a été archivé.",
            lease: updatedLease
        });
    } 
    
    // CAS B : ACCEPTATION DU DOSSIER
    if (decision === 'ACCEPTED') {
        // IMPORTANT : Logique de Signature
        // On NE passe PAS le bail en 'ACTIVE' tout de suite.
        // On le laisse en 'PENDING' pour permettre la génération du contrat et la signature.
        // L'acceptation signifie simplement que le propriétaire donne son feu vert.

        // Optionnel : On vérifie si le bien n'est pas déjà loué entre temps
        const activeLease = await prisma.lease.findFirst({
            where: { 
                propertyId: lease.propertyId, 
                status: 'ACTIVE' 
            }
        });

        if (activeLease) {
            return NextResponse.json({ error: "Impossible d'accepter : Ce bien a déjà un locataire actif." }, { status: 409 });
        }

        // On ne change rien en base pour l'instant (ou on pourrait mettre un flag 'isApproved'),
        // mais le fait de ne pas le passer en CANCELLED suffit pour continuer le flux.
        // Le Frontend redirigera vers la génération de contrat.
        
        return NextResponse.json({ 
            success: true, 
            message: "Candidature validée ! Vous pouvez maintenant générer le bail.",
            lease: lease 
        });
    }

    return NextResponse.json({ error: "Action non gérée" }, { status: 400 });

  } catch (error) {
    console.error("Erreur Review Candidate:", error);
    return NextResponse.json({ error: "Erreur serveur lors du traitement du dossier." }, { status: 500 });
  }
}

'use server'

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Role, IncidentStatus } from "@prisma/client";

// 🛡️ HELPER DE SÉCURITÉ
async function getAgencyId() {
    const session = await auth();
    if (!session?.user?.id) return null;
    const user = await prisma.user.findUnique({ 
        where: { id: session.user.id }, 
        select: { agencyId: true } 
    });
    return user?.agencyId || null;
}

// ============================================================================
// 🎯 NOUVEAU : RÉCUPÉRER TOUS LES INCIDENTS DIRECTEMENT (Bypass API Route)
// ============================================================================
export async function getAgencyIncidentsAction() {
    const agencyId = await getAgencyId();
    if (!agencyId) return { error: "Accès refusé" };

    try {
        const incidents = await prisma.incident.findMany({
            where: { property: { agencyId: agencyId } },
            orderBy: [ { status: 'asc' }, { createdAt: 'desc' } ],
            include: { 
                property: true, 
                reporter: true,
                assignedTo: true,
                quote: true

            }
        });
        return { success: true, incidents };
    } catch (error) {
        console.error("Erreur getAgencyIncidentsAction:", error);
        return { error: "Impossible de charger les tickets de maintenance." };
    }
}

// 1. RÉCUPÉRER LES ARTISANS (Indépendants + Agence)
export async function getAgencyArtisansAction() {
  const agencyId = await getAgencyId();
  if (!agencyId) return { error: "Accès refusé" };

  try {
    const artisans = await prisma.user.findMany({
      where: {
        role: Role.ARTISAN,
        // 🔓 CORRECTIF : On permet aux agences de voir les artisans de la plateforme (agencyId: null)
        // ou leurs propres artisans internes (agencyId: agencyId)
        OR: [
            { agencyId: null },
            { agencyId: agencyId }
        ]
      },
      select: { id: true, name: true, jobTitle: true }
    });
    return { success: true, artisans };
  } catch (error) {
    console.error("Erreur getAgencyArtisansAction:", error);
    return { error: "Impossible de charger les artisans." };
  }
}

// 2. ASSIGNER UN ARTISAN À UN TICKET
export async function assignArtisanAction(incidentId: string, artisanId: string) {
  const agencyId = await getAgencyId();
  if (!agencyId) return { error: "Accès refusé" };

  try {
    const incident = await prisma.incident.findUnique({
      where: { id: incidentId },
      include: { property: { select: { agencyId: true } } }
    });

    if (!incident || incident.property.agencyId !== agencyId) {
      return { error: "Incident introuvable ou non autorisé." };
    }

    await prisma.incident.update({
      where: { id: incidentId },
      data: {
        assignedToId: artisanId,
        status: incident.status === IncidentStatus.OPEN ? IncidentStatus.IN_PROGRESS : incident.status
      }
    });

    revalidatePath('/dashboard/agency/maintenance');
    return { success: true };
  } catch (error) {
    console.error("Erreur assignArtisanAction:", error);
    return { error: "Échec de l'assignation." };
  }
}

// 3. CLÔTURER L'INTERVENTION AVEC LE COÛT FINAL
export async function resolveAgencyIncidentAction(incidentId: string, finalCost: number) {
  const agencyId = await getAgencyId();
  if (!agencyId) return { error: "Accès refusé" };

  try {
    const incident = await prisma.incident.findUnique({
      where: { id: incidentId },
      include: { property: { select: { agencyId: true } } }
    });

    if (!incident || incident.property.agencyId !== agencyId) {
      return { error: "Incident introuvable ou non autorisé." };
    }

    await prisma.incident.update({
      where: { id: incidentId },
      data: {
        status: IncidentStatus.RESOLVED,
        finalCost: finalCost
      }
    });

    revalidatePath('/dashboard/agency/maintenance');
    return { success: true };
  } catch (error) {
    console.error("Erreur resolveAgencyIncidentAction:", error);
    return { error: "Erreur lors de la clôture de l'incident." };
  }
}

// ============================================================================
// GESTION DES DEVIS (QUOTES)
// ============================================================================

export async function approveQuoteAction(incidentId: string, formData: FormData) {
  const agencyId = await getAgencyId();
  if (!agencyId) return { error: "Accès refusé" };

  try {
    const incident = await prisma.incident.findUnique({
      where: { id: incidentId },
      // 🔒 CORRECTION : On récupère aussi le ownerId de la propriété pour le notifier
      include: { property: { select: { agencyId: true, ownerId: true } }, quote: true }
    });

    if (!incident || incident.property.agencyId !== agencyId || !incident.quote) {
      return { error: "Dossier ou devis introuvable." };
    }

    await prisma.$transaction(async (tx) => {
        // 1. On valide techniquement le devis (Il passe de PENDING à ACCEPTED)
        await tx.quote.update({
            where: { id: incident.quote!.id },
            data: { status: "ACCEPTED" }
        });

        // ⚠️ ATTENTION : On ne passe PAS l'incident en "IN_PROGRESS" ici.
        // Les travaux ne démarreront que lorsque le webhook CinetPay passera le devis en "PAID".

        // 2. 💸 ROUTAGE FINANCIER : On notifie le Propriétaire de payer
        await tx.notification.create({
            data: {
                userId: incident.property.ownerId,
                title: "✅ Devis validé par l'Agence (Paiement Requis)",
                message: `L'agence a validé le devis de ${incident.quote!.totalAmount.toLocaleString('fr-FR')} FCFA. Veuillez procéder au paiement sécurisé pour déclencher l'intervention de l'artisan.`,
                type: "INFO",
                link: `/dashboard/owner/maintenance/incidents/${incidentId}`, // 🔒 CORRECTION : Ajout de /incidents/
                isRead: false
            }
        });

        // 3. Traçabilité
        await tx.auditLog.create({
            data: {
                action: "PROPERTY_UPDATED",
                entityId: incidentId,
                entityType: "INCIDENT",
                userId: (await auth())!.user!.id!,
                metadata: { actionOrigin: "QUOTE_APPROVED_AWAITING_FUNDS", amount: incident.quote!.totalAmount }
            }
        });
    });

    revalidatePath(`/dashboard/agency/maintenance/${incidentId}`);
    return { success: true };
  } catch (error) {
    console.error("Erreur approveQuoteAction:", error);
    return { error: "Échec de l'approbation." };
  }
}

export async function rejectQuoteAction(incidentId: string, formData: FormData) {
    const agencyId = await getAgencyId();
    if (!agencyId) return { error: "Accès refusé" };
  
    try {
      const incident = await prisma.incident.findUnique({
        where: { id: incidentId },
        include: { quote: true }
      });
  
      if (!incident || !incident.quote) return { error: "Dossier ou devis introuvable." };
  
      await prisma.$transaction(async (tx) => {
          await tx.quote.update({
              where: { id: incident.quote!.id },
              data: { status: "REJECTED" }
          });
  
          await tx.incident.update({
              where: { id: incidentId },
              data: { status: "OPEN", quoteAmount: null }
          });
      });
  
      revalidatePath(`/dashboard/agency/maintenance/${incidentId}`);
      revalidatePath(`/dashboard/agency/maintenance`);
      return { success: true };
    } catch {
      return { error: "Échec du refus." };
    }
}

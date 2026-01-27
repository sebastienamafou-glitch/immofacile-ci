import { Prisma } from "@prisma/client";

// =============================================================================
// 1. DÉFINITION DU SCOPE DE DONNÉES (Source de Vérité)
// =============================================================================
// On utilise le Validator de Prisma pour figer les champs exacts qu'on va récupérer.
// Cela évite d'envoyer tout l'objet "User" (avec mot de passe hashé) au front.

// A. Définition du Bail enrichi (Lease + Property + Owner Contact)
const leaseWithDetails = Prisma.validator<Prisma.LeaseDefaultArgs>()({
  include: {
    property: {
      select: {
        id: true,
        title: true,
        address: true,
        commune: true,
        owner: {
          select: { 
            name: true, 
            email: true, 
            phone: true 
          }
        }
      }
    },
    // On pré-charge les derniers paiements directement avec le bail
    payments: {
        take: 5,
        orderBy: { date: 'desc' }
    }
  }
});

// B. Définition de l'Incident léger (Juste pour l'affichage widget)
const incidentLight = Prisma.validator<Prisma.IncidentDefaultArgs>()({
    select: {
        id: true,
        title: true,
        status: true,
        createdAt: true
    }
});

// =============================================================================
// 2. EXPORT DES TYPES DÉRIVÉS (Pour les Composants React)
// =============================================================================

// Le type complet du Bail (utilisé par la page principale)
export type TenantLeaseData = Prisma.LeaseGetPayload<typeof leaseWithDetails>;

// Le type d'un Paiement individuel (extrait du tableau de paiements du bail)
export type TenantPaymentData = TenantLeaseData['payments'][number];

// Le type d'un Incident (pour le widget)
export type TenantIncidentData = Prisma.IncidentGetPayload<typeof incidentLight>;

// =============================================================================
// 3. STRUCTURE DE RÉPONSE API GLOBALE
// =============================================================================
export interface TenantDashboardResponse {
  success: boolean;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    walletBalance: number;
    isVerified: boolean;
    kycStatus: string;
  };
  // Le bail peut être null (Nouveau locataire sans dossier)
  lease: TenantLeaseData | null;
  // Les incidents sont un tableau (vide si aucun)
  incidents: TenantIncidentData[];
}

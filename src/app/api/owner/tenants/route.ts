import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Singleton

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. SÉCURITÉ : Auth Headers
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const owner = await prisma.user.findUnique({ where: { email: userEmail } });
    
    // ✅ SÉCURITÉ RÔLE
    if (!owner || owner.role !== "OWNER") {
        return NextResponse.json({ error: "Accès réservé aux propriétaires." }, { status: 403 });
    }

    // 2. RÉCUPÉRATION DES LOCATAIRES
    // On cherche les utilisateurs qui ont au moins un bail (lease)
    // associé à une propriété appartenant à l'owner connecté.
    const tenants = await prisma.user.findMany({
      where: {
        role: "TENANT",
        leases: {
            some: {
                property: {
                    ownerId: owner.id // La condition magique
                }
            }
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        kycStatus: true,
        walletBalance: true, // Utile pour voir s'ils sont solvables
        jobTitle: true,      // Utile pour le profil
        
        // On récupère les baux liés à CE propriétaire uniquement
        leases: {
            where: {
                property: { ownerId: owner.id }
            },
            select: {
                id: true,
                status: true,
                isActive: true,
                startDate: true,
                endDate: true,
                monthlyRent: true,
                property: {
                    select: {
                        id: true,
                        title: true,
                        commune: true
                    }
                }
            }
        }
      },
      orderBy: { name: 'asc' }
    });

    // 3. FORMATAGE DONNÉES
    // On nettoie pour que le frontend ait une liste facile à afficher
    const formattedTenants = tenants.map(t => {
        // On détermine le "statut global" du locataire vis-à-vis du proprio
        // Est-il actuellement dans les murs (ACTIF) ou est-ce un ancien (ARCHIVÉ) ?
        const currentLease = t.leases.find(l => l.isActive);
        const status = currentLease ? "ACTIF" : "ARCHIVÉ";

        return {
            id: t.id,
            name: t.name,
            email: t.email,
            phone: t.phone,
            kycStatus: t.kycStatus,
            solvency: t.walletBalance, // Solde dispo
            globalStatus: status,
            
            // Infos sur le logement actuel (s'il y en a un)
            currentProperty: currentLease ? {
                title: currentLease.property.title,
                commune: currentLease.property.commune,
                rent: currentLease.monthlyRent
            } : null,

            // Historique complet (si besoin de cliquer pour voir les détails)
            history: t.leases
        };
    });

    return NextResponse.json({ success: true, tenants: formattedTenants });

  } catch (error) {
    console.error("Erreur API Tenants:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { auth } from "@/auth";

import { prisma } from "@/lib/prisma";


export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. SÉCURITÉ : Session Serveur (v5)
    const session = await auth();
    const userId = session?.user?.id;
    
    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    // 2. RÉCUPÉRATION DES LOCATAIRES
    // On cherche les utilisateurs (TENANT) qui ont un bail sur une propriété de cet Owner
    const tenants = await prisma.user.findMany({
      where: {
        role: "TENANT",
        leases: {
            some: {
                property: {
                    ownerId: userId // 🔒 Verrouillage par ID session
                }
            }
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        jobTitle: true,
        image: true,
        
        // ✅ CORRECTION SCHEMA : On passe par les relations
        kyc: {
            select: { status: true }
        },
        finance: {
            select: { walletBalance: true }
        },
        
        // Baux liés à CE propriétaire uniquement
        leases: {
            where: {
                property: { ownerId: userId }
            },
            orderBy: { startDate: 'desc' },
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

    // 3. FORMATAGE
    const formattedTenants = tenants.map(t => {
        // Le locataire est "ACTIF" s'il a au moins un bail actif chez ce propriétaire
        const currentLease = t.leases.find(l => l.isActive);
        const status = currentLease ? "ACTIF" : "ARCHIVÉ";

        return {
            id: t.id,
            name: t.name || "Locataire sans nom",
            email: t.email,
            phone: t.phone,
            image: t.image,
            
            // ✅ MAPPING : On extrait les valeurs des objets imbriqués
            kycStatus: t.kyc?.status || "PENDING",
            solvency: t.finance?.walletBalance || 0,
            
            globalStatus: status,
            jobTitle: t.jobTitle,
            
            // Résumé du bail en cours (pour affichage rapide en liste)
            currentProperty: currentLease ? {
                title: currentLease.property.title,
                commune: currentLease.property.commune,
                rent: currentLease.monthlyRent
            } : null,

            history: t.leases
        };
    });

    return NextResponse.json({ success: true, tenants: formattedTenants });

  } catch (error) {
    console.error("Erreur API Tenants:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

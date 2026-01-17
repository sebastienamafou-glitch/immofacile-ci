import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Singleton

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. SÉCURITÉ
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const owner = await prisma.user.findUnique({ 
        where: { email: userEmail },
        include: {
            propertiesOwned: {
                include: {
                    leases: {
                        include: {
                            tenant: { select: { name: true } }, // Optimisation: on ne prend que le nom
                            payments: {
                                orderBy: { date: 'desc' },
                                take: 20 
                            }
                        }
                    }
                }
            }
        }
    });

    // ✅ VÉRIFICATION STRICTE DU RÔLE
    if (!owner || owner.role !== "OWNER") {
        return NextResponse.json({ error: "Accès réservé aux propriétaires." }, { status: 403 });
    }

    // 2. CALCULS FINANCIERS
    let escrowBalance = 0; 
    
    // On utilise flatMap pour aplatir la structure proprement sans 'any'
    // Structure : User -> Properties[] -> Leases[] -> Payments[]
    const allPayments = owner.propertiesOwned.flatMap(property => 
        property.leases.flatMap(lease => {
            
            // A. Calcul du Séquestre (Somme des cautions des baux actifs)
            // Note: isActive est prioritaire, mais on vérifie aussi le statut pour être sûr
            if (lease.isActive || lease.status === 'ACTIVE') {
                 escrowBalance += lease.depositAmount || 0;
            }

            // B. Mapping des paiements
            return lease.payments.map(payment => ({
                id: payment.id,
                amount: payment.amount,
                type: payment.type,
                status: payment.status,
                date: payment.date,
                lease: {
                    id: lease.id,
                    property: { title: property.title },
                    tenant: { name: lease.tenant.name }
                }
            }));
        })
    );

    // Tri global par date (du plus récent au plus ancien)
    allPayments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // 3. RÉPONSE
    return NextResponse.json({
        success: true,
        walletBalance: owner.walletBalance || 0, // Argent disponible (Loyers perçus)
        escrowBalance: escrowBalance,           // Argent bloqué (Cautions)
        payments: allPayments,                  // Historique complet
        user: {
            name: owner.name,
            email: owner.email
        }
    });

  } catch (error) {
    console.error("Erreur Finance API:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

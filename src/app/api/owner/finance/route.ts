import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
                            tenant: true,
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

    if (!owner) return NextResponse.json({ error: "Inconnu" }, { status: 403 });

    // 2. CALCULS FINANCIERS
    let escrowBalance = 0; 
    let allPayments: any[] = [];

    // ✅ CORRECTION TS : Ajout de ': any' pour éviter l'erreur "implicit any"
    owner.propertiesOwned.forEach((property: any) => {
        property.leases.forEach((lease: any) => {
            
            // A. Calcul du Séquestre (Cautions actives)
            if (lease.status === 'ACTIVE' || lease.isActive) {
                 // ✅ CORRECTION NOMMAGE : 'depositAmount' (selon votre schema.prisma)
                 escrowBalance += lease.depositAmount || 0;
            }

            // B. Consolidation des paiements
            lease.payments.forEach((payment: any) => {
                allPayments.push({
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
                });
            });
        });
    });

    // Tri par date
    allPayments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // 3. RÉPONSE
    return NextResponse.json({
        success: true,
        walletBalance: owner.walletBalance || 0,
        escrowBalance: escrowBalance,
        payments: allPayments,
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

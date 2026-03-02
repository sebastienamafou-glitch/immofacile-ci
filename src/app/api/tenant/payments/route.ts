import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. SÉCURITÉ BLINDÉE (Auth v5)
    const session = await auth();
    const userEmail = session?.user?.email;

    if (!userEmail) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // On ajoute la récupération du walletBalance pour le Dashboard
    const tenant = await prisma.user.findUnique({ 
        where: { email: userEmail },
        select: { id: true, role: true, walletBalance: true } 
    });

    if (!tenant || tenant.role !== "TENANT") {
        return NextResponse.json({ error: "Accès réservé aux locataires." }, { status: 403 }); //
    }

    // 2. RÉCUPÉRATION DES PAIEMENTS ENRICHIS
    const payments = await prisma.payment.findMany({
      where: {
        lease: {
            tenantId: tenant.id
        }
      },
      orderBy: { createdAt: 'desc' }, // Utilisation de createdAt au lieu de date pour la cohérence
      include: {
        lease: {
            select: {
                monthlyRent: true, // Requis pour la quittance
                property: { select: { title: true, address: true } },
                tenant: { select: { name: true } } // Requis pour la quittance
            }
        }
      }
    });

    // 3. FORMATAGE SÉCURISÉ POUR LE FRONTEND
    const formatted = payments.map(p => ({
        id: p.id,
        amount: p.amount,
        createdAt: p.createdAt, 
        reference: p.reference || `REF-${p.id.substring(0,8).toUpperCase()}`, // Génération d'une ref si manquante
        type: p.type,
        status: p.status,
        method: p.method,
        propertyTitle: p.lease?.property?.title || "Bail archivé/Inconnu", //
        lease: p.lease // On passe l'objet lease complet pour le composant RentReceipt
    }));

    return NextResponse.json({ 
        success: true, 
        payments: formatted,
        tenant: { walletBalance: tenant.walletBalance || 0 } // On renvoie le solde
    });

  } catch (error) {
    console.error("Erreur Tenant Payments:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 }); //
  }
}

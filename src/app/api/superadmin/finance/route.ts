import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET() { // ✅ Suppression du paramètre 'request' non utilisé
  try {
    // 1. SÉCURITÉ BLINDÉE (Auth v5)
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
        return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const admin = await prisma.user.findUnique({ 
        where: { id: userId },
        select: { role: true }
    });

    if (!admin || admin.role !== "SUPER_ADMIN") {
        return NextResponse.json({ error: "Accès refusé : Rôle Super Admin requis" }, { status: 403 });
    }

    // 2. STATS "AGENCY" (KPIs Business)
    const stats = await prisma.payment.aggregate({
        where: { status: "SUCCESS" },
        _sum: {
            amount: true,          
            amountPlatform: true,  
            amountOwner: true,     
        },
        // ✅ CORRECTION : Utilisation de _all pour le count
        _count: { _all: true } 
    });

    // 3. RÉCUPERATION DES DEUX FLUX
    const [rawPayments, rawTransactions] = await Promise.all([
        // Flux A : Gestion Locative
        prisma.payment.findMany({
            where: { status: "SUCCESS" },
            orderBy: { date: 'desc' }, 
            take: 50, 
            // ✅ CORRECTION : Remplacement de l'include illégal par un select en cascade
            select: {
                id: true,
                amount: true,
                amountPlatform: true,
                status: true,
                date: true,
                type: true,
                lease: {
                    select: {
                        property: { select: { title: true } },
                        tenant: { select: { name: true } }
                    }
                }
            }
        }),
        // Flux B : Trésorerie Corporate
        prisma.transaction.findMany({
            orderBy: { createdAt: 'desc' },
            take: 50,
            select: { 
                id: true,
                amount: true,
                status: true,
                createdAt: true,
                reason: true,
                type: true,
                // ✅ CORRECTION : Utilisation de 'role' au lieu de 'type' qui n'existe pas dans le schéma
                user: { select: { name: true, role: true } } 
            }
        })
    ]);

    // 4. MAPPING & FUSION
    const historyFromPayments = rawPayments.map(p => ({
        id: p.id,
        amount: p.amount,
        commission: p.amountPlatform,
        status: p.status, 
        date: p.date,
        type: p.type,
        details: p.lease 
            ? `${p.lease.tenant?.name || 'Locataire'} - ${p.lease.property?.title || 'Bien'}`
            : "Paiement direct",
        category: "AGENCY"
    }));

    const historyFromTransactions = rawTransactions.map((t: any) => ({
        id: t.id,
        amount: t.amount,
        commission: 0,
        status: t.status,
        date: t.createdAt,
        type: t.reason || "WALLET",
        details: t.user 
            ? `${t.user.name} (${t.type === 'CREDIT' ? 'Entrée' : 'Sortie'})`
            : "Opération Système",
        category: "CORPORATE"
    }));

    // Fusion et Tri propre
    const mergedHistory = [...historyFromPayments, ...historyFromTransactions]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 100); 
    
    return NextResponse.json({
      success: true,
      stats: {
          volume: stats._sum.amount || 0,
          totalRevenue: stats._sum.amountPlatform || 0, 
          transactionCount: stats._count._all || 0
      },
      history: mergedHistory
    });

  } catch (error) {
    console.error("[API_FINANCE_ERROR]", error);
    return NextResponse.json({ error: "Erreur lors de l'audit financier." }, { status: 500 });
  }
}

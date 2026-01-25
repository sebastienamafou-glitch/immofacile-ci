import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role, PaymentStatus } from "@prisma/client";

export const dynamic = 'force-dynamic';

// --- HELPER DE SÉCURITÉ ---
async function checkSuperAdminPermission(request: Request) {
  const userEmail = request.headers.get("x-user-email");
  
  if (!userEmail) {
    return { authorized: false, status: 401, error: "Non authentifié" };
  }

  const admin = await prisma.user.findUnique({ 
    where: { email: userEmail },
    select: { role: true }
  });

  if (!admin || admin.role !== Role.SUPER_ADMIN) {
    return { authorized: false, status: 403, error: "Accès refusé : Rôle Super Admin requis" };
  }

  return { authorized: true };
}

export async function GET(request: Request) {
  try {
    // 1. SÉCURITÉ
    const auth = await checkSuperAdminPermission(request);
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status });

    // 2. STATS "AGENCY" (KPIs Business)
    // On garde ces stats pures : uniquement basées sur l'activité immobilière (Payment)
    // On ne mélange pas avec la trésorerie Corporate (Transaction) pour ne pas fausser le CA.
    const stats = await prisma.payment.aggregate({
        where: { status: PaymentStatus.SUCCESS },
        _sum: {
            amount: true,          // Volume d'affaires (GMV)
            amountPlatform: true,  // Notre Revenue (CA Net)
            amountOwner: true,     // Reversé aux clients
        },
        _count: { id: true }
    });

    // 3. RÉCUPERATION DES DEUX FLUX (Parallélisation)
    const [rawPayments, rawTransactions] = await Promise.all([
        // Flux A : Gestion Locative (Payment)
        prisma.payment.findMany({
            where: { status: PaymentStatus.SUCCESS },
            orderBy: { date: 'desc' }, 
            take: 50, 
            include: {
                lease: {
                    select: {
                        property: { select: { title: true } },
                        tenant: { select: { name: true } }
                    }
                }
            }
        }),
        // Flux B : Trésorerie Corporate / Investisseurs (Transaction)
        prisma.transaction.findMany({
            // On prend tout (PENDING, SUCCESS...) pour voir les demandes de retrait en cours
            orderBy: { createdAt: 'desc' },
            take: 50,
            include: {
                user: { select: { name: true, email: true, role: true } }
            }
        })
    ]);

    // 4. MAPPING & FUSION (Unification du DTO)
    
    // Mapping des Paiements (Loyer, etc.)
    const historyFromPayments = rawPayments.map(p => ({
        id: p.id,
        amount: p.amount,
        commission: p.amountPlatform,
        status: p.status, // "SUCCESS"
        date: p.date,
        type: p.type, // "LOYER", "DEPOSIT"...
        details: p.lease 
            ? `${p.lease.tenant.name} - ${p.lease.property.title}`
            : "Paiement direct",
        category: "AGENCY" // Marqueur interne
    }));

    // Mapping des Transactions (Dividendes, Retraits...)
    const historyFromTransactions = rawTransactions.map(t => ({
        id: t.id,
        amount: t.amount,
        commission: 0, // Pas de commission visible sur ces mvts internes
        status: t.status, // "SUCCESS", "PENDING"
        date: t.createdAt,
        type: t.reason || "WALLET", // ex: "DIVIDENDE_T1", "CASHOUT_WAVE"
        details: t.user 
            ? `${t.user.name} (${t.type === 'CREDIT' ? 'Entrée' : 'Sortie'})`
            : "Opération Système",
        category: "CORPORATE"
    }));

    // 5. FUSION & TRI FINAL
    const mergedHistory = [...historyFromPayments, ...historyFromTransactions]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 100); // On garde les 100 derniers mouvements consolidés
    
    return NextResponse.json({
      success: true,
      stats: {
          volume: stats._sum.amount || 0,
          totalRevenue: stats._sum.amountPlatform || 0, 
          transactionCount: stats._count.id || 0
      },
      history: mergedHistory
    });

  } catch (error) {
    console.error("[API_FINANCE_ERROR]", error);
    return NextResponse.json({ error: "Erreur lors de l'audit financier." }, { status: 500 });
  }
}

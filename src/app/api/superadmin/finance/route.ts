import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// --- HELPER DE SÉCURITÉ (ZERO TRUST - ID ONLY) ---
async function checkSuperAdminPermission(request: Request) {
  // 1. Identification par ID (Session via Middleware)
  const userId = request.headers.get("x-user-id");
  
  if (!userId) {
    return { authorized: false, status: 401, error: "Non authentifié" };
  }

  // 2. Vérification Rôle
  const admin = await prisma.user.findUnique({ 
    where: { id: userId },
    select: { id: true, role: true }
  });

  if (!admin || admin.role !== "SUPER_ADMIN") {
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
    const stats = await prisma.payment.aggregate({
        where: { status: "SUCCESS" },
        _sum: {
            amount: true,          // Volume d'affaires (GMV)
            amountPlatform: true,  // Revenue Net
            amountOwner: true,     // Reversé aux clients
        },
        _count: { id: true }
    });

    // 3. RÉCUPERATION DES DEUX FLUX
    const [rawPayments, rawTransactions] = await Promise.all([
        // Flux A : Gestion Locative
        prisma.payment.findMany({
            where: { status: "SUCCESS" },
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
        // Flux B : Trésorerie Corporate
        prisma.transaction.findMany({
            orderBy: { createdAt: 'desc' },
            take: 50,
            include: {
                user: { select: { name: true, email: true, role: true } }
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
            ? `${p.lease.tenant.name} - ${p.lease.property.title}`
            : "Paiement direct",
        category: "AGENCY"
    }));

    const historyFromTransactions = rawTransactions.map(t => ({
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

    // Fusion et Tri
    const mergedHistory = [...historyFromPayments, ...historyFromTransactions]
        // @ts-ignore
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 100); 
    
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

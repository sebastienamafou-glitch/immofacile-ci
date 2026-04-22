import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const tenant = await prisma.user.findUnique({ 
        where: { id: userId },
        select: { id: true, role: true, finance: { select: { walletBalance: true } } } // 🔒 CORRECTION
    });

    if (!tenant || tenant.role !== "TENANT") {
        return NextResponse.json({ error: "Accès réservé aux locataires." }, { status: 403 });
    }

    const payments = await prisma.payment.findMany({
      where: {
        OR: [
            { lease: { tenantId: tenant.id } },
            { userId: tenant.id } 
        ]
      },
      orderBy: { date: 'desc' }, 
      select: { 
        id: true,
        amount: true,
        date: true, 
        reference: true,
        type: true,
        status: true,
        method: true,
        lease: {
            select: {
                monthlyRent: true,
                property: { select: { title: true, address: true } },
                tenant: { select: { name: true } } 
            }
        }
      }
    });

    const formatted = payments.map(p => ({
        id: p.id,
        amount: p.amount,
        createdAt: p.date,
        reference: p.reference || `REF-${p.id.substring(0,8).toUpperCase()}`, 
        type: p.type,
        status: p.status,
        method: p.method,
        propertyTitle: p.lease?.property?.title || "Rechargement Portefeuille", 
        lease: p.lease 
    }));

    return NextResponse.json({ 
        success: true, 
        payments: formatted,
        tenant: { walletBalance: tenant.finance?.walletBalance || 0 } // 🔒 CORRECTION
    });

  } catch (error) {
    console.error("Erreur Tenant Payments:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 }); 
  }
}

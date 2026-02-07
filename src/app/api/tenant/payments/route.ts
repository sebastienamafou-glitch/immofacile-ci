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

    const tenant = await prisma.user.findUnique({ 
        where: { email: userEmail },
        select: { id: true, role: true } 
    });

    if (!tenant || tenant.role !== "TENANT") {
        return NextResponse.json({ error: "Accès réservé aux locataires." }, { status: 403 });
    }

    // 2. RÉCUPÉRATION DES PAIEMENTS
    const payments = await prisma.payment.findMany({
      where: {
        lease: {
            tenantId: tenant.id
        }
      },
      orderBy: { date: 'desc' },
      include: {
        lease: {
            select: {
                property: { select: { title: true } }
            }
        }
      }
    });

    // 3. FORMATAGE SÉCURISÉ
    const formatted = payments.map(p => ({
        id: p.id,
        amount: p.amount,
        date: p.date,
        type: p.type,
        status: p.status,
        method: p.method,
        // ✅ PROTECTION NULL CHECK (?. et ||)
        propertyTitle: p.lease?.property?.title || "Bail archivé/Inconnu"
    }));

    return NextResponse.json({ success: true, payments: formatted });

  } catch (error) {
    console.error("Erreur Tenant Payments:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. SÉCURITÉ
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const tenant = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!tenant || tenant.role !== "TENANT") {
        return NextResponse.json({ error: "Accès réservé aux locataires." }, { status: 403 });
    }

    // 2. RÉCUPÉRATION DES PAIEMENTS
    // On récupère les paiements liés à TOUS les baux du locataire (passés et présents)
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

    // 3. FORMATAGE
    const formatted = payments.map(p => ({
        id: p.id,
        amount: p.amount,
        date: p.date,
        type: p.type,
        status: p.status,
        method: p.method,
        propertyTitle: p.lease.property.title
    }));

    return NextResponse.json({ success: true, payments: formatted });

  } catch (error) {
    console.error("Erreur Tenant Payments:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

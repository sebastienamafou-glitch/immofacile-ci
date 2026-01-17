import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // ✅ Singleton Obligatoire

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. SÉCURITÉ : Via Middleware (Headers)
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const tenant = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!tenant || tenant.role !== "TENANT") {
        return NextResponse.json({ error: "Accès réservé aux locataires." }, { status: 403 });
    }

    // 2. RÉCUPÉRATION : Bail actif + Quittances
    const lease = await prisma.lease.findFirst({
      where: {
        tenantId: tenant.id,
        status: { in: ['ACTIVE', 'PENDING'] }
      },
      include: {
        payments: {
          where: { status: 'SUCCESS' }, // Seuls les paiements validés génèrent des quittances
          orderBy: { date: 'desc' },
          select: {
            id: true,
            date: true,
            amount: true,
            status: true,
            type: true
          }
        }
      }
    });

    // 3. RÉPONSE ROBUSTE
    return NextResponse.json({
      success: true,
      lease: lease ? {
        id: lease.id,
        startDate: lease.startDate,
        status: lease.status
      } : null,
      payments: lease?.payments || []
    });

  } catch (error) {
    console.error("API Documents Error:", error);
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
        return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    });

    if (!user) {
        return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 403 });
    }

    const investments = await prisma.investmentContract.findMany({
      where: {
        userId: user.id
      },
      // ✅ CORRECTIF : Utilisation de signedAt (Schema compliant)
      orderBy: { signedAt: 'desc' }, 
      select: {
        id: true,
        amount: true,
        status: true,
        signedAt: true, // ✅ CORRECTIF : On récupère la date de signature
        packName: true,
        paymentReference: true
      }
    });

    const totalInvested = investments.reduce((acc, inv) => {
        if (inv.status === 'ACTIVE' || inv.status === 'PENDING') {
            return acc + inv.amount;
        }
        return acc;
    }, 0);

    const activeCount = investments.filter(i => i.status === 'ACTIVE').length;
    const projectedEarnings = Math.round(totalInvested * 0.15); 

    return NextResponse.json({
      success: true,
      stats: {
        totalInvested,
        activeCount,
        projectedEarnings
      },
      investments: investments.map(inv => ({
          id: inv.id,
          amount: inv.amount,
          status: inv.status,
          // ✅ CORRECTIF : On mappe signedAt vers createdAt pour le frontend
          createdAt: inv.signedAt, 
          packName: inv.packName || "Investissement Standard",
          isSigned: !!inv.signedAt 
      }))
    });

  } catch (error: any) {
    console.error("🔥 Error:", error.message);
    return NextResponse.json({ error: "Erreur serveur interne" }, { status: 500 });
  }
}

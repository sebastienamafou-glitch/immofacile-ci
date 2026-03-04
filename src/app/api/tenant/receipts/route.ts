import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Récupération stricte des paiements validés du locataire
    const receipts = await prisma.payment.findMany({
      where: {
        status: "SUCCESS",
        type: { in: ["LOYER", "DEPOSIT"] },
        lease: { tenantId: session.user.id }
      },
      include: {
        lease: {
          include: {
            property: { 
                select: { title: true, commune: true, address: true } 
            }
          }
        }
      },
      orderBy: { date: 'desc' }
    });

    return NextResponse.json({ success: true, receipts });

  } catch (error: unknown) {
    if (error instanceof Error) {
        console.error("Erreur API Quittances:", error.message);
    } else {
        console.error("Erreur API Quittances inconnue");
    }
    return NextResponse.json({ error: "Erreur serveur lors de la récupération des quittances" }, { status: 500 });
  }
}

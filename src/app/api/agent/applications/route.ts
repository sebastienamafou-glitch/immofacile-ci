import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. Sécurité
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const agent = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!agent || agent.role !== "AGENT") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    // 2. Récupération des dossiers complets
    const applications = await prisma.lease.findMany({
      where: {
        status: "PENDING",
      },
      include: {
        property: {
            select: { title: true, address: true }
        },
        tenant: {
            select: { 
                name: true, 
                email: true, 
                phone: true, 
                kycStatus: true,
                kycDocumentUrl: true, // ✅ Maintenant supporté !
                income: true,         // ✅ Maintenant supporté !
                jobTitle: true        // ✅ Maintenant supporté !
            }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, applications });

  } catch (error: any) {
    console.error("Erreur Applications:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

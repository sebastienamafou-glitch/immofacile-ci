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

    // 2. Récupération des biens liés à l'agent
    // On cherche les propriétés où l'agent a au moins une mission (PASSÉE ou FUTURE)
    const properties = await prisma.property.findMany({
      where: {
        missions: {
            some: { agentId: agent.id }
        }
      },
      include: {
        owner: {
            select: { name: true, email: true, phone: true }
        },
        leases: {
            where: { status: 'ACTIVE' }, // Pour savoir si c'est loué
            select: { id: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // 3. Formatage propre des données
    const formatted = properties.map(p => ({
        id: p.id,
        title: p.title,
        address: p.address,
        price: p.price,
        images: p.images || [], // Sécurité anti-crash
        owner: p.owner,
        isAvailable: p.leases.length === 0, // Disponible si pas de bail actif
        type: p.type
    }));

    return NextResponse.json({ success: true, properties: formatted });

  } catch (error: any) {
    console.error("Erreur Agent Properties:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

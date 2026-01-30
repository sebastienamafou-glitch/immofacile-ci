import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. SÉCURITÉ ZERO TRUST (ID injecté par Middleware)
    const userId = request.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    // 2. VÉRIFICATION RÔLE VIA ID
    const agent = await prisma.user.findUnique({ 
        where: { id: userId },
        select: { id: true, role: true }
    });

    if (!agent || agent.role !== "AGENT") {
        return NextResponse.json({ error: "Accès refusé. Réservé aux agents." }, { status: 403 });
    }

    // 3. RÉCUPÉRATION DES BIENS SOUS GESTION
    // Règle métier : Un agent voit les propriétés où il a une mission (passée ou future)
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
            where: { isActive: true }, // Utilisation du champ booléen optimisé
            select: { id: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // 4. FORMATAGE PROPRE
    const formatted = properties.map(p => ({
        id: p.id,
        title: p.title,
        address: p.address,
        price: p.price,
        images: p.images || [], 
        owner: p.owner,
        isAvailable: p.leases.length === 0, // Disponible si 0 bail actif
        type: p.type
    }));

    return NextResponse.json({ success: true, properties: formatted });

  } catch (error: any) {
    console.error("Erreur Agent Properties:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

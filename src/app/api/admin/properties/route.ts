import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client"; // Assurez-vous que cet import est présent

export const dynamic = 'force-dynamic';

// On définit le type attendu grâce au helper de Prisma généré
type AdminProperty = Prisma.PropertyGetPayload<{
  include: {
    owner: {
        select: { name: true, email: true, phone: true }
    },
    leases: {
        where: { isActive: true }
    }
  }
}>;

// --- GET : VOIR TOUS LES BIENS (ADMIN) ---
export async function GET(request: Request) {
  try {
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const admin = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!admin || admin.role !== "ADMIN") {
        return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
    }

    const properties = await prisma.property.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        owner: {
            select: { name: true, email: true, phone: true }
        },
        leases: {
            where: { isActive: true }
        }
      }
    });

    // Formatage des données
    const formatted = (properties as AdminProperty[]).map(p => ({
        ...p,
        isAvailable: p.leases.length === 0,
        ownerName: p.owner.name || "Anonyme",
        ownerEmail: p.owner.email,
        ownerPhone: p.owner.phone
    }));

    return NextResponse.json({ success: true, properties: formatted });

  } catch (error) {
    console.error("Erreur Admin Properties:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// --- DELETE ---
export async function DELETE(request: Request) {
    try {
        const userEmail = request.headers.get("x-user-email");
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!userEmail || !id) return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });

        const admin = await prisma.user.findUnique({ where: { email: userEmail } });
        if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Interdit" }, { status: 403 });

        // Transaction pour nettoyer les dépendances avant de supprimer le bien
        await prisma.$transaction([
            prisma.mission.deleteMany({ where: { propertyId: id } }),
            prisma.incident.deleteMany({ where: { propertyId: id } }),
            prisma.property.delete({ where: { id } })
        ]);

        return NextResponse.json({ success: true });

    } catch (error) {
        return NextResponse.json({ error: "Impossible de supprimer." }, { status: 500 });
    }
}

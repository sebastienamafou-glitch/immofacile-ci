import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. SÉCURITÉ
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const owner = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!owner) return NextResponse.json({ error: "Inconnu" }, { status: 403 });

    // 2. RÉCUPÉRATION FILTRÉE
    // On cherche les Inventory dont le Lease est lié à une Property appartenant à l'Owner
    const inventories = await prisma.inventory.findMany({
      where: {
        lease: {
            property: {
                ownerId: owner.id // ✅ Le filtre magique
            }
        }
      },
      orderBy: { date: 'desc' },
      include: {
        lease: {
            include: {
                property: { select: { title: true, commune: true } },
                tenant: { select: { name: true } }
            }
        }
      }
    });

    return NextResponse.json({ success: true, inventories });

  } catch (error) {
    console.error("Erreur API Inventory:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

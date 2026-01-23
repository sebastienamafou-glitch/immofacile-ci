import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { listingId, userEmail } = body; // En prod, userEmail viendra du token/session

    if (!listingId || !userEmail) {
      return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) return NextResponse.json({ error: "Utilisateur inconnu" }, { status: 401 });

    // 1. Vérifier si le favori existe déjà
    const existing = await prisma.wishlist.findUnique({
      where: {
        userId_listingId: {
          userId: user.id,
          listingId: listingId
        }
      }
    });

    if (existing) {
      // 2. Si existe -> SUPPRIMER (Unlike)
      await prisma.wishlist.delete({
        where: { id: existing.id }
      });
      return NextResponse.json({ status: "removed", message: "Retiré des favoris" });
    } else {
      // 3. Si existe pas -> CRÉER (Like)
      await prisma.wishlist.create({
        data: {
          userId: user.id,
          listingId: listingId
        }
      });
      return NextResponse.json({ status: "added", message: "Ajouté aux favoris" });
    }

  } catch (error) {
    console.error("Erreur Wishlist:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

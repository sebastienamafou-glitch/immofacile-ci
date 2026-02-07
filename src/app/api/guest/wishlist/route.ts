import { NextResponse } from "next/server";
import { auth } from "@/auth";

import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    // 1. SÉCURITÉ : L'identité vient du Middleware, JAMAIS du body
    const userEmail = req.headers.get("x-user-email");
    
    if (!userEmail) {
      return NextResponse.json({ error: "Non autorisé. Veuillez vous connecter." }, { status: 401 });
    }

    const body = await req.json();
    const { listingId } = body; // On ne lit que l'ID du bien

    if (!listingId) {
      return NextResponse.json({ error: "ID du logement requis" }, { status: 400 });
    }

    // 2. Vérification Utilisateur
    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) return NextResponse.json({ error: "Compte introuvable" }, { status: 404 });

    // 3. Mécanisme de TOGGLE (Ajout / Suppression)
    // On utilise la clé composée définie dans le schema : @@unique([userId, listingId])
    const existing = await prisma.wishlist.findUnique({
      where: {
        userId_listingId: {
          userId: user.id,
          listingId: listingId
        }
      }
    });

    if (existing) {
      // CAS A : Déjà favori -> ON SUPPRIME
      await prisma.wishlist.delete({
        where: { id: existing.id }
      });
      return NextResponse.json({ 
          success: true, 
          action: "removed", 
          message: "Retiré des favoris" 
      });
    } else {
      // CAS B : Pas encore favori -> ON CRÉE
      await prisma.wishlist.create({
        data: {
          userId: user.id,
          listingId: listingId
        }
      });
      return NextResponse.json({ 
          success: true, 
          action: "added", 
          message: "Ajouté aux favoris" 
      });
    }

  } catch (error) {
    console.error("Erreur Wishlist:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

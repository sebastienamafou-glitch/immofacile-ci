import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    // 1. Vérification Sécurité
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { role } = body;

    // 2. Validation du Rôle
    const allowedRoles = ["TENANT", "OWNER", "AGENT"];
    if (!allowedRoles.includes(role)) {
      return NextResponse.json({ error: "Rôle invalide." }, { status: 400 });
    }

    // 3. Mise à jour en Base de Données
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role: role }
    });

    return NextResponse.json({ 
        success: true, 
        role: updatedUser.role,
        message: "Profil mis à jour avec succès." 
    });

  } catch (error) {
    console.error("Erreur Onboarding:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

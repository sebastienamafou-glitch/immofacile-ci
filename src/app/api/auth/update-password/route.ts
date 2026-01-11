import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { verifyToken } from "@/lib/auth";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export async function PUT(request: Request) {
  try {
    const userAuth = verifyToken(request);
    const body = await request.json();
    const { currentPassword, newPassword } = body;

    // 1. Récupérer le user pour avoir son hash actuel
    const user = await prisma.user.findUnique({ where: { id: userAuth.id } });
    
    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    // 2. Vérifier l'ancien mot de passe
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return NextResponse.json({ error: "Le mot de passe actuel est incorrect" }, { status: 401 });
    }

    // 3. Hacher le nouveau mot de passe (Sécurité max: Salt généré auto)
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 4. Sauvegarder
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Erreur Update Password:", error);
    return NextResponse.json({ error: "Erreur technique serveur" }, { status: 500 });
  }
}

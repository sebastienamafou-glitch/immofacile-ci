import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function PUT(request: Request) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
        return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
    }

    if (newPassword.length < 6) {
        return NextResponse.json({ error: "Le mot de passe est trop court (min 6 car.)" }, { status: 400 });
    }

    // 1. Récupération utilisateur pour vérifier le hash actuel
    const user = await prisma.user.findUnique({ where: { id: userId } });
    
    if (!user || !user.password) {
        return NextResponse.json({ error: "Action impossible (Compte Google ?)" }, { status: 403 });
    }

    // 2. Vérification Ancien Mot de passe
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
        return NextResponse.json({ error: "Mot de passe actuel incorrect" }, { status: 403 });
    }

    // 3. Hashage et Sauvegarde
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    return NextResponse.json({ error: "Erreur changement mot de passe" }, { status: 500 });
  }
}

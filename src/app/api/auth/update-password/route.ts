import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // ✅ Utilisation du Singleton (Vital)
import bcrypt from "bcryptjs";

export const dynamic = 'force-dynamic';

export async function PUT(request: Request) {
  try {
    // 1. SÉCURITÉ STANDARDISÉE
    // On utilise la même méthode que partout ailleurs (Header sécurisé)
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) return NextResponse.json({ error: "Utilisateur inconnu" }, { status: 404 });

    // 2. VALIDATION
    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
        return NextResponse.json({ error: "Veuillez remplir tous les champs." }, { status: 400 });
    }

    if (newPassword.length < 6) {
        return NextResponse.json({ error: "Le nouveau mot de passe doit faire au moins 6 caractères." }, { status: 400 });
    }

    // 3. VÉRIFICATION DE L'ANCIEN MOT DE PASSE
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return NextResponse.json({ error: "Le mot de passe actuel est incorrect." }, { status: 401 });
    }

    // 4. HASHAGE ET MISE À JOUR
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });

    return NextResponse.json({ success: true, message: "Mot de passe mis à jour avec succès." });

  } catch (error) {
    console.error("Erreur Update Password:", error);
    return NextResponse.json({ error: "Erreur technique serveur" }, { status: 500 });
  }
}

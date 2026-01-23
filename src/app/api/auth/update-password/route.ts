import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; 
import bcrypt from "bcryptjs";

export const dynamic = 'force-dynamic';

export async function PUT(request: Request) {
  try {
    // 1. SÉCURITÉ STANDARDISÉE
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) return NextResponse.json({ error: "Utilisateur inconnu" }, { status: 404 });

    // ✅ CORRECTION : Vérifier si l'utilisateur a un mot de passe à modifier
    if (!user.password) {
        return NextResponse.json({ 
            error: "Votre compte utilise une connexion sociale (Google). Vous ne pouvez pas modifier de mot de passe." 
        }, { status: 400 });
    }

    // 2. VALIDATION DES ENTRÉES
    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
        return NextResponse.json({ error: "Veuillez remplir tous les champs." }, { status: 400 });
    }

    if (newPassword.length < 6) {
        return NextResponse.json({ error: "Le nouveau mot de passe doit faire au moins 6 caractères." }, { status: 400 });
    }

    // 3. VÉRIFICATION DE L'ANCIEN MOT DE PASSE
    // TypeScript sait maintenant que user.password existe grâce au 'if' plus haut
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

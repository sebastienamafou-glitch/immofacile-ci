import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs"; // Assurez-vous que c'est installé : npm i bcryptjs

export async function POST(request: Request) {
  try {
    // 1. Récupération des données
    const body = await request.json();
    const { name, email, phone, password } = body;

    // 2. Validation basique côté serveur
    if (!name || !email || !password) {
        return NextResponse.json({ error: "Nom, email et mot de passe requis." }, { status: 400 });
    }
    if (password.length < 6) {
        return NextResponse.json({ error: "Le mot de passe doit faire au moins 6 caractères." }, { status: 400 });
    }

    // 3. Vérification d'existence
    const existingUser = await prisma.user.findFirst({
        where: {
            OR: [
                { email: email },
                { phone: phone && phone.length > 0 ? phone : undefined } // Vérifie le tel seulement s'il est fourni
            ]
        }
    });

    if (existingUser) {
        return NextResponse.json({ error: "Cet email ou ce numéro de téléphone est déjà utilisé." }, { status: 409 });
    }

    // 4. Sécurité : Hachage du mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // 5. Création de l'utilisateur Akwaba (GUEST)
    const newUser = await prisma.user.create({
        data: {
            name,
            email,
            phone: phone || null, // Optionnel
            password: hashedPassword,
            role: 'GUEST', // ✅ C'est la clé : on force le rôle Voyageur
            isVerified: false, // KYC non requis pour commencer
        }
    });

    // Log succès (sans le mot de passe !)
    console.log(`[AKWABA SIGNUP] Nouvel utilisateur : ${newUser.email} (${newUser.id})`);

    // 6. Réponse succès
    // Note : Ici, on ne connecte pas automatiquement l'utilisateur (car cela dépend de votre NextAuth).
    // On renvoie un succès pour que le front redirige vers la page de login.
    return NextResponse.json({ 
        success: true, 
        userId: newUser.id,
        message: "Compte créé avec succès." 
    });

  } catch (error: any) {
    console.error("Akwaba Signup Error:", error);
    // Gestion fine des erreurs Prisma (doublon unique)
    if (error.code === 'P2002') {
         const target = error.meta?.target?.includes('phone') ? "numéro de téléphone" : "email";
         return NextResponse.json({ error: `Cet ${target} est déjà enregistré.` }, { status: 409 });
    }
    return NextResponse.json({ error: "Erreur serveur lors de l'inscription." }, { status: 500 });
  }
}

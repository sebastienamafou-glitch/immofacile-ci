import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // 1. SÉCURITÉ ENVIRONNEMENT
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
        console.error("CRITIQUE: JWT_SECRET manquant dans les variables d'environnement.");
        return NextResponse.json({ error: "Erreur de configuration serveur." }, { status: 500 });
    }

    const body = await request.json();
    
    // On accepte l'email, le téléphone ou un username
    const identifier = body.email || body.phone || body.identifier || body.username;
    const password = body.password;

    if (!identifier || !password) {
        return NextResponse.json({ error: "Identifiant et mot de passe requis." }, { status: 400 });
    }

    // 2. RECHERCHE DE L'UTILISATEUR
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { phone: identifier }
        ]
      }
    });

    if (!user) {
      return NextResponse.json({ error: "Identifiants incorrects." }, { status: 401 });
    }

    // 3. VÉRIFICATION DU MOT DE PASSE
    // ✅ CORRECTION : On vérifie d'abord si l'utilisateur a un mot de passe
    if (!user.password) {
        return NextResponse.json({ 
            error: "Ce compte utilise une connexion sociale (Google). Veuillez vous connecter via le bouton Google." 
        }, { status: 400 });
    }

    let isValid = false;
    // Maintenant TypeScript sait que user.password existe, on peut utiliser startsWith
    const isHash = user.password.startsWith("$2");

    if (isHash) {
        isValid = await bcrypt.compare(password, user.password);
    } else {
        // ⚠️ Legacy : Mot de passe en clair (pour le dev)
        isValid = (user.password === password);
    }

    if (!isValid) {
      return NextResponse.json({ error: "Identifiants incorrects." }, { status: 401 });
    }

    // 4. DÉTERMINATION DE LA REDIRECTION
    let destination = "/dashboard/tenant"; // Fallback

    switch (user.role) {
        case "SUPER_ADMIN": destination = "/dashboard/superadmin"; break;
        case "OWNER": destination = "/dashboard/owner"; break;
        case "AGENT": destination = "/dashboard/agent"; break;
        case "ARTISAN": destination = "/dashboard/artisan"; break;
    }

    // 5. GÉNÉRATION DU TOKEN
    const sessionToken = jwt.sign(
      {
        userId: user.id,
        role: user.role,
        email: user.email
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // 6. RÉPONSE
    return NextResponse.json({
      success: true,
      token: sessionToken,
      redirectUrl: destination, 
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone
      }
    });

  } catch (error) {
    console.error("Erreur Login:", error);
    return NextResponse.json({ error: "Erreur serveur lors de la connexion." }, { status: 500 });
  }
}

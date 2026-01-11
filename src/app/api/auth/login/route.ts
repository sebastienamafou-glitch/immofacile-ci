import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken"; // ✅ Import indispensable

const JWT_SECRET = process.env.JWT_SECRET || 'votre_super_secret'; // Doit être identique à auth.ts

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // On accepte l'email, le téléphone ou un username générique
    const identifier = body.email || body.phone || body.identifier || body.username;
    const password = body.password;

    console.log("Tentative de connexion pour :", identifier);

    if (!identifier || !password) {
        return NextResponse.json({ error: "Identifiant et mot de passe requis." }, { status: 400 });
    }

    // 1. RECHERCHE DE L'UTILISATEUR (Email ou Téléphone)
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { phone: identifier }
        ]
      }
    });

    if (!user) {
      return NextResponse.json({ error: "Aucun compte trouvé avec cet identifiant." }, { status: 404 });
    }

    // 2. VÉRIFICATION DU MOT DE PASSE
    let isValid = false;
    const isHash = user.password.startsWith("$2");

    if (isHash) {
        isValid = await bcrypt.compare(password, user.password);
    } else {
        isValid = (user.password === password);
    }

    if (!isValid) {
      return NextResponse.json({ error: "Mot de passe incorrect." }, { status: 401 });
    }

    // 3. DÉTERMINATION DE LA REDIRECTION
    let destination = "/dashboard/tenant"; // Par défaut

    switch (user.role) {
        case "ADMIN":
            destination = "/dashboard/admin";
            break;
        case "OWNER":
            destination = "/dashboard/owner";
            break;
        case "AGENT":
            destination = "/dashboard/agent";
            break;
        case "ARTISAN":
            destination = "/dashboard/artisan";
            break;
    }

    // 4. GÉNÉRATION DU VRAI JWT (Correction du bug "malformed")
    // On signe le token avec la clé secrète
    const sessionToken = jwt.sign(
      {
        userId: user.id,
        role: user.role,
        email: user.email
      },
      JWT_SECRET,
      { expiresIn: '7d' } // Le token expire dans 7 jours
    );

    // 5. RÉPONSE SUCCESS
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

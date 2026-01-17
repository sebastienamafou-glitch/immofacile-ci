import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, phone, password, name, role } = body;

    // 1. Validation de base
    if ((!email && !phone) || !password) {
        return NextResponse.json({ error: "Email/Tel et mot de passe requis." }, { status: 400 });
    }

    // 2. Vérification existence (Doublons)
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
            { email: email || undefined }, 
            { phone: phone || undefined }
        ]
      }
    });

    if (existingUser) {
      return NextResponse.json({ error: "Un compte existe déjà avec cet email ou téléphone." }, { status: 409 });
    }

    // 3. Hashage Mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ SÉCURITÉ RÔLES (Correction Critique)
    // On retire "ADMIN" de la liste. Seuls les admins peuvent créer d'autres admins via le dashboard.
    const allowedPublicRoles = ["OWNER", "AGENT", "ARTISAN"]; 
    
    // Rôle par défaut = OWNER (Propriétaire)
    // Si l'utilisateur demande un rôle autorisé, on lui donne. Sinon, on force OWNER.
    let userRole = "OWNER"; 
    if (role && allowedPublicRoles.includes(role)) {
        userRole = role;
    }

    // 4. Création
    const newUser = await prisma.user.create({
      data: {
        email,
        phone,
        password: hashedPassword,
        name: name || "Utilisateur",
        role: userRole as any, // Cast sécurisé maintenant que la liste est filtrée
        walletBalance: 0,
        kycStatus: "PENDING"
      }
    });

    // 5. Nettoyage réponse
    const { password: _, ...userSafe } = newUser;

    return NextResponse.json({ success: true, user: userSafe });

  } catch (error) {
    console.error("Erreur Inscription:", error);
    return NextResponse.json({ error: "Erreur serveur lors de l'inscription." }, { status: 500 });
  }
}

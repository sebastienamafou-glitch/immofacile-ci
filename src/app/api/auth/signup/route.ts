import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, phone, password, name, role } = body;

    if ((!email && !phone) || !password) {
        return NextResponse.json({ error: "Email/Tel et mot de passe requis." }, { status: 400 });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
            { email: email || undefined }, 
            { phone: phone || undefined }
        ]
      }
    });

    if (existingUser) {
      return NextResponse.json({ error: "Compte déjà existant." }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ CORRECTION LOGIQUE MÉTIER
    // 1. On définit les rôles autorisés à s'inscrire publiquement
    const allowedPublicRoles = ["OWNER", "AGENT", "ARTISAN", "ADMIN"];
    
    // 2. Si le rôle est envoyé (ex: depuis la page propriétaire), on le prend.
    // 3. SINON, le défaut est "OWNER" (car les locataires ne s'inscrivent pas ici).
    let userRole = "OWNER"; 

    if (role && allowedPublicRoles.includes(role)) {
        userRole = role;
    }

    const newUser = await prisma.user.create({
      data: {
        email,
        phone,
        password: hashedPassword,
        name: name || "Utilisateur",
        role: userRole as any, 
        walletBalance: 0,
        kycStatus: "PENDING"
      }
    });

    const { password: _, ...userSafe } = newUser;

    return NextResponse.json({ success: true, user: userSafe });

  } catch (error) {
    console.error("Erreur Inscription:", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

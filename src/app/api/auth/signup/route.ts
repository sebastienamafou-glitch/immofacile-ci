import { NextResponse } from "next/server";
import { auth } from "@/auth";

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

    // Sécurité Rôles
    const allowedPublicRoles = ["OWNER", "TENANT", "AGENT", "ARTISAN", "GUEST", "INVESTOR"]; 
    let userRole = "GUEST"; // Rôle par défaut prudent
    
    if (role && allowedPublicRoles.includes(role)) {
        userRole = role;
    }

    // 4. CRÉATION ATOMIQUE (USER + FINANCE + KYC)
    // C'est ici que la magie opère pour respecter le schéma v5
    const newUser = await prisma.user.create({
      data: {
        email,
        phone,
        password: hashedPassword,
        name: name || "Utilisateur",
        role: userRole as any,
        
        // ✅ INIT FINANCE (Obligatoire maintenant)
        finance: {
            create: {
                walletBalance: 0,
                version: 1,
                kycTier: 1 // Tier 1 par défaut (Non vérifié)
            }
        },

        // ✅ INIT KYC (Obligatoire maintenant)
        kyc: {
            create: {
                status: "PENDING",
                documents: []
            }
        }
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

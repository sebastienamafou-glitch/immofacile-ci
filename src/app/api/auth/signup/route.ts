import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { logActivity } from "@/lib/logger"; 

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
      // 🚨 AUDIT SÉCURITÉ : Appel corrigé avec syntaxe Objet {}
      await logActivity({
        action: "SIGNUP_FAILED_DUPLICATE" as any, 
        entityType: "SECURITY", 
        metadata: { email, phone } 
        // Note: L'IP est récupérée automatiquement par le logger
      });
      
      return NextResponse.json({ error: "Un compte existe déjà avec cet email ou téléphone." }, { status: 409 });
    }

    // 3. Hashage Mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Sécurité Rôles
    const allowedPublicRoles = ["OWNER", "TENANT", "AGENT", "ARTISAN", "GUEST", "INVESTOR"]; 
    let userRole = "TENANT"; 
    
    if (role && allowedPublicRoles.includes(role)) {
        userRole = role;
    }

    // 4. CRÉATION ATOMIQUE (USER + FINANCE + KYC)
    const newUser = await prisma.user.create({
      data: {
        email,
        phone,
        password: hashedPassword,
        name: name || "Utilisateur",
        role: userRole as any, 
        
        finance: {
            create: {
                walletBalance: 0,
                version: 1,
                kycTier: 1 
            }
        },

        kyc: {
            create: {
                status: "PENDING",
                documents: []
            }
        }
      }
    });

    // ✅ 5. AUDIT SUCCÈS : Appel corrigé avec syntaxe Objet {}
    await logActivity({
        action: "NEW_USER_REGISTERED" as any, 
        entityType: "AUTH", 
        userId: newUser.id,
        metadata: { 
            role: newUser.role, 
            method: email ? "EMAIL" : "PHONE",
            name: newUser.name 
        }
    });

    // 6. Nettoyage réponse
    // @ts-ignore
    const { password: _, ...userSafe } = newUser;

    return NextResponse.json({ success: true, user: userSafe });

  } catch (error: any) {
    console.error("Erreur Inscription:", error);
    
    // Log d'erreur système corrigé
    await logActivity({
        action: "SIGNUP_SYSTEM_ERROR" as any, 
        entityType: "SYSTEM", 
        metadata: { error: error.message }
    });

    return NextResponse.json({ error: "Erreur serveur lors de l'inscription." }, { status: 500 });
  }
}

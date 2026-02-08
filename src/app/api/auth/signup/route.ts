import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { logActivity } from "@/lib/logger"; // ✅ Import du logger d'audit

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
      // 🚨 AUDIT SÉCURITÉ : Tentative d'inscription sur compte existant
      await logActivity(
        "SIGNUP_FAILED_DUPLICATE", 
        "SECURITY", 
        { 
            email, 
            phone, 
            ip: request.headers.get("x-forwarded-for") || "unknown" 
        }
      );
      
      return NextResponse.json({ error: "Un compte existe déjà avec cet email ou téléphone." }, { status: 409 });
    }

    // 3. Hashage Mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Sécurité Rôles
    const allowedPublicRoles = ["OWNER", "TENANT", "AGENT", "ARTISAN", "GUEST", "INVESTOR"]; 
    let userRole = "TENANT"; // Par défaut "Locataire" si non spécifié (plus sûr que Guest)
    
    // On force le typage pour éviter les erreurs TypeScript avec Prisma
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
        role: userRole as any, // Cast nécessaire si l'enum n'est pas importé
        
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

    // ✅ 5. AUDIT SUCCÈS : Enregistrement dans le journal
    await logActivity(
        "NEW_USER_REGISTERED", 
        "AUTH", 
        { 
            role: newUser.role, 
            method: email ? "EMAIL" : "PHONE",
            name: newUser.name 
        }, 
        newUser.id // On lie l'action au nouvel utilisateur
    );

    // 6. Nettoyage réponse (On retire le hash du mot de passe)
    // @ts-ignore
    const { password: _, ...userSafe } = newUser;

    return NextResponse.json({ success: true, user: userSafe });

  } catch (error: any) {
    console.error("Erreur Inscription:", error);
    
    // Log d'erreur système (Optionnel)
    await logActivity("SIGNUP_SYSTEM_ERROR", "SYSTEM", { error: error.message });

    return NextResponse.json({ error: "Erreur serveur lors de l'inscription." }, { status: 500 });
  }
}

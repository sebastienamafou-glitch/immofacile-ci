import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";

// ✅ TYPAGE STRICT DES DONNÉES ENTRANTES
interface AmbassadorSignupRequest {
  name: string;
  phone: string;
  email?: string;
  password: string;
}

export async function POST(req: Request) {
  try {
    // Cast strict du body
    const body: AmbassadorSignupRequest = await req.json();
    const { name, phone, email, password } = body;

    // Validation de base
    if (!name || !phone || !password) {
      return NextResponse.json(
        { error: "Veuillez remplir les champs obligatoires." }, 
        { status: 400 }
      );
    }

    // 1. Vérification stricte des doublons (Téléphone ou Email)
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: phone },
          // On ajoute la condition email uniquement si l'email a été renseigné
          ...(email ? [{ email: email }] : [])
        ]
      }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Ce numéro ou cet email est déjà utilisé." }, 
        { status: 409 }
      );
    }

    // 2. Hachage sécurisé du mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Création du User + Initialisation des relations (KYC & Finance) d'après le schéma
    const newUser = await prisma.user.create({
      data: {
        name,
        phone,
        email: email || null,
        password: hashedPassword,
        role: Role.AMBASSADOR, // Attribution stricte de l'Enum
        
        // Création automatique du dossier KYC en attente
        kyc: {
          create: {
            status: "PENDING"
          }
        },
        
        // Création automatique du portefeuille financier
        finance: {
          create: {
            walletBalance: 0,
            escrowBalance: 0,
            referralBalance: 0,
            kycTier: 1
          }
        }
      }
    });

    return NextResponse.json({ 
        success: true, 
        message: "Compte Ambassadeur créé avec succès",
        userId: newUser.id
    }, { status: 201 });

  } catch (error: unknown) {
    console.error("Erreur inscription ambassadeur:", error);
    
    // Fallback générique sans type 'any'
    return NextResponse.json(
        { error: "Erreur serveur lors de la création du compte." }, 
        { status: 500 }
    );
  }
}

'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { hash } from "bcryptjs";
import crypto from "crypto";

// Validation stricte des types d'entrée
interface CreateInvestorData {
  name: string;
  email: string;
  phone: string;
  amount: number;
  packName: string;
}

export async function createInvestor(data: CreateInvestorData) {
  try {
    // 1. Validation : Unicité Email & Téléphone
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: data.email },
          { phone: data.phone }
        ]
      }
    });

    if (existingUser) {
      return { success: false, error: "Cet email ou ce numéro de téléphone existe déjà." };
    }
    const generatedPassword = crypto.randomBytes(10).toString('hex');
    const hashedPassword = await hash(generatedPassword, 12); // Cost factor 12 pour Prod
    const newUser = await prisma.$transaction(async (tx) => {
      // A. Création User
      const user = await tx.user.create({
        data: {
          name: data.name,
          email: data.email,
          phone: data.phone,
          password: hashedPassword,
          role: "INVESTOR",
          isBacker: true,
          backerTier: data.packName,
          walletBalance: data.amount, // On crédite le wallet virtuel
          isVerified: true, // L'admin l'a vérifié manuellement (KYC manuel)
          kycStatus: "VERIFIED"
        }
      });

      // B. Enregistrement de l'apport financier
      await tx.transaction.create({
        data: {
          amount: data.amount,
          type: "CREDIT",
          reason: `INITIAL_INVESTMENT_${data.packName}`,
          userId: user.id
        }
      });

      return user;
    });

    revalidatePath('/dashboard/superadmin/investors');

    // 4. RETOUR SÉCURISÉ
    // On renvoie le mot de passe en clair UNIQUEMENT ICI pour affichage unique
    return { 
      success: true, 
      message: "Investisseur créé avec succès.",
      credentials: {
        email: newUser.email,
        password: generatedPassword 
      }
    };

  } catch (error) {
    console.error("[CRITICAL] Create Investor Error:", error);
    return { success: false, error: "Erreur critique base de données." };
  }
}

'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { hash } from "bcryptjs";
import crypto from "crypto";
import { auth } from "@/auth"; 

interface CreateInvestorData {
  name: string;
  email: string;
  phone: string;
  amount: number;
  packName: string;
}

export async function createInvestor(data: CreateInvestorData) {
  try {
    // 🛡️ 1. SÉCURITÉ RÉELLE (Session NextAuth)
    const session = await auth();

    // Vérifie si connecté ET si c'est un SUPER_ADMIN
    // @ts-ignore (Assure-toi que ton type Session inclut le role)
    if (!session || session.user.role !== "SUPER_ADMIN") {
        return { success: false, error: "Accès refusé. Intrusion détectée." };
    }
    // 🛡️ FIN SÉCURITÉ

    // 2. Validation Unicité
    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email: data.email }, { phone: data.phone }] }
    });

    if (existingUser) return { success: false, error: "Utilisateur déjà existant." };

    const generatedPassword = crypto.randomBytes(10).toString('hex');
    const hashedPassword = await hash(generatedPassword, 12);

    // 3. TRANSACTION ATOMIQUE (Correction Schéma)
    const newUser = await prisma.$transaction(async (tx) => {
      
      // A. Création User (Identité seule)
      const user = await tx.user.create({
        data: {
          name: data.name,
          email: data.email,
          phone: data.phone,
          password: hashedPassword,
          role: "INVESTOR",
          isBacker: true,
          backerTier: data.packName,
          isVerified: true, // Champ booléen simple sur User [cite: 6]
        }
      });

      // B. Création Finance (Le wallet est ici !) 
      await tx.userFinance.create({
        data: {
            userId: user.id,
            walletBalance: data.amount, // Crédit initial
            kycTier: 3, // On suppose que l'admin a vérifié le client
            version: 1
        }
      });

      // C. Création KYC (Le statut est ici !) 
      await tx.userKYC.create({
          data: {
              userId: user.id,
              status: "VERIFIED",
              idType: "ADMIN_IMPORT"
          }
      });

      // D. Trace de la Transaction
      if (data.amount > 0) {
          await tx.transaction.create({
            data: {
              amount: data.amount,
              type: "CREDIT",
              balanceType: "WALLET", // [cite: 93]
              reason: `INVESTISSEMENT INITIAL - ${data.packName}`,
              userId: user.id,
              status: "SUCCESS"
            }
          });
      }

      return user;
    });

    revalidatePath('/dashboard/superadmin/investors');

    return { 
      success: true, 
      message: "Investisseur créé avec succès.",
      credentials: { email: newUser.email, password: generatedPassword }
    };

  } catch (error) {
    console.error("[CreateInvestor]", error);
    return { success: false, error: "Erreur technique serveur." };
  }
}

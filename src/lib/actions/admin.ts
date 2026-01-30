'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { hash } from "bcryptjs";
import crypto from "crypto";
import { headers } from "next/headers"; // ✅ IMPORT REQUIS

interface CreateInvestorData {
  name: string;
  email: string;
  phone: string;
  amount: number;
  packName: string;
}

export async function createInvestor(data: CreateInvestorData) {
  try {
    // 🛡️ 1. SÉCURITÉ ZERO TRUST (AJOUT CRITIQUE)
    const headersList = headers();
    const adminId = headersList.get("x-user-id");

    if (!adminId) return { success: false, error: "Non autorisé." };

    const adminUser = await prisma.user.findUnique({
        where: { id: adminId },
        select: { role: true }
    });

    if (!adminUser || adminUser.role !== "SUPER_ADMIN") {
        return { success: false, error: "Intrusion détectée : Droits insuffisants." };
    }
    // 🛡️ FIN DE LA SÉCURISATION

    // 2. Validation : Unicité Email & Téléphone
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: data.email },
          { phone: data.phone }
        ]
      }
    });

    if (existingUser) {
      return { success: false, error: "Cet email ou ce numéro existe déjà." };
    }

    const generatedPassword = crypto.randomBytes(10).toString('hex');
    const hashedPassword = await hash(generatedPassword, 12);

    const newUser = await prisma.$transaction(async (tx) => {
      // A. Création User
      const user = await tx.user.create({
        data: {
          name: data.name,
          email: data.email,
          phone: data.phone,
          password: hashedPassword,
          role: "INVESTOR",
          // ... reste inchangé
          backerTier: data.packName,
          walletBalance: data.amount,
          isVerified: true,
          kycStatus: "VERIFIED"
        }
      });

      // B. Transaction
      if (data.amount > 0) {
          await tx.transaction.create({
            data: {
              amount: data.amount,
              type: "CREDIT",
              reason: `INITIAL_INVESTMENT_${data.packName}`,
              userId: user.id,
              status: "SUCCESS" // ✅ Toujours préciser le statut
            }
          });
      }

      return user;
    });

    revalidatePath('/dashboard/superadmin/investors');

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
    return { success: false, error: "Erreur technique." };
  }
}

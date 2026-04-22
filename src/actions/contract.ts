'use server'

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto"; 
import { headers } from "next/headers";
// ✅ IMPORT DE L'ENUM INVESTMENTPACK MANQUANT
import { InvestmentStatus, AuditAction, InvestmentPack } from "@prisma/client";

// 1. RÉCUPÉRER LES DONNÉES DU CONTRAT (ET DÉCHIFFRER L'IDENTITÉ)
export async function getContractData(contractId?: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non autorisé" };

  const contract = await prisma.investmentContract.findFirst({
    where: {
      userId: session.user.id,
      ...(contractId ? { id: contractId } : { status: InvestmentStatus.PENDING })
    },
    orderBy: { signedAt: 'desc' },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          address: true,
          kyc: {
            select: { idNumber: true, idType: true } 
          }
        }
      }
    }
  });

  if (!contract) return { error: "Aucun contrat en attente." };

  const encryptedId = contract.user.kyc?.idNumber;
  const readableId = encryptedId ? decrypt(encryptedId) : "NON VÉRIFIÉ";

  return {
    success: true,
    contract: {
      id: contract.id,
      amount: contract.amount,
      // 🔒 CORRECTION : Utilisation stricte de l'Enum
      packName: contract.packName || InvestmentPack.STARTER, 
      signedAt: contract.signedAt, 
      status: contract.status,
      roi: Number(contract.roi || 0), 
      user: {
        name: contract.user.name,
        address: contract.user.address || "Adresse non renseignée",
        idType: contract.user.kyc?.idType || "CNI", 
        idNumber: readableId 
      }
    }
  };
}

// 2. GÉNÉRER ET ENVOYER L'OTP
export async function sendContractOtp(contractId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non autorisé" };

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const identifier = `CONTRACT_${contractId}`;

  await prisma.verificationToken.upsert({
    where: { identifier_token: { identifier, token: otp } }, 
    create: {
      identifier,
      token: otp,
      expires: new Date(Date.now() + 15 * 60 * 1000)
    },
    update: {
      token: otp,
      expires: new Date(Date.now() + 15 * 60 * 1000)
    }
  });

  console.log(`🔐 OTP pour contrat ${contractId}: ${otp}`); 
  
  return { success: true, message: "Code envoyé (Consultez la console en dev)" };
}

// 3. VALIDER LA SIGNATURE
export async function signContract(contractId: string, otp: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non autorisé" };

  const identifier = `CONTRACT_${contractId}`;

  const validToken = await prisma.verificationToken.findFirst({
    where: {
      identifier,
      token: otp,
      expires: { gt: new Date() }
    }
  });

  if (!validToken) return { error: "Code invalide ou expiré." };

  const headerList = headers();
  const ip = headerList.get("x-forwarded-for") || "unknown";
  const userAgent = headerList.get("user-agent") || "unknown";

  const signatureProof = JSON.stringify({
    ip,
    userAgent,
    signedAt: new Date().toISOString(),
    method: "OTP_SMS",
    provider: "Twilio_Mock"
  });

  await prisma.$transaction([
    prisma.investmentContract.update({
      where: { id: contractId },
      data: {
        status: InvestmentStatus.ACTIVE, // 🔒 Enum strict
        signatureData: signatureProof,
        signedAt: new Date()
      }
    }),
    prisma.verificationToken.deleteMany({
      where: { identifier }
    }),
    prisma.auditLog.create({
      data: {
        action: AuditAction.CROWDFUNDING_SUCCESS, // 🔒 Enum strict aligné au schéma
        entityId: contractId,
        entityType: "INVESTMENT_CONTRACT",
        userId: session.user.id,
        metadata: { ip, method: "OTP_SMS" }
      }
    })
  ]);

  return { success: true };
}

'use server'

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto"; // 🔐 On utilise notre fonction de déchiffrement
import { headers } from "next/headers";

// 1. RÉCUPÉRER LES DONNÉES DU CONTRAT (ET DÉCHIFFRER L'IDENTITÉ)
export async function getContractData(contractId?: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non autorisé" };

  // On cherche soit le contrat demandé, soit le dernier en attente
  const contract = await prisma.investmentContract.findFirst({
    where: {
      userId: session.user.id,
      ...(contractId ? { id: contractId } : { status: "PENDING" })
    },
    orderBy: { signedAt: 'desc' },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          address: true,
          kyc: {
            select: { idNumber: true, idType: true } // On récupère la donnée chiffrée
          }
        }
      }
    }
  });

  if (!contract) return { error: "Aucun contrat en attente." };

  // 🔐 DÉCHIFFREMENT
  const encryptedId = contract.user.kyc?.idNumber;
  const readableId = encryptedId ? decrypt(encryptedId) : "NON VÉRIFIÉ";

  return {
    success: true,
    contract: {
      id: contract.id,
      amount: contract.amount,
      packName: contract.packName || "Pack Standard",
      date: contract.signedAt,
      status: contract.status,
      user: {
        name: contract.user.name,
        address: contract.user.address || "Adresse non renseignée",
        idNumber: readableId, // ✅ Le vrai numéro apparaît ici
        idType: contract.user.kyc?.idType || "CNI"
      }
    }
  };
}

// 2. GÉNÉRER ET ENVOYER L'OTP
export async function sendContractOtp(contractId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non autorisé" };

  // Génération d'un code à 6 chiffres
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const identifier = `CONTRACT_${contractId}`;

  // On stocke l'OTP dans la table VerificationToken (validité 15 min)
  await prisma.verificationToken.upsert({
    where: { identifier_token: { identifier, token: otp } }, // Hack Prisma (composite key)
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

  console.log(`🔐 OTP pour contrat ${contractId}: ${otp}`); // Pour le dev (sera remplacé par Twilio/SMS)
  
  return { success: true, message: "Code envoyé (Consultez la console en dev)" };
}

// 3. VALIDER LA SIGNATURE
export async function signContract(contractId: string, otp: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non autorisé" };

  const identifier = `CONTRACT_${contractId}`;

  // Vérification de l'OTP
  const validToken = await prisma.verificationToken.findFirst({
    where: {
      identifier,
      token: otp,
      expires: { gt: new Date() }
    }
  });

  if (!validToken) return { error: "Code invalide ou expiré." };

  // Récupération des métadonnées de preuve (Audit Trail)
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

  // Mise à jour du contrat + Nettoyage OTP
  await prisma.$transaction([
    prisma.investmentContract.update({
      where: { id: contractId },
      data: {
        status: "ACTIVE", // Le contrat devient actif
        signatureData: signatureProof,
        signedAt: new Date()
      }
    }),
    prisma.verificationToken.deleteMany({
      where: { identifier }
    })
  ]);

  return { success: true };
}

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";
import { v4 as uuidv4 } from "uuid";
import { nanoid } from "nanoid";
// 👇 IMPORT DE SÉCURITÉ
import { encrypt } from "@/lib/crypto"; 

export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 Mo
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf"
];

export async function POST(request: Request) {
  try {
    // 1. SÉCURITÉ
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    // 2. VALIDATION & RÉCUPÉRATION DONNÉES
    const formData = await request.formData();
    const file = formData.get("document") as File | null;
    const documentType = formData.get("type") as string || "CNI";
    
    // 👇 RÉCUPÉRATION DU NUMÉRO CNI
    const rawIdNumber = formData.get("idNumber") as string | null;

    if (!file) return NextResponse.json({ error: "Fichier requis" }, { status: 400 });
    if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: "Max 5Mo autorisé" }, { status: 413 });
    if (!ALLOWED_MIME_TYPES.includes(file.type)) return NextResponse.json({ error: "Format invalide (PDF/JPG/PNG)" }, { status: 415 });

    // 🛡️ CHIFFREMENT IMMÉDIAT (RGPD)
    // On ne stocke jamais le numéro en clair. Si pas de numéro, on met null.
    const encryptedIdNumber = rawIdNumber ? encrypt(rawIdNumber) : null;

    // 3. UPLOAD "OBSCUR"
    const fileExtension = file.name.split('.').pop() || "bin";
    const secureFolder = nanoid(16);
    const uniqueFileName = `secure-kyc/${userId}/${secureFolder}/${uuidv4()}.${fileExtension}`; 

    const blob = await put(uniqueFileName, file, {
      access: 'public',
    });

    // 4. SAUVEGARDE EN BASE (AVEC CHIFFREMENT)
    await prisma.userKYC.upsert({
      where: { userId: userId },
      create: {
        userId: userId,
        status: "PENDING",
        documents: [blob.url],
        idType: documentType,
        idNumber: encryptedIdNumber, // ✅ Stocké chiffré (ex: "iv:content")
      },
      update: {
        status: "PENDING",
        idType: documentType,
        idNumber: encryptedIdNumber, // ✅ Mise à jour chiffrée
        documents: {
          push: blob.url 
        }
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: "Document transmis et sécurisé.",
      url: blob.url
    });

  } catch (error) {
    console.error("Erreur Upload KYC:", error);
    return NextResponse.json({ error: "Erreur serveur interne" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";
import { v4 as uuidv4 } from "uuid";
import { nanoid } from "nanoid"; // ou utilisez une fonction random simple si pas installé

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

    // 2. VALIDATION
    const formData = await request.formData();
    const file = formData.get("document") as File | null;
    const documentType = formData.get("type") as string || "CNI"; // On récupère le type (CNI/PASSPORT)

    if (!file) return NextResponse.json({ error: "Fichier requis" }, { status: 400 });
    if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: "Max 5Mo autorisé" }, { status: 413 });
    if (!ALLOWED_MIME_TYPES.includes(file.type)) return NextResponse.json({ error: "Format invalide (PDF/JPG/PNG)" }, { status: 415 });

    // 3. UPLOAD "OBSCUR" (Sécurité par obfuscation pour Vercel Blob Public)
    // On ajoute un dossier aléatoire impossible à deviner pour protéger la CNI
    const fileExtension = file.name.split('.').pop() || "bin";
    const secureFolder = nanoid(16); // ex: "x7d8s9d8s7d8s"
    const uniqueFileName = `secure-kyc/${userId}/${secureFolder}/${uuidv4()}.${fileExtension}`; 

    const blob = await put(uniqueFileName, file, {
      access: 'public', // Reste public techniquement, mais URL introuvable sans le lien exact
    });

    // 4. SAUVEGARDE EN BASE
    await prisma.userKYC.upsert({
      where: { userId: userId },
      create: {
        userId: userId,
        status: "PENDING",
        documents: [blob.url],
        idType: documentType, // On sauvegarde le type
      },
      update: {
        status: "PENDING", // On repasse en attente à chaque nouvel envoi
        idType: documentType,
        documents: {
          push: blob.url 
        }
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: "Document transmis avec succès.",
      url: blob.url
    });

  } catch (error) {
    console.error("Erreur Upload KYC:", error);
    return NextResponse.json({ error: "Erreur serveur interne" }, { status: 500 });
  }
}

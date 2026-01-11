import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { verifyToken } from "@/lib/auth";
import { put } from "@vercel/blob"; // ✅ Le stockage Cloud de Vercel
import { v4 as uuidv4 } from "uuid";

const prisma = new PrismaClient();

// CONFIGURATION DE SÉCURITÉ
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 Mo
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf"
];

export async function POST(request: Request) {
  try {
    // 1. SÉCURITÉ : Authentification
    let userId: string;
    try {
      const user = verifyToken(request);
      userId = user.id;
    } catch (e) {
      return NextResponse.json({ error: "Session expirée" }, { status: 401 });
    }

    // 2. PARSING DU FORMULAIRE
    const formData = await request.formData();
    const file = formData.get("document") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
    }

    // 3. VALIDATION STRICTE
    // A. Taille
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Fichier trop volumineux (Max 5Mo)" }, 
        { status: 413 }
      );
    }

    // B. Type de fichier (MIME)
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Format non supporté. Utilisez JPG, PNG ou PDF." }, 
        { status: 415 }
      );
    }

    // 4. UPLOAD VERS VERCEL BLOB (CLOUD)
    // On génère un nom unique pour ne pas écraser les fichiers et pour la confidentialité
    const fileExtension = file.name.split('.').pop() || "bin";
    const uniqueFileName = `kyc/${userId}/${uuidv4()}.${fileExtension}`; // Structure: kyc/USER_ID/UUID.ext

    // Envoi direct au cloud Vercel (Rapide & Sécurisé)
    const blob = await put(uniqueFileName, file, {
      access: 'public',
    });

    // 5. MISE À JOUR BASE DE DONNÉES
    // On stocke l'URL publique fournie par Vercel (https://...)
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        kycStatus: "PENDING",
        kycDocuments: {
          push: blob.url 
        },
        updatedAt: new Date()
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: "Document sécurisé dans le Cloud",
      status: updatedUser.kycStatus,
      url: blob.url
    });

  } catch (error) {
    console.error("Erreur Upload Vercel Blob:", error);
    return NextResponse.json(
      { error: "Erreur serveur lors de l'upload Cloud" }, 
      { status: 500 }
    );
  }
}

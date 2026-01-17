import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // ✅ Singleton
import { put } from "@vercel/blob";
import { v4 as uuidv4 } from "uuid";

export const dynamic = 'force-dynamic'; // Sécurité Next.js

// CONFIGURATION
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 Mo
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf"
];

export async function POST(request: Request) {
  try {
    // 1. SÉCURITÉ AUTH
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

    // 2. PARSING & VALIDATION
    const formData = await request.formData();
    const file = formData.get("document") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Fichier trop volumineux (Max 5Mo)" }, { status: 413 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Format non supporté (PDF, JPG, PNG uniquement)." }, { status: 415 });
    }

    // 3. UPLOAD CLOUD (Vercel Blob)
    const fileExtension = file.name.split('.').pop() || "bin";
    // On range par ID utilisateur pour éviter le désordre
    const uniqueFileName = `kyc/${user.id}/${uuidv4()}.${fileExtension}`; 

    const blob = await put(uniqueFileName, file, {
      access: 'public', // Attention: URL accessible si connue. Pour du KYC strict, envisagez 'private' + tokens temporaires plus tard.
    });

    // 4. MISE À JOUR BASE DE DONNÉES
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        kycStatus: "PENDING", // On repasse en attente de validation
        // ❌ J'ai supprimé 'kycDocumentUrl' qui n'existe pas dans votre schema
        // ✅ On utilise 'push' pour ajouter au tableau existant
        kycDocuments: {
          push: blob.url 
        }
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: "Document envoyé. En attente de validation.",
      url: blob.url
    });

  } catch (error) {
    console.error("Erreur Upload KYC:", error);
    return NextResponse.json({ error: "Erreur serveur lors de l'envoi." }, { status: 500 });
  }
}

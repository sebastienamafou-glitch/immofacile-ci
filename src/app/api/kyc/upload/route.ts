import { NextResponse } from "next/server";
import { auth } from "@/auth";

import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";
import { v4 as uuidv4 } from "uuid";


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
    // 1. SÉCURITÉ : Session Serveur (v5)
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    // 2. PARSING & VALIDATION FICHIER
    const formData = await request.formData();
    const file = formData.get("document") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Fichier trop volumineux (Max 5Mo)" }, { status: 413 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Format non supporté (PDF, JPG, PNG)." }, { status: 415 });
    }

    // 3. UPLOAD CLOUD (Vercel Blob)
    const fileExtension = file.name.split('.').pop() || "bin";
    const uniqueFileName = `kyc/${userId}/${uuidv4()}.${fileExtension}`; 

    const blob = await put(uniqueFileName, file, {
      access: 'public', 
    });

    // 4. MISE À JOUR BASE DE DONNÉES (CORRECTION SCHEMA)
    // On cible la table UserKYC, pas User
    await prisma.userKYC.upsert({
      where: { userId: userId },
      create: {
        userId: userId,
        status: "PENDING",
        documents: [blob.url], // On initialise le tableau
        idType: "CNI" // Valeur par défaut
      },
      update: {
        status: "PENDING", // On repasse en attente à chaque nouvel envoi
        documents: {
          push: blob.url // On ajoute au tableau existant
        }
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: "Document envoyé. Dossier en cours d'analyse.",
      url: blob.url
    });

  } catch (error) {
    console.error("Erreur Upload KYC:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

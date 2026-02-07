import { NextResponse } from "next/server";
import { auth } from "@/auth";

import { v2 as cloudinary } from "cloudinary";


// Configuration Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: Request) {
  try {
    // 1. SÉCURITÉ : AUTHENTIFICATION RÉELLE (Session NextAuth)
    const session = await auth();
    const userId = session?.user?.id;
    
    // Si pas de session, on rejette immédiatement
    if (!userId) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // 2. VALIDATION FICHIER
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string || "intervention"; // ex: 'kyc' ou 'intervention'

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier reçu." }, { status: 400 });
    }

    // Validation Taille (Max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: "Fichier trop volumineux (Max 5MB)." }, { status: 400 });
    }

    // ✅ VALIDATION DU TYPE (MIME TYPE WHITELIST)
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
        return NextResponse.json({ error: "Format non supporté (JPG, PNG, PDF uniquement)." }, { status: 400 });
    }

    // 3. PRÉPARATION BUFFER
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 4. LOGIQUE DE DOSSIER SÉCURISÉ
    // Si c'est du KYC, on devrait idéalement utiliser un upload "authenticated" ou "private"
    // Pour l'instant, on sépare au moins les dossiers.
    const folderPath = type === 'kyc' 
        ? "immofacile/secure_docs_kyc" // Devrait être en accès restreint côté Cloudinary
        : "immofacile/intervention_proofs";

    // 5. UPLOAD VERS CLOUDINARY
    const result = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: folderPath,
          resource_type: "auto",
          // ✅ SÉCURITÉ : On force le format pour éviter l'exécution de script
          allowed_formats: ["jpg", "png", "pdf", "webp"],
          // Métadonnées contextuelles (Audit)
          context: `uploader_id=${userId}|type=${type}` 
        },
        (error, result) => {
          if (error) {
              console.error("Erreur Cloudinary:", error);
              reject(error);
          } else {
              resolve(result);
          }
        }
      );
      uploadStream.end(buffer);
    });

    return NextResponse.json({ 
        success: true, 
        url: result.secure_url,
        format: result.format,
        original_name: result.original_filename
    });

  } catch (error) {
    console.error("Erreur API Upload:", error);
    return NextResponse.json({ error: "Erreur serveur lors de l'upload." }, { status: 500 });
  }
}

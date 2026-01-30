import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

// Configuration Cloudinary (Variables Serveur)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY || process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: Request) {
  try {
    // 1. SÉCURITÉ : AUTHENTIFICATION VIA ID (DOCTRINE N°3)
    const userId = request.headers.get("x-user-id");
    
    if (!userId) {
        return NextResponse.json({ error: "Upload non autorisé (Non identifié)." }, { status: 401 });
    }

    // 2. RÉCUPÉRATION DU FICHIER
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier reçu." }, { status: 400 });
    }

    // Validation Taille (Max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: "Fichier trop volumineux (Max 5MB)." }, { status: 400 });
    }

    // 3. TRAITEMENT DU BUFFER
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 4. UPLOAD VERS CLOUDINARY (STREAM)
    const result = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "immofacile/intervention_proofs", // Dossier spécifique propre
          resource_type: "auto",
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
      
      // Écriture sécurisée du buffer dans le stream
      uploadStream.end(buffer);
    });

    // 5. SUCCÈS
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

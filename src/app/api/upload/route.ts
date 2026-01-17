import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

// Configuration globale sécurisée
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: NextRequest) {
  try {
    // 1. SÉCURITÉ : Vérification de l'Authentification
    // On empêche les uploads anonymes pour protéger votre quota Cloudinary
    const userEmail = req.headers.get("x-user-email");
    
    if (!userEmail) {
        return NextResponse.json({ error: "Upload non autorisé. Veuillez vous connecter." }, { status: 401 });
    }

    // 2. Vérification Configuration Serveur
    if (!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_SECRET) {
        return NextResponse.json({ error: "Erreur configuration serveur (Cloudinary)" }, { status: 500 });
    }

    // 3. Récupération du fichier
    const data = await req.formData();
    const file = data.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Aucun fichier valide reçu." }, { status: 400 });
    }

    // Validation de base (Taille max 5MB pour éviter les abus)
    if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: "Fichier trop volumineux (Max 5MB)." }, { status: 400 });
    }

    // 4. Conversion et Upload
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const result = await new Promise<any>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: "immofacile/uploads", // Dossier organisé
          resource_type: "auto",        // Détection auto (Image ou PDF)
        },
        (error, result) => {
          if (error) {
              console.error("Erreur Cloudinary:", error);
              reject(error);
          } else {
              resolve(result);
          }
        }
      ).end(buffer);
    });

    // 5. Réponse succès
    return NextResponse.json({ 
        success: true, 
        url: result.secure_url,       // L'URL HTTPS à enregistrer en BDD
        format: result.format,
        original_name: result.original_filename
    });

  } catch (error) {
    console.error("Erreur API Upload:", error);
    return NextResponse.json({ error: "Erreur serveur lors de l'upload." }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

// 1. Configuration Cloudinary sécurisée
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: NextRequest) {
  try {
    // SÉCURITÉ : Vérifier que les variables d'environnement sont là
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        return NextResponse.json({ success: false, error: "Configuration Cloudinary manquante sur le serveur" }, { status: 500 });
    }

    // 2. Récupération du formulaire
    const data = await req.formData();
    const file = data.get("file");

    // SÉCURITÉ : Vérifier qu'on a bien reçu un FICHIER
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ success: false, error: "Aucun fichier valide fourni" }, { status: 400 });
    }

    // 3. Conversion en Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 4. Upload vers Cloudinary
    const result = await new Promise<any>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: "immofacile/documents", 
          resource_type: "auto", // Accepte PDF, Images, etc.
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

    // 5. Succès
    return NextResponse.json({ 
        success: true, 
        url: result.secure_url,
        format: result.format,
        original_filename: result.original_filename
    });

  } catch (error) {
    console.error("Erreur Upload:", error);
    return NextResponse.json({ success: false, error: "Erreur serveur lors de l'envoi." }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { auth } from "@/auth";

// Configuration de l'instance Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: Request) {
  try {
    // 1. Sécurité : Vérifier que l'utilisateur est connecté
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // 2. Extraction du fichier depuis le FormData
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
    }

    // 3. Conversion du fichier en Buffer lisible par Cloudinary
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 4. Upload en stream vers Cloudinary
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { 
            folder: "babimmo/incidents",
            resource_type: "auto" 
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(buffer);
    });

    // 5. Retourner l'URL sécurisée au Frontend
    return NextResponse.json({ 
        success: true, 
        url: (result as any).secure_url 
    }, { status: 200 });

  } catch (error) {
    console.error("🔥 Erreur Upload Cloudinary:", error);
    return NextResponse.json({ error: "Échec de l'upload de l'image" }, { status: 500 });
  }
}

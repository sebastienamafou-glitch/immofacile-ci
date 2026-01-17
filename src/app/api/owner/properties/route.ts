import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Singleton
import { v2 as cloudinary } from 'cloudinary';

// Configuration Cloudinary (Assurez-vous que vos variables d'env sont bien dans .env)
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Force le mode dynamique pour ne jamais avoir de cache sur la liste des biens
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. SÉCURITÉ : Auth Serveur via Middleware
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const owner = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!owner || owner.role !== "OWNER") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    // 2. RÉCUPÉRATION
    const properties = await prisma.property.findMany({
        where: { ownerId: owner.id },
        orderBy: { createdAt: 'desc' },
        include: {
            leases: { 
                where: { isActive: true },
                select: { id: true } // Optimisation : on vérifie juste s'il y a un bail actif
            }
        }
    });

    // 3. FORMATAGE
    const formatted = properties.map((p) => ({
        ...p,
        isAvailable: p.leases.length === 0, // Disponible si aucun bail actif
        leases: undefined // On nettoie l'objet renvoyé
    }));

    return NextResponse.json({ success: true, properties: formatted });

  } catch (error) {
    console.error("Erreur GET Properties:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // 1. SÉCURITÉ
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const owner = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!owner || owner.role !== "OWNER") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    // 2. TRAITEMENT DU FORMULAIRE (FormData pour gérer les fichiers)
    const formData = await request.formData();
    
    // Extraction et conversion des champs
    const title = formData.get("title") as string;
    const address = formData.get("address") as string;
    const commune = formData.get("commune") as string;
    const description = formData.get("description") as string || "";
    const price = Number(formData.get("price"));
    const type = formData.get("type") as any; // Doit matcher l'Enum PropertyType (APPARTEMENT, etc.)
    const bedrooms = Number(formData.get("bedrooms"));
    const bathrooms = Number(formData.get("bathrooms"));
    const surface = Number(formData.get("surface"));

    // Validation minimale
    if (!title || !address || !price || !type) {
        return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 });
    }

    // 3. UPLOAD DES IMAGES SUR CLOUDINARY
    const files = formData.getAll("images") as File[];
    const uploadedImages: string[] = [];

    for (const file of files) {
        if (file instanceof File && file.size > 0) {
            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            // Upload via Stream (plus robuste)
            const uploadResult = await new Promise<any>((resolve, reject) => {
                cloudinary.uploader.upload_stream(
                    { folder: "immofacile/properties" },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    }
                ).end(buffer);
            });

            if (uploadResult?.secure_url) {
                uploadedImages.push(uploadResult.secure_url);
            }
        }
    }

    // 4. CRÉATION EN BASE DE DONNÉES
    const newProperty = await prisma.property.create({
      data: {
        title,
        address,
        commune,
        price,
        type, 
        bedrooms,
        bathrooms,
        surface,
        description,
        images: uploadedImages,
        ownerId: owner.id,
        isPublished: true
      }
    });

    return NextResponse.json({ success: true, property: newProperty });

  } catch (error: any) {
    console.error("Erreur POST Property:", error);
    return NextResponse.json({ error: "Erreur lors de la création", details: error.message }, { status: 500 });
  }
}

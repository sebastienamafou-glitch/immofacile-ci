import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { v2 as cloudinary } from "cloudinary";
// ✅ IMPORT DES ENUMS
import { Role, PropertyType, ListingSource } from "@prisma/client";

export const dynamic = 'force-dynamic';

// Configuration de Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: Request) {
  try {
    // 1. SÉCURITÉ ZERO TRUST
    const session = await auth();
    const userId = session?.user?.id;
    
    if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const admin = await prisma.user.findUnique({ 
        where: { id: userId },
        select: { role: true }
    });

    if (admin?.role !== Role.SUPER_ADMIN) { // ✅ ENUM STRICT
        return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    // 2. RÉCUPÉRATION DES DONNÉES ENRICHIES
    const body = await req.json();
    // ✅ AJOUT DE "address"
    const { title, price, commune, address, type, bedrooms, bathrooms, description, fbLink, images } = body;

    if (!title || !price || !commune || !address) {
        return NextResponse.json({ error: "Données incomplètes" }, { status: 400 });
    }

    // 3. LE SYSTÈME FANTÔME
    const ghostEmail = "ghost_machine@babimmo.ci";
    let ghostOwner = await prisma.user.findUnique({ where: { email: ghostEmail } });

    if (!ghostOwner) {
        ghostOwner = await prisma.user.create({
            data: {
                name: "Démarcheur Facebook",
                email: ghostEmail,
                role: Role.OWNER, // ✅ ENUM STRICT
                isVerified: false, 
            }
        });
    }

    let finalDescription = description || "Annonce importée depuis les réseaux sociaux.";
    if (fbLink) {
        finalDescription += `\n\n---\nLien d'origine (Archives Babimmo) : ${fbLink}`;
    }

    // ==========================================
    // 🔥 UPLOAD PARALLÈLE CLOUDINARY (ANTI-TIMEOUT)
    // ==========================================
    const permanentImageUrls: string[] = [];
    
    if (Array.isArray(images) && images.length > 0) {
        // Exécution de toutes les requêtes Cloudinary en MÊME TEMPS
        const uploadPromises = images
            .filter(url => typeof url === 'string' && url.trim() !== "")
            .map(async (imageUrl) => {
                try {
                    const uploadResponse = await cloudinary.uploader.upload(imageUrl, {
                        folder: "babimmo/ghosts",
                    });
                    return uploadResponse.secure_url;
                } catch (imgError) {
                    console.error("Erreur d'aspiration Cloudinary sur une image :", imgError);
                    return imageUrl; // Fallback
                }
            });
        
        // Attente de la résolution groupée
        const results = await Promise.all(uploadPromises);
        permanentImageUrls.push(...results);
    }

    // 4. PRÉPARATION DES DONNÉES (Pour gérer la contrainte unique de fbLink)
    const propertyData: any = {
        title: title.trim(),
        price: parseInt(price, 10),
        commune: commune.trim(),
        address: address.trim(), // ✅ PRISE EN COMPTE DU FRONTEND
        type: (type as PropertyType) || PropertyType.APPARTEMENT, // ✅ ENUM STRICT
        bedrooms: parseInt(bedrooms, 10) || 1,
        bathrooms: parseInt(bathrooms, 10) || 1,
        description: finalDescription,
        images: permanentImageUrls, 
        isPublished: true,
        isAvailable: true,
        ownerId: ghostOwner.id,
        // ✅ TRAÇABILITÉ AUTOMATIQUE DE L'ASPIRATEUR
        source: ListingSource.SCRAPER, 
        isClaimed: false
    };

    // On n'ajoute originalUrl que s'il existe vraiment, pour éviter le crash de l'index @unique
    if (fbLink && fbLink.trim() !== "") {
        propertyData.originalUrl = fbLink.trim();
    }

    // 5. CRÉATION DU BIEN
    const property = await prisma.property.create({
        data: propertyData
    });

    return NextResponse.json({ 
        success: true, 
        propertyId: property.id 
    });

  } catch (error) {
    console.error("Erreur Ghost Property:", error);
    return NextResponse.json({ error: "Erreur serveur lors de la création" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    // 1. SÉCURITÉ (Super Admin uniquement)
    const session = await auth();
    const userId = session?.user?.id;
    
    if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const admin = await prisma.user.findUnique({ 
        where: { id: userId },
        select: { role: true }
    });

    if (admin?.role !== "SUPER_ADMIN") {
        return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    // 2. RÉCUPÉRATION DES DONNÉES ENRICHIES
    const body = await req.json();
    const { title, price, commune, type, bedrooms, bathrooms, description, fbLink, images } = body;

    if (!title || !price || !commune) {
        return NextResponse.json({ error: "Données incomplètes" }, { status: 400 });
    }

    // 3. LE SYSTÈME FANTÔME (Recherche ou Création du propriétaire Ghost)
    const ghostEmail = "ghost_machine@babimmo.ci";
    let ghostOwner = await prisma.user.findUnique({ where: { email: ghostEmail } });

    if (!ghostOwner) {
        ghostOwner = await prisma.user.create({
            data: {
                name: "Démarcheur Facebook",
                email: ghostEmail,
                role: "OWNER",
                isVerified: false, // On s'assure qu'il n'a pas de KYC pour déclencher le bandeau de revendication
            }
        });
    }

    // Formatage de la description avec le lien FB si présent (pour l'Admin)
    let finalDescription = description || "Annonce importée depuis les réseaux sociaux.";
    if (fbLink) {
        finalDescription += `\n\n---\nLien d'origine (Archives Babimmo) : ${fbLink}`;
    }

    // 4. CRÉATION DU BIEN EXPRESS AVEC TOUTES LES INFOS
    const property = await prisma.property.create({
        data: {
            title: title.trim(),
            price: parseInt(price, 10),
            commune: commune.trim(),
            address: "Adresse sur demande", // Valeur par défaut pour protéger le bien
            type: type || "APPARTEMENT",
            bedrooms: parseInt(bedrooms, 10) || 1,
            bathrooms: parseInt(bathrooms, 10) || 1,
            description: finalDescription,
            images: Array.isArray(images) ? images : [], // Accepte désormais les tableaux multiples
            isPublished: true,
            isAvailable: true,
            ownerId: ghostOwner.id
        }
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

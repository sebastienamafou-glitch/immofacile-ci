import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { PropertyType, ListingSource, Role } from "@prisma/client";

// ✅ VALIDATION STRICTE (Anti-crash et Zéro Any)
const ingestSchema = z.object({
  title: z.string().min(5),
  description: z.string().optional(),
  price: z.number().positive(),
  address: z.string(),
  commune: z.string(),
  type: z.nativeEnum(PropertyType),
  bedrooms: z.number().int().nonnegative().default(0),
  bathrooms: z.number().int().nonnegative().default(0),
  surface: z.number().positive().optional(),
  images: z.array(z.string().url()).default([]),
  originalUrl: z.string().url(),
  source: z.nativeEnum(ListingSource).default("MAKE_COM"),
});

export async function POST(req: Request) {
  try {
    // 1. 🛡️ SÉCURITÉ : Vérification de la clé secrète d'ingestion
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.INGEST_SECRET_KEY}`) {
      return NextResponse.json({ error: "Accès refusé. Clé API invalide." }, { status: 401 });
    }

    const body = await req.json();
    const parsedData = ingestSchema.safeParse(body);

    if (!parsedData.success) {
      return NextResponse.json(
        { error: "Format de données invalide", details: parsedData.error.format() }, 
        { status: 400 }
      );
    }

    const data = parsedData.data;

    // 2. 🛑 ANTI-DOUBLON : On stoppe si l'annonce existe déjà
    const existing = await prisma.property.findUnique({
      where: { originalUrl: data.originalUrl },
      select: { id: true }
    });

    if (existing) {
      return NextResponse.json({ message: "Doublon ignoré", id: existing.id }, { status: 200 });
    }

    // 3. 👻 UTILISATEUR FANTÔME : Attribution au compte système
    let ghostUser = await prisma.user.findUnique({ where: { email: "system@babimmo.ci" } });
    
    if (!ghostUser) {
      ghostUser = await prisma.user.create({
        data: {
          name: "Babimmo Bot",
          email: "system@babimmo.ci",
          role: Role.SUPER_ADMIN,
          isVerified: true,
        }
      });
    }

    // 4. 🌐 SEO PROGRAMMATIQUE : Génération du slug dynamique
    const baseSlug = `${data.type}-${data.commune}-${data.title}`
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Enlève les accents
      .replace(/[^a-z0-9]+/g, "-") // Remplace espaces et caractères spéciaux par des tirets
      .replace(/(^-|-$)+/g, ""); // Nettoie les tirets en début/fin
      
    const uniqueHash = Math.random().toString(36).substring(2, 8);
    const seoSlug = `${baseSlug}-${uniqueHash}`;

    // 5. 🏗️ INJECTION EN BASE DE DONNÉES
    const property = await prisma.property.create({
      data: {
        title: data.title,
        description: data.description,
        price: data.price,
        address: data.address,
        commune: data.commune,
        type: data.type,
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        surface: data.surface,
        images: data.images,
        originalUrl: data.originalUrl,
        source: data.source,
        isClaimed: false,    // 🎯 CRUCIAL : Marqué comme "À revendiquer"
        seoSlug: seoSlug,
        isPublished: true,   // Publié immédiatement pour Google
        isAvailable: true,
        ownerId: ghostUser.id,
      },
    });

    return NextResponse.json(
      { success: true, id: property.id, slug: property.seoSlug }, 
      { status: 201 }
    );

  } catch (error) {
    console.error("🔥 Erreur Ingestion Webhook:", error);
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
  }
}

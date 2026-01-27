import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// ==========================================
// 1. GET : LISTER LES ARTISANS
// ==========================================
export async function GET(request: Request) {
  try {
    // 1. SÉCURITÉ ZERO TRUST (Via ID)
    const userId = request.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    // 2. RÉCUPÉRATION
    // Note: Ici on récupère tous les utilisateurs "ARTISAN" de la plateforme.
    // Dans une version future "Private Network", on filtrera sur une table de relation OwnerArtisan.
    const artisans = await prisma.user.findMany({
      where: { 
        role: 'ARTISAN',
        isActive: true
      },
      select: {
        id: true,
        name: true,
        jobTitle: true,
        phone: true,
        address: true,
        email: true,
      },
      orderBy: { name: 'asc' }
    });

    // Mapping propre
    const formattedArtisans = artisans.map(a => ({
        id: a.id,
        name: a.name || "Artisan sans nom",
        job: a.jobTitle || "AUTRE",
        phone: a.phone || "",
        location: a.address || "Abidjan",
        email: a.email,
        rating: 5.0 // Placeholder pour future feature de notation
    }));

    return NextResponse.json({ success: true, artisans: formattedArtisans });

  } catch (error) {
    console.error("API Artisans Error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// ==========================================
// 2. POST : CRÉER UN NOUVEL ARTISAN
// ==========================================
export async function POST(request: Request) {
  try {
    // 1. SÉCURITÉ ZERO TRUST
    const userId = request.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const body = await request.json();
    const { name, job, phone, location, email } = body;

    // Validation des champs requis
    if (!name || !job || !phone) {
        return NextResponse.json({ error: "Le nom, le métier et le téléphone sont obligatoires." }, { status: 400 });
    }

    // 2. VÉRIFICATION DOUBLON (Conflit)
    const existing = await prisma.user.findFirst({
        where: { OR: [{ phone }, { email: email || undefined }] }
    });

    if (existing) {
        return NextResponse.json({ error: "Ce numéro de téléphone ou cet email est déjà enregistré." }, { status: 409 });
    }

    // 3. CRÉATION
    const newArtisan = await prisma.user.create({
        data: {
            name,
            jobTitle: job.toUpperCase(), // Standardisation
            phone,              
            address: location || "Abidjan", 
            email: email || null,
            role: 'ARTISAN',
            isAvailable: true,
            isActive: true,
            // On pourrait ajouter ici : createdBy: userId (si le schéma le supporte)
        }
    });

    return NextResponse.json({ 
        success: true, 
        artisan: {
            id: newArtisan.id,
            name: newArtisan.name,
            job: newArtisan.jobTitle,
            phone: newArtisan.phone,
            location: newArtisan.address,
            rating: 5.0
        } 
    });

  } catch (error) {
    console.error("Erreur création artisan:", error);
    return NextResponse.json({ error: "Erreur serveur lors de la création." }, { status: 500 });
  }
}

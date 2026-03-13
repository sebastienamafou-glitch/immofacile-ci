import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Role } from "@prisma/client";

export const dynamic = 'force-dynamic';

// 1. SCHÉMA DE VALIDATION (POST)
const createArtisanSchema = z.object({
  name: z.string().min(2, "Le nom est requis"),
  jobTitle: z.string().min(2, "Le métier est requis").transform(val => val.toUpperCase()),
  phone: z.string().min(8, "Numéro de téléphone invalide"),
  address: z.string().optional().default("Abidjan"),
  email: z.string().email("Email invalide").optional().or(z.literal(''))
});

// ==========================================
// 1. GET : LISTER LES ARTISANS
// ==========================================
export async function GET(request: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    
    // Seuls les propriétaires, agences et admins peuvent lister le catalogue d'artisans
    if (user?.role !== Role.OWNER && user?.role !== Role.AGENCY_ADMIN && user?.role !== Role.SUPER_ADMIN) {
        return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const artisans = await prisma.user.findMany({
      where: { 
        role: Role.ARTISAN,
        isActive: true
      },
      select: {
        id: true,
        name: true,
        jobTitle: true, // Cohérence avec le frontend garantie
        phone: true,
        address: true,
        email: true,
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json({ success: true, artisans });

  } catch (error) {
    console.error("[API_ARTISANS_GET]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// ==========================================
// 2. POST : AJOUTER UN ARTISAN (Réseau privé)
// ==========================================
export async function POST(request: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    
    if (user?.role !== Role.OWNER && user?.role !== Role.AGENCY_ADMIN && user?.role !== Role.SUPER_ADMIN) {
        return NextResponse.json({ error: "Seul un gestionnaire peut ajouter un artisan." }, { status: 403 });
    }

    const body = await request.json();
    const validation = createArtisanSchema.safeParse(body);

    if (!validation.success) {
        return NextResponse.json({ error: "Données invalides", details: validation.error.format() }, { status: 400 });
    }

    const { name, jobTitle, phone, address, email } = validation.data;

    // Vérification stricte des doublons
    const existing = await prisma.user.findFirst({
        where: { 
            OR: [
                { phone }, 
                ...(email ? [{ email }] : [])
            ] 
        }
    });

    if (existing) {
        return NextResponse.json({ error: "Ce numéro de téléphone ou cet email est déjà utilisé." }, { status: 409 });
    }

    // Création
    const newArtisan = await prisma.user.create({
        data: {
            name,
            jobTitle, 
            phone,              
            address, 
            email: email || null,
            role: Role.ARTISAN,
            isAvailable: true,
            isActive: true,
        },
        select: {
            id: true,
            name: true,
            jobTitle: true,
            phone: true,
            address: true
        }
    });

    return NextResponse.json({ success: true, artisan: newArtisan });

  } catch (error) {
    console.error("[API_ARTISANS_POST]", error);
    return NextResponse.json({ error: "Erreur serveur lors de la création." }, { status: 500 });
  }
}

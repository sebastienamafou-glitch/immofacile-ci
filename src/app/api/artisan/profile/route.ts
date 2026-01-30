import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// 1. GET : LIRE LE PROFIL
export async function GET(request: Request) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const artisan = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        phone: true,
        jobTitle: true,
        address: true,
        isAvailable: true,
        role: true
      }
    });

    if (!artisan || artisan.role !== "ARTISAN") {
        return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    return NextResponse.json(artisan);

  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// 2. PUT : METTRE À JOUR LE PROFIL (Infos + Disponibilité)
export async function PUT(request: Request) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const body = await request.json();
    const { name, phone, jobTitle, address, isAvailable } = body;

    // Validation basique
    if (!name || !phone) {
        return NextResponse.json({ error: "Nom et téléphone requis" }, { status: 400 });
    }

    const updatedArtisan = await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        phone,
        jobTitle,
        address,
        isAvailable: isAvailable // Gère aussi le toggle ON/OFF
      }
    });

    return NextResponse.json({ success: true, user: updatedArtisan });

  } catch (error) {
    console.error("Update Profile Error:", error);
    return NextResponse.json({ error: "Erreur mise à jour" }, { status: 500 });
  }
}

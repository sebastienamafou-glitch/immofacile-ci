import { NextResponse } from "next/server";
import { auth } from "@/auth";

import { prisma } from "@/lib/prisma"; // Singleton

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // 1. SÉCURITÉ AUTH
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    // 2. RÉCUPÉRATION & CHECK RÔLE
    const user = await prisma.user.findUnique({ where: { email: userEmail } });

    // On autorise Artisans et Agents à se mettre en "Disponible"
    if (!user || (user.role !== "ARTISAN" && user.role !== "AGENT")) {
        return NextResponse.json({ error: "Action réservée aux professionnels." }, { status: 403 });
    }

    // 3. VALIDATION
    const body = await request.json();
    const { available } = body;

    if (typeof available !== 'boolean') {
        return NextResponse.json({ error: "Format invalide (true/false requis)" }, { status: 400 });
    }

    // 4. MISE À JOUR
    await prisma.user.update({
        where: { id: user.id },
        data: { isAvailable: available }
    });

    return NextResponse.json({ success: true, isAvailable: available });

  } catch (error) {
    console.error("Erreur Availability:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

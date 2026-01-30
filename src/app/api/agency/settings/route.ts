import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request) {
  try {
    // 1. SÉCURITÉ ZERO TRUST (ID injecté par Middleware)
    const userId = req.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    // 2. VÉRIFICATION RÔLE VIA ID
    const admin = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, agencyId: true }
    });

    if (!admin || !admin.agencyId || (admin.role !== "AGENCY_ADMIN" && admin.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Accès réservé aux administrateurs." }, { status: 403 });
    }

    const body = await req.json();

    // 3. MISE À JOUR SÉCURISÉE
    if (!body.name) {
        return NextResponse.json({ error: "Le nom de l'agence est obligatoire" }, { status: 400 });
    }

    const updatedAgency = await prisma.agency.update({
      where: { id: admin.agencyId },
      data: {
        name: body.name,
        email: body.email,
        phone: body.phone,
        taxId: body.taxId,
        primaryColor: body.primaryColor,
        logoUrl: body.logoUrl, // String ou null
      }
    });

    return NextResponse.json({ success: true, agency: updatedAgency });

  } catch (error) {
    console.error("Agency Settings Error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request) {
  try {
    const userEmail = req.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const admin = await prisma.user.findUnique({
      where: { email: userEmail },
      include: { agency: true }
    });

    if (!admin || admin.role !== "AGENCY_ADMIN" || !admin.agencyId) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const body = await req.json();

    // Validation basique
    if (!body.name) {
        return NextResponse.json({ error: "Le nom de l'agence est obligatoire" }, { status: 400 });
    }

    // Mise à jour Agence
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

import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { verifyToken } from "@/lib/auth";

const prisma = new PrismaClient();

export async function PUT(request: Request) {
  try {
    const userAuth = verifyToken(request);
    const body = await request.json();

    // On met à jour uniquement les champs d'identité
    const updatedUser = await prisma.user.update({
      where: { id: userAuth.id },
      data: {
        name: body.name,
        email: body.email,
        phone: body.phone,
        address: body.address // Ce champ existe maintenant
      }
    });

    return NextResponse.json({ success: true, user: updatedUser });

  } catch (error) {
    console.error("Erreur Update Profile:", error);
    return NextResponse.json({ error: "Erreur lors de la mise à jour du profil" }, { status: 500 });
  }
}

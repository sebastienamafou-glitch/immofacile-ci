import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(request: Request) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const body = await request.json();
    const { name, email, phone, address } = body;

    // Mise à jour
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { name, email, phone, address }
    });

    return NextResponse.json({ success: true, user: updatedUser });

  } catch (error: any) {
    console.error("Update Profile Error:", error);
    
    // Gestion des doublons (Unique constraint)
    if (error.code === 'P2002') {
        const target = error.meta?.target;
        if (Array.isArray(target)) {
            if (target.includes('email')) return NextResponse.json({ error: "Cet email est déjà pris." }, { status: 409 });
            if (target.includes('phone')) return NextResponse.json({ error: "Ce téléphone est déjà pris." }, { status: 409 });
        }
        return NextResponse.json({ error: "Email ou Téléphone déjà utilisé." }, { status: 409 });
    }

    return NextResponse.json({ error: "Erreur mise à jour" }, { status: 500 });
  }
}

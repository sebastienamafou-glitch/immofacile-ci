import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // ✅ Correction : On utilise le Singleton

export const dynamic = 'force-dynamic';

export async function PUT(request: Request) {
  try {
    // 1. SÉCURITÉ (Pattern standardisé)
    // On utilise le header injecté par le middleware ou la session, plus sûr.
    const userEmail = request.headers.get("x-user-email");
    
    if (!userEmail) {
        return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // 2. RÉCUPÉRATION USER
    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

    // 3. TRAITEMENT DONNÉES
    const body = await request.json();
    const { name, email, phone, address } = body;

    // 4. MISE À JOUR SÉCURISÉE
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: name || user.name,
        email: email || user.email,
        phone: phone || user.phone,
        address: address || user.address
      }
    });

    return NextResponse.json({ success: true, user: updatedUser });

  } catch (error: any) {
    console.error("Erreur Update Profile:", error);

    // ✅ GESTION DOUBLONS (P2002)
    // Si l'utilisateur essaie de mettre un email ou tel qui existe déjà ailleurs
    if (error.code === 'P2002') {
        const target = error.meta?.target;
        if (target && target.includes('email')) {
            return NextResponse.json({ error: "Cet email est déjà utilisé par un autre compte." }, { status: 409 });
        }
        if (target && target.includes('phone')) {
            return NextResponse.json({ error: "Ce numéro de téléphone est déjà utilisé." }, { status: 409 });
        }
        return NextResponse.json({ error: "Email ou Téléphone déjà pris." }, { status: 409 });
    }

    return NextResponse.json({ error: "Erreur lors de la mise à jour du profil" }, { status: 500 });
  }
}

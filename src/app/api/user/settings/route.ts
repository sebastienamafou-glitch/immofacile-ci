import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash, compare } from "bcryptjs"; // N'oubliez pas: npm install bcryptjs

export const dynamic = 'force-dynamic';

// =============================================================================
// 1. GET : CHARGER LES INFOS (Votre code validé)
// =============================================================================
export async function GET(request: Request) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        jobTitle: true,      // Ajouté pour les pros
        paymentMethod: true, // Ajouté pour les paiements
        paymentNumber: true, // Ajouté pour les paiements
        role: true,          // Utile pour l'affichage conditionnel
        image: true,
      }
    });

    return NextResponse.json(user); // Renvoie directement l'objet user

  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// =============================================================================
// 2. PATCH : MISE À JOUR (Le moteur du formulaire)
// =============================================================================
export async function PATCH(request: Request) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const body = await request.json();
    const { 
        name, phone, address, jobTitle, 
        paymentMethod, paymentNumber, 
        currentPassword, newPassword 
    } = body;

    // --- GESTION SÉCURISÉE DU MOT DE PASSE ---
    let passwordUpdate = {};
    if (newPassword && currentPassword) {
        // 1. On récupère le hash actuel
        const user = await prisma.user.findUnique({ where: { id: userId } });
        
        if (!user || !user.password) {
             return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
        }

        // 2. On vérifie l'ancien mot de passe
        const isValid = await compare(currentPassword, user.password);
        if (!isValid) {
            return NextResponse.json({ error: "Mot de passe actuel incorrect" }, { status: 403 });
        }

        // 3. On hash le nouveau
        const hashedPassword = await hash(newPassword, 12);
        passwordUpdate = { password: hashedPassword };
    }

    // --- MISE À JOUR BASE DE DONNÉES ---
    const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
            name,
            phone,
            address,
            jobTitle,
            paymentMethod,
            paymentNumber,
            ...passwordUpdate // N'est appliqué que si le mot de passe change
        },
        select: {
            id: true, name: true, email: true // On renvoie le strict minimum pour confirmer
        }
    });

    return NextResponse.json({ success: true, user: updatedUser });

  } catch (error) {
    console.error("Update Error:", error);
    return NextResponse.json({ error: "Erreur lors de la mise à jour" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { auth } from "@/auth";

import { prisma } from "@/lib/prisma";
import { hash, compare } from "bcryptjs"; 


export const dynamic = 'force-dynamic';

// =============================================================================
// 1. GET : CHARGER LES INFOS
// =============================================================================
export async function GET(request: Request) {
  try {
    // 1. SÉCURITÉ BLINDÉE (Auth v5)
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        jobTitle: true,      
        // ❌ SUPPRIMÉS : Ces champs n'existent plus sur User (Architecture v5)
        // paymentMethod: true, 
        // paymentNumber: true, 
        role: true,          
        image: true,
      }
    });

    return NextResponse.json(user);

  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// =============================================================================
// 2. PATCH : MISE À JOUR
// =============================================================================
export async function PATCH(request: Request) {
  try {
    // 1. SÉCURITÉ BLINDÉE (Auth v5)
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const body = await request.json();
    const { 
        name, phone, address, jobTitle, 
        // paymentMethod, paymentNumber, // On ignore ces champs obsolètes
        currentPassword, newPassword 
    } = body;

    // --- GESTION SÉCURISÉE DU MOT DE PASSE ---
    let passwordUpdate = {};
    if (newPassword && currentPassword) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        
        if (!user || !user.password) {
             return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
        }

        const isValid = await compare(currentPassword, user.password);
        if (!isValid) {
            return NextResponse.json({ error: "Mot de passe actuel incorrect" }, { status: 403 });
        }

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
            // On ne met plus à jour les méthodes de paiement ici
            ...passwordUpdate 
        },
        select: {
            id: true, name: true, email: true
        }
    });

    return NextResponse.json({ success: true, user: updatedUser });

  } catch (error) {
    console.error("Update Error:", error);
    return NextResponse.json({ error: "Erreur lors de la mise à jour" }, { status: 500 });
  }
}

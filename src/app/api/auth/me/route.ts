import { NextResponse } from "next/server";
import { auth } from "@/auth";

import { prisma } from "@/lib/prisma";


export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. SÉCURITÉ : Session Serveur (v5)
    const session = await auth();
    const userId = session?.user?.id;
    
    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    // 2. RÉCUPÉRATION DONNÉES (CORRECTION SCHEMA)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        image: true,
        role: true,
        
        // ✅ ON VA CHERCHER LES INFOS BANCAIRES DANS FINANCE
        finance: {
            select: {
                paymentMethod: true,
                paymentNumber: true,
                walletBalance: true
            }
        },
        
        // On inclut aussi le statut KYC
        kyc: {
            select: { status: true }
        }
      }
    });

    if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

    // 3. REMAPPING (Pour garder le format attendu par le front)
    const formattedUser = {
        ...user,
        paymentMethod: user.finance?.paymentMethod || null,
        paymentNumber: user.finance?.paymentNumber || null,
        walletBalance: user.finance?.walletBalance || 0,
        kycStatus: user.kyc?.status || "PENDING",
        finance: undefined, // On nettoie les objets imbriqués
        kyc: undefined
    };

    return NextResponse.json({ success: true, user: formattedUser });

  } catch (error) {
    console.error("API ME Error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

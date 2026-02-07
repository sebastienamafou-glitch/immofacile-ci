import { NextResponse } from "next/server";
import { auth } from "@/auth";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { sendCredentialsEmail } from "@/lib/mail";


export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // 1. SÉCURITÉ : Session Serveur (v5)
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const admin = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true }
    });

    if (!admin || admin.role !== "SUPER_ADMIN") {
        return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    // 2. VALIDATION DONNÉES
    const body = await request.json();
    const { name, email, phone, backerTier, initialAmount } = body;

    if (!name || !email || !backerTier) {
        return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 });
    }

    const rawPassword = Math.random().toString(36).slice(-8) + "Invest!";
    const hashedPassword = await bcrypt.hash(rawPassword, 10);
    const amount = initialAmount ? parseInt(initialAmount) : 0;

    // 3. CRÉATION ATOMIQUE (USER + FINANCE + KYC + TRANSACTION)
    const investor = await prisma.$transaction(async (tx) => {
        // A. Création de l'utilisateur avec ses coffres-forts
        const newUser = await tx.user.create({
            data: {
                name,
                email,
                phone: phone || null,
                password: hashedPassword,
                role: "INVESTOR",
                isActive: true,
                backerTier: backerTier,
                
                // ✅ INIT KYC (Validé par l'admin)
                kyc: {
                    create: {
                        status: "VERIFIED",
                        documents: [] // Pas de docs requis si créé par Admin
                    }
                },

                // ✅ INIT FINANCE (Capital de départ)
                finance: {
                    create: {
                        walletBalance: amount,
                        version: 1,
                        kycTier: 3 // VIP
                    }
                }
            }
        });

        // B. Enregistrement de la transaction initiale (si montant > 0)
        if (amount > 0) {
            await tx.transaction.create({
                data: {
                    userId: newUser.id,
                    amount: amount,
                    type: "CREDIT",
                    balanceType: "WALLET", // ✅ Champ obligatoire
                    reason: "CAPITAL_INITIAL_ADMIN",
                    status: "SUCCESS"
                }
            });
        }

        return newUser;
    });

    // 4. ENVOI EMAIL (Hors transaction pour ne pas bloquer)
    try {
        if (investor.email) {
            await sendCredentialsEmail(
                investor.email,
                investor.name || "Partenaire", 
                rawPassword, 
                "INVESTOR"
            );
            console.log(`[MAIL] Envoyé à ${investor.email}`);
        }
    } catch (mailError) {
        console.error("[MAIL ERROR]", mailError);
    }

    return NextResponse.json({
        success: true,
        credentials: {
            email: investor.email,
            password: rawPassword,
            tier: investor.backerTier
        }
    });

  } catch (error: any) {
    console.error("API INVESTOR ERROR:", error);
    if (error.code === 'P2002') return NextResponse.json({ error: "Cet email existe déjà." }, { status: 409 });
    return NextResponse.json({ error: "Erreur technique." }, { status: 500 });
  }
}

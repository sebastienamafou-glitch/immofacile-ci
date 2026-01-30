import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { sendCredentialsEmail } from "@/lib/mail";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const admin = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true }
    });

    if (!admin || admin.role !== "SUPER_ADMIN") {
        return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, phone, backerTier, initialAmount } = body;

    if (!name || !email || !backerTier) {
        return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 });
    }

    const rawPassword = Math.random().toString(36).slice(-8) + "Invest!";
    const hashedPassword = await bcrypt.hash(rawPassword, 10);
    const amount = initialAmount ? parseInt(initialAmount) : 0;

    const investor = await prisma.user.create({
        data: {
            name,
            email,
            phone: phone || null,
            password: hashedPassword,
            role: "INVESTOR",
            kycStatus: "VERIFIED",
            isVerified: true,
            isActive: true,
            backerTier: backerTier,
            walletBalance: amount
        }
    });

    if (amount > 0) {
        await prisma.transaction.create({
            data: {
                userId: investor.id,
                amount: amount,
                type: "CREDIT",
                reason: "CAPITAL_INITIAL_ADMIN",
                status: "SUCCESS"
            }
        });
    }

    // ✅ CORRECTION DU CRASH DE BUILD ICI
    try {
        if (investor.email) { // On vérifie que l'email existe pour rassurer TypeScript
            await sendCredentialsEmail(
                investor.email, // TypeScript est maintenant content
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
    console.error("API ERROR:", error);
    if (error.code === 'P2002') return NextResponse.json({ error: "Cet email existe déjà." }, { status: 409 });
    return NextResponse.json({ error: "Erreur technique." }, { status: 500 });
  }
}

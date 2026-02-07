import { NextResponse } from "next/server";
import { auth } from "@/auth";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";


export const dynamic = 'force-dynamic';

// --- HELPER SÉCURITÉ (MIGRATION v5) ---
async function checkSuperAdmin() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const admin = await prisma.user.findUnique({ 
    where: { id: userId },
    select: { id: true, role: true } 
  });

  if (!admin || admin.role !== "SUPER_ADMIN") return null;
  return admin;
}

// =====================================================================
// GET : LISTER LES ARTISANS
// =====================================================================
export async function GET(request: Request) {
  try {
    const admin = await checkSuperAdmin();
    if (!admin) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

    const artisans = await prisma.user.findMany({
      where: { role: "ARTISAN" },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        jobTitle: true,
        createdAt: true,
        isActive: true,
        
        // ✅ CORRECTION SCHEMA : On passe par la relation KYC
        kyc: {
            select: { status: true }
        },
        
        _count: {
            select: { incidentsAssigned: true }
        }
      }
    });

    // Remapping pour le frontend
    const formattedArtisans = artisans.map(a => ({
        ...a,
        kycStatus: a.kyc?.status || "PENDING", // Valeur par défaut
        kyc: undefined
    }));

    return NextResponse.json({ success: true, artisans: formattedArtisans });

  } catch (error) {
    console.error("[API_ARTISANS_GET]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// =====================================================================
// POST : ENRÔLER UN ARTISAN
// =====================================================================
export async function POST(request: Request) {
  try {
    const admin = await checkSuperAdmin();
    if (!admin) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

    const body = await request.json();
    if (!body.name || !body.phone) {
        return NextResponse.json({ error: "Nom et téléphone requis" }, { status: 400 });
    }

    // Génération Mot de Passe Fort
    const rawPassword = Math.random().toString(36).slice(-8) + "Pro!";
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    // Email Technique (si absent)
    const emailToUse = body.email && body.email.trim() !== "" 
        ? body.email 
        : `artisan-${body.phone.replace(/\s/g, '')}@immofacile.pro`;

    // CRÉATION ATOMIQUE (USER + FINANCE + KYC)
    const newArtisan = await prisma.user.create({
        data: {
            name: body.name,
            phone: body.phone,
            email: emailToUse,
            jobTitle: body.job || "Technicien Polyvalent",
            password: hashedPassword,
            role: "ARTISAN",
            isActive: true,
            
            // ✅ INIT KYC (Validé d'office par l'admin)
            kyc: {
                create: {
                    status: "VERIFIED",
                    documents: []
                }
            },
            
            // ✅ INIT FINANCE (Obligatoire)
            finance: {
                create: {
                    walletBalance: 0,
                    version: 1,
                    kycTier: 2
                }
            }
        }
    });

    return NextResponse.json({ 
        success: true, 
        credentials: {
            name: newArtisan.name,
            phone: newArtisan.phone,
            email: emailToUse,
            password: rawPassword 
        }
    });

  } catch (error: any) {
    console.error("[API_ARTISANS_POST]", error);
    
    if (error.code === 'P2002') {
        return NextResponse.json({ error: "Ce numéro ou cet email existe déjà." }, { status: 409 });
    }

    return NextResponse.json({ error: "Erreur technique." }, { status: 500 });
  }
}

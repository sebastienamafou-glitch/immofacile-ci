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

// ==========================================
// 1. GET : LISTER LES AGENTS
// ==========================================
export async function GET(request: Request) {
  try {
    const admin = await checkSuperAdmin();
    if (!admin) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

    const agents = await prisma.user.findMany({
      where: { role: "AGENT" },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
        
        // ✅ CORRECTION SCHEMA : On passe par la relation KYC
        kyc: {
            select: { status: true }
        },
        
        // KPI Agents
        _count: {
          select: { 
              missionsAccepted: true, 
              leads: true 
          }
        }
      }
    });

    // Remapping pour le frontend
    const formattedAgents = agents.map(a => ({
        ...a,
        kycStatus: a.kyc?.status || "PENDING", // Valeur par défaut
        kyc: undefined
    }));

    return NextResponse.json({ success: true, agents: formattedAgents });

  } catch (error) {
    console.error("[API_AGENTS_GET]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// ==========================================
// 2. POST : RECRUTER UN AGENT
// ==========================================
export async function POST(request: Request) {
  try {
    const admin = await checkSuperAdmin();
    if (!admin) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

    const body = await request.json();
    if (!body.email || !body.password || !body.name) {
        return NextResponse.json({ error: "Champs obligatoires manquants." }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(body.password, 10);
    const phoneToSave = body.phone && body.phone.trim() !== "" ? body.phone : undefined;

    // CRÉATION ATOMIQUE (USER + FINANCE + KYC)
    const newAgent = await prisma.user.create({
        data: {
            email: body.email,
            phone: phoneToSave,
            name: body.name,
            password: hashedPassword,
            role: "AGENT",
            isActive: true, // Si ce champ existe toujours sur User
            
            // ✅ INIT KYC (Directement validé car créé par l'Admin)
            kyc: {
                create: {
                    status: "VERIFIED", // L'admin valide d'office
                    documents: [] 
                }
            },

            // ✅ INIT FINANCE (Obligatoire)
            finance: {
                create: {
                    walletBalance: 0,
                    version: 1,
                    kycTier: 3 // Tier max pour les agents internes
                }
            }
        }
    });

    // Nettoyage réponse
    // @ts-ignore
    const { password, ...agentSafe } = newAgent;

    return NextResponse.json({ success: true, agent: agentSafe });

  } catch (error: any) {
    console.error("[API_AGENTS_POST]", error);

    if (error.code === 'P2002') {
        return NextResponse.json({ error: "Email ou Téléphone déjà existant." }, { status: 409 });
    }
    
    return NextResponse.json({ error: "Erreur technique lors de la création." }, { status: 500 });
  }
}

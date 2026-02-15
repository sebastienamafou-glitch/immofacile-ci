import { NextResponse } from "next/server";
import { auth } from "@/auth"; // ✅ On utilise auth() pour la cohérence
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    // 1. SÉCURITÉ : Authentification Robuste
    const session = await auth();
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    
    // Vérification du rôle (Si nécessaire, sinon retirez cette ligne)
    // if (!user || user.role !== "TENANT") { ... }

    const body = await request.json();
    const { leaseId, signatureData } = body; // ✅ On récupère le dessin de signature

    if (!leaseId) return NextResponse.json({ error: "ID du bail manquant" }, { status: 400 });

    // 2. VÉRIFICATION DU BAIL
    const lease = await prisma.lease.findUnique({
        where: { id: leaseId },
        include: { tenant: true }
    });

    // Sécurité : On vérifie que c'est bien SON bail
    if (!lease || lease.tenantId !== user?.id) {
        return NextResponse.json({ error: "Bail introuvable ou accès refusé" }, { status: 403 });
    }

    if (lease.signatureStatus !== "PENDING") {
        return NextResponse.json({ error: "Ce document est déjà signé." }, { status: 400 });
    }

    // 3. CAPTURE DES MÉTADONNÉES LÉGALES (Pour le PDF)
    const ipAddress = request.headers.get("x-forwarded-for") || "IP_INCONNUE";
    const userAgent = request.headers.get("user-agent") || "Device Inconnu"; // ✅ Capture du Device

    // 4. CRÉATION DU HASH (Empreinte numérique)
    const signatureString = `${lease.id}-${user.id}-${new Date().toISOString()}-${process.env.AUTH_SECRET}`;
    const documentHash = crypto.createHash('sha256').update(signatureString).digest('hex').toUpperCase();

    // 5. TRANSACTION ATOMIQUE
    const updatedLease = await prisma.$transaction(async (tx) => {
        
        // A. Créer la preuve juridique COMPLÈTE
        await tx.signatureProof.create({
            data: {
                leaseId: lease.id,
                signerId: user.id,
                ipAddress: ipAddress,
                userAgent: userAgent, // ✅ On stocke le device
                signatureData: signatureData, // ✅ On stocke le dessin (Base64)
                signedAt: new Date(),
                documentType: "LEASE"
            }
        });

        // B. Activer le bail
        return await tx.lease.update({
            where: { id: lease.id },
            data: {
                signatureStatus: "SIGNED_TENANT", 
                documentHash: documentHash,       
                isActive: true,                   
                status: "ACTIVE",                 
                updatedAt: new Date()
            }
        });
    });

    return NextResponse.json({ 
        success: true, 
        message: "Signature enregistrée. Contrat scellé.",
        hash: updatedLease.documentHash,
        date: updatedLease.updatedAt
    });

  } catch (error) {
    console.error("Erreur Signature:", error);
    return NextResponse.json({ error: "Erreur serveur lors de la signature" }, { status: 500 });
  }
}

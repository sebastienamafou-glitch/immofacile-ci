import { NextResponse } from "next/server";
import { auth } from "@/auth";

import { prisma } from "@/lib/prisma"; // ✅ Singleton Obligatoire
import { Prisma } from "@prisma/client";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    // 1. SÉCURITÉ : Via Middleware (Headers)
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    
    // Vérification stricte du rôle
    if (!user || user.role !== "TENANT") {
        return NextResponse.json({ error: "Seul un locataire peut signer ce document." }, { status: 403 });
    }

    const body = await request.json();
    const { leaseId } = body;

    if (!leaseId) return NextResponse.json({ error: "ID du bail manquant" }, { status: 400 });

    // 2. VÉRIFICATION DU BAIL
    const lease = await prisma.lease.findUnique({
        where: { id: leaseId },
        include: { tenant: true }
    });

    // On vérifie que le bail appartient bien à l'utilisateur connecté
    if (!lease || lease.tenantId !== user.id) {
        return NextResponse.json({ error: "Bail introuvable ou accès refusé" }, { status: 403 });
    }

    if (lease.signatureStatus !== "PENDING") {
        return NextResponse.json({ error: "Ce document est déjà signé." }, { status: 400 });
    }

    // 3. CRÉATION DE L'EMPREINTE NUMÉRIQUE (HASH SHA-256)
    // On ajoute un salt secret pour garantir l'intégrité
    const signatureString = `${lease.id}-${user.id}-${new Date().toISOString()}-${process.env.JWT_SECRET}`;
    const documentHash = crypto.createHash('sha256').update(signatureString).digest('hex').toUpperCase();

    // 4. TRANSACTION ATOMIQUE (Tout ou rien)
    const updatedLease = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        
        // A. Créer la preuve juridique (IP + Timestamp)
        await tx.signatureProof.create({
            data: {
                leaseId: lease.id,
                signerId: user.id,
                // Récupération IP compatible Vercel/Proxies
                ipAddress: request.headers.get("x-forwarded-for") || "IP_INCONNUE",
                signedAt: new Date() 
            }
        });

        // B. Activer le bail
        return await tx.lease.update({
            where: { id: lease.id },
            data: {
                signatureStatus: "SIGNED_TENANT", // Marqué comme signé
                documentHash: documentHash,       // Hash immuable
                isActive: true,                   // Le bail devient actif
                status: "ACTIVE",                 
                updatedAt: new Date()
            }
        });
    });

    return NextResponse.json({ 
        success: true, 
        message: "Signature enregistrée avec succès. Le bail est actif.",
        hash: updatedLease.documentHash,
        date: updatedLease.updatedAt
    });

  } catch (error) {
    console.error("Erreur Signature:", error);
    return NextResponse.json({ error: "Erreur serveur lors de la signature" }, { status: 500 });
  }
}

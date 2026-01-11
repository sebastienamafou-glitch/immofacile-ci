import { NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client"; 
import { verifyToken } from "@/lib/auth"; // ✅ On utilise la sécurité centrale
import crypto from "crypto";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    // 1. SÉCURITÉ : On vérifie le Token JWT (Inviolable)
    let userId;
    try {
      const user = verifyToken(request); // Si le token est faux, ça throw une erreur
      userId = user.id;
    } catch (e) {
      return NextResponse.json({ error: "Session expirée ou invalide" }, { status: 401 });
    }

    const body = await request.json();
    const { leaseId } = body;

    // 2. VÉRIFICATION DU BAIL
    const lease = await prisma.lease.findUnique({
        where: { id: leaseId },
        include: { tenant: true }
    });

    // On vérifie que le bail appartient bien à l'utilisateur du Token
    if (!lease || lease.tenantId !== userId) {
        return NextResponse.json({ error: "Bail introuvable ou accès refusé" }, { status: 403 });
    }

    if (lease.signatureStatus !== "PENDING") {
        return NextResponse.json({ error: "Ce document est déjà signé." }, { status: 400 });
    }

    // 3. CRÉATION DE L'EMPREINTE NUMÉRIQUE (HASH SHA-256)
    // On ajoute un "salt" (secret) pour rendre le hash impossible à deviner
    const signatureString = `${lease.id}-${userId}-${new Date().toISOString()}-${process.env.JWT_SECRET}`;
    const documentHash = crypto.createHash('sha256').update(signatureString).digest('hex').toUpperCase();

    // 4. TRANSACTION ATOMIQUE
    const updatedLease = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        
        // A. Créer la preuve juridique
        await tx.signatureProof.create({
            data: {
                leaseId: lease.id,
                signerId: userId,
                // On récupère l'IP (si derrière un proxy comme Vercel/Ngrok, utiliser x-forwarded-for)
                ipAddress: request.headers.get("x-forwarded-for") || "IP_INCONNUE",
                signedAt: new Date() 
            }
        });

        // B. Mettre à jour le statut du bail
        return await tx.lease.update({
            where: { id: lease.id },
            data: {
                signatureStatus: "SIGNED_TENANT", // Le locataire a signé
                documentHash: documentHash,       
                // ATTENTION : On active le bail seulement si c'est la règle (ou attendre signature proprio)
                // Ici on suppose que la signature locataire + paiement suffit pour activer :
                isActive: true, 
                status: "ACTIVE", // On met aussi le status global à ACTIVE
                updatedAt: new Date()
            }
        });
    });

    return NextResponse.json({ 
        success: true, 
        message: "Signature enregistrée avec succès",
        hash: updatedLease.documentHash,
        date: updatedLease.updatedAt
    });

  } catch (error) {
    console.error("Erreur Signature:", error);
    return NextResponse.json({ error: "Erreur serveur lors de la signature" }, { status: 500 });
  }
}

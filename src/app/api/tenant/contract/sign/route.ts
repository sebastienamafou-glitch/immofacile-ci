import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

// On utilise les params de l'URL pour la sécurité (évite de signer le mauvais ID)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params; // L'ID du bail vient de l'URL

    // 1. SÉCURITÉ : Authentification
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const user = session.user;

    // 2. VÉRIFICATION DU BAIL
    const lease = await prisma.lease.findUnique({
        where: { id },
        include: { signatures: true, property: true } // On regarde qui a déjà signé
    });

    // Sécurité : Vérifier que c'est bien le locataire du bail
    if (!lease || lease.tenantId !== user.id) {
        return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    // On vérifie si le locataire a déjà signé
    const existingSignature = lease.signatures.find(s => s.signerId === user.id);
    if (existingSignature) {
        return NextResponse.json({ error: "Vous avez déjà signé ce document." }, { status: 400 });
    }

    // 3. LOGIQUE D'ÉTAT (State Machine)
    // On vérifie si le propriétaire a DÉJÀ signé avant nous
    const hasOwnerSigned = lease.signatures.some(s => s.signerId === lease.property.ownerId || s.signerId !== lease.tenantId);
    
    // Si le propriétaire a déjà signé, alors ma signature complète le contrat
    // Sinon, on passe juste en "SIGNED_TENANT"
    const newSignatureStatus = hasOwnerSigned ? "COMPLETED" : "SIGNED_TENANT";
    const shouldActivate = hasOwnerSigned; // Le bail ne devient actif que si TOUT LE MONDE a signé

    // 4. MÉTADONNÉES LÉGALES
    const ipAddress = request.headers.get("x-forwarded-for") || "IP_INCONNUE";
    const userAgent = request.headers.get("user-agent") || "Device Inconnu";
    
    // Récupération de la signature dessinée (si envoyée)
    const body = await request.json();
    const { signatureData } = body;

    // 5. CRÉATION DU HASH (Empreinte numérique unique de CETTE action)
    // On mélange ID + User + Date + Secret pour rendre le hash infalsifiable
    const signatureString = `${lease.id}-${user.id}-${new Date().toISOString()}-${process.env.AUTH_SECRET}`;
    const actionHash = crypto.createHash('sha256').update(signatureString).digest('hex').toUpperCase();

    // 6. TRANSACTION ATOMIQUE (Tout ou rien)
    const result = await prisma.$transaction(async (tx) => {
        
        // A. Enregistrer la preuve technique (Audit Log)
        await tx.signatureProof.create({
            data: {
                leaseId: lease.id,
                signerId: user.id,
                ipAddress: ipAddress,
                userAgent: userAgent,
                signatureData: signatureData, 
                signedAt: new Date(),
                documentType: "LEASE"
            }
        });

        // B. Mettre à jour le statut du bail
        // Note : On ne met le documentHash global que si le contrat est COMPLET
        return await tx.lease.update({
            where: { id: lease.id },
            data: {
                signatureStatus: newSignatureStatus,
                // Si complet, on active, sinon on laisse en attente
                isActive: shouldActivate, 
                status: shouldActivate ? "ACTIVE" : "PENDING",
                // On met à jour le hash du document seulement si c'est la dernière signature
                // Sinon on garde l'ancien ou on met celui de l'action
                documentHash: actionHash, 
                updatedAt: new Date()
            }
        });
    });

    return NextResponse.json({ 
        success: true, 
        message: shouldActivate ? "Bail signé et activé !" : "Signature enregistrée. En attente du propriétaire.",
        status: result.signatureStatus,
        hash: result.documentHash
    });

  } catch (error) {
    console.error("Erreur Signature:", error);
    return NextResponse.json({ error: "Erreur serveur lors de la signature" }, { status: 500 });
  }
}

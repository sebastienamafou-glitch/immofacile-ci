import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// ✅ 1. VALIDATEUR STRICT (ZOD)
const reviewSchema = z.object({
  leaseId: z.string().cuid("ID de bail invalide"),
  decision: z.enum(['APPROVED', 'REJECTED'])
});

export async function POST(req: Request) {
  try {
    // 2. AUTH ZERO TRUST
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    // 3. SÉCURISATION DES ENTRÉES
    const body = await req.json();
    const validation = reviewSchema.safeParse(body);
    
    if (!validation.success) {
        return NextResponse.json({ error: "Données invalides ou corrompues." }, { status: 400 });
    }
    
    const { leaseId, decision } = validation.data;

    // 4. VÉRIFICATION D'APPARTENANCE (Optimisée avec `select`)
    const lease = await prisma.lease.findUnique({
        where: { id: leaseId },
        select: {
            id: true,
            propertyId: true,
            property: { select: { ownerId: true } } // 🚀 Zéro over-fetching
        }
    });

    if (!lease) return NextResponse.json({ error: "Dossier introuvable." }, { status: 404 });
    if (lease.property.ownerId !== userId) return NextResponse.json({ error: "Accès interdit." }, { status: 403 });

    // 5. LOGIQUE MÉTIER

    // --- CAS A : REFUS DU DOSSIER ---
    if (decision === 'REJECTED') {
        await prisma.lease.update({
            where: { id: leaseId },
            data: { status: 'CANCELLED', isActive: false }
        });

        return NextResponse.json({ success: true, message: "Candidature refusée." });
    } 
    
    // --- CAS B : ACCEPTATION DU DOSSIER (TRANSACTION BLINDÉE) ---
    if (decision === 'APPROVED') {
        try {
            // L'utilisation du callback async(tx) garantit l'isolation
            await prisma.$transaction(async (tx) => {
                
                // 1. Vérification anti-doublon *dans* la transaction
                const activeLease = await tx.lease.findFirst({
                    where: { 
                        propertyId: lease.propertyId, 
                        isActive: true,
                        id: { not: leaseId } 
                    },
                    select: { id: true }
                });

                if (activeLease) throw new Error("ALREADY_OCCUPIED");

                // 2. Activer ce bail
                await tx.lease.update({
                    where: { id: leaseId },
                    data: {
                        status: 'ACTIVE',
                        isActive: true,
                        signatureStatus: 'PENDING' 
                    }
                });

                // 3. Verrouiller la propriété
                await tx.property.update({
                    where: { id: lease.propertyId },
                    data: { isAvailable: false }
                });
            });
            
            return NextResponse.json({ success: true, message: "Candidature validée ! Le bien est maintenant occupé." });

        } catch (error: any) {
            if (error.message === "ALREADY_OCCUPIED") {
                return NextResponse.json({ error: "Ce bien a déjà été attribué à un autre locataire." }, { status: 409 });
            }
            throw error; // Relance pour le catch global
        }
    }

  } catch (error) {
    console.error("🚨 Erreur Review Candidate:", error);
    return NextResponse.json({ error: "Erreur serveur critique." }, { status: 500 });
  }
}

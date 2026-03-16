import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // 1. SÉCURITÉ BLINDÉE (RBAC Strict)
        const session = await auth();
        const userId = session?.user?.id;

        if (!userId) {
            return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
        }

        const admin = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true }
        });

        if (!admin || admin.role !== "SUPER_ADMIN") {
            return NextResponse.json({ error: "Accès refusé : Rôle Super Admin requis" }, { status: 403 });
        }

        // 2. GÉNÉRATION DU FLUX (ReadableStream Anti-OOM)
        const stream = new ReadableStream({
            async start(controller) {
                // En-têtes du CSV (Séparateur point-virgule pour compatibilité Excel native)
                controller.enqueue(new TextEncoder().encode("ID_Transaction;Date;Reference;Type;Compte;Utilisateur;Raison;Montant_Algebrique_CFA\n"));

                const batchSize = 1000;
                let cursor: string | undefined = undefined;
                let hasMore = true;

                while (hasMore) {
                    // Pagination par curseur (O(1) offset)
                    const transactions = await prisma.transaction.findMany({
                        take: batchSize,
                        skip: cursor ? 1 : 0,
                        cursor: cursor ? { id: cursor } : undefined,
                        orderBy: { id: 'asc' }, // Tri immuable obligatoire pour le curseur
                        include: { user: { select: { email: true, name: true } } }
                    });

                    if (transactions.length === 0) {
                        hasMore = false;
                        break;
                    }

                    // 3. TRANSFORMATION ALGÉBRIQUE ET SÉRIALISATION
                    for (const tx of transactions) {
                        const date = tx.createdAt.toISOString();
                        const ref = tx.reference || "N/A";
                        
                        // Sérialisation Algébrique : Débits et Remboursements en négatif
                        const sign = (tx.type === "DEBIT" || tx.type === "REFUND") ? -1 : 1;
                        const algebraicAmount = tx.amount * sign;
                        
                        // Nettoyage des chaînes pour éviter de casser le CSV
                        const userIdentifier = tx.user?.email || tx.user?.name || tx.userId;
                        const safeReason = `"${tx.reason.replace(/"/g, '""')}"`; 

                        const row = `${tx.id};${date};${ref};${tx.type};${tx.balanceType};${userIdentifier};${safeReason};${algebraicAmount}\n`;
                        controller.enqueue(new TextEncoder().encode(row));
                    }

                    // Mise à jour du curseur pour le prochain lot
                    cursor = transactions[transactions.length - 1].id;

                    if (transactions.length < batchSize) {
                        hasMore = false;
                    }
                }
                
                controller.close();
            }
        });

        // 4. RÉPONSE HTTP EN MODE STREAM (Téléchargement immédiat)
        return new Response(stream, {
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": `attachment; filename="export_grand_livre_${new Date().toISOString().split('T')[0]}.csv"`,
                "Cache-Control": "no-cache, no-store, must-revalidate",
            },
        });

    } catch (error) {
        console.error("[API_FINANCE_EXPORT_ERROR]", error);
        return NextResponse.json({ error: "Erreur critique lors de la génération de l'export." }, { status: 500 });
    }
}

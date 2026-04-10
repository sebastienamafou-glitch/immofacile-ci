import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Force l'exécution dynamique (pas de cache statique pour un Cron)
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        // 1. SÉCURITÉ : Vérification du token Cron (Essentiel en production)
         const authHeader = request.headers.get('authorization');
         if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
             return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
         }

        const now = new Date();

        // 2. RECHERCHE : Trouver tous les loyers en attente dont la date est dépassée
        const lateSchedules = await prisma.rentSchedule.findMany({
            where: {
                status: 'PENDING',
                expectedDate: {
                    lt: now // lt = less than (strictement inférieur à maintenant)
                }
            },
            include: {
                lease: {
                    include: { property: true }
                }
            }
        });

        if (lateSchedules.length === 0) {
            return NextResponse.json({ success: true, message: "Aucun nouveau retard détecté." });
        }

        // 3. ACTION : Mise à jour en lot (Batch Update) et Notifications
        // On utilise une transaction pour s'assurer que tout passe en même temps
        const results = await prisma.$transaction(async (tx) => {
            const updatedIds = [];

            for (const schedule of lateSchedules) {
                // A. Passer le statut en LATE
                await tx.rentSchedule.update({
                    where: { id: schedule.id },
                    data: { status: 'LATE' }
                });

                // B. Notifier le Locataire (Urgence)
                await tx.notification.create({
                    data: {
                        userId: schedule.lease.tenantId,
                        title: "⚠️ Loyer en retard",
                        message: `Votre loyer de ${schedule.amount.toLocaleString()} FCFA pour "${schedule.lease.property.title}" est en retard. Veuillez régulariser votre situation pour éviter des pénalités.`,
                        type: "ALERT",
                        link: `/dashboard/tenant/contract/${schedule.lease.id}`
                    }
                });

                // C. Notifier le Propriétaire (Information)
                await tx.notification.create({
                    data: {
                        userId: schedule.lease.property.ownerId,
                        title: "Retard de paiement détecté",
                        message: `Le loyer attendu le ${schedule.expectedDate.toLocaleDateString('fr-FR')} pour "${schedule.lease.property.title}" n'a pas été réglé. Le statut est passé "En retard".`,
                        type: "WARNING",
                        link: `/dashboard/owner/leases/${schedule.lease.id}`
                    }
                });

                updatedIds.push(schedule.id);
            }

            return updatedIds;
        });

        return NextResponse.json({ 
            success: true, 
            message: `${results.length} échéance(s) passée(s) en retard.`,
            updatedIds: results 
        });

    } catch (error) {
        console.error("🚨 ERREUR CRON RENT STATUS:", error);
        return NextResponse.json({ error: "Erreur interne lors de l'exécution du Cron." }, { status: 500 });
    }
}

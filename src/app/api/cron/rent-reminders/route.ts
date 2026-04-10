import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(request: Request) {
    try {
        // 1. SÉCURITÉ CRON
        const authHeader = request.headers.get('authorization');
        if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0); // Début de la journée

        const inThreeDays = new Date(today);
        inThreeDays.setDate(today.getDate() + 3);

        const endOfThreeDays = new Date(inThreeDays);
        endOfThreeDays.setHours(23, 59, 59, 999);

        const endOfToday = new Date(today);
        endOfToday.setHours(23, 59, 59, 999);

        // 2. RÉCUPÉRATION DES LOYERS (J-3 ET JOUR J)
        const upcomingSchedules = await prisma.rentSchedule.findMany({
            where: {
                status: 'PENDING',
                OR: [
                    { // JOUR J
                        expectedDate: { gte: today, lte: endOfToday }
                    },
                    { // J-3
                        expectedDate: { gte: inThreeDays, lte: endOfThreeDays }
                    }
                ]
            },
            include: {
                lease: {
                    include: { property: true, tenant: true }
                }
            }
        });

        if (upcomingSchedules.length === 0) {
            return NextResponse.json({ success: true, message: "Aucun rappel à envoyer aujourd'hui." });
        }

        let sentCount = 0;

        // 3. ENVOI DES NOTIFICATIONS
        for (const schedule of upcomingSchedules) {
            const isToday = schedule.expectedDate <= endOfToday;
            const title = isToday ? "📅 Votre loyer est attendu aujourd'hui" : "⏳ Rappel : Loyer attendu dans 3 jours";
            const message = isToday 
                ? `C'est le jour J ! Votre loyer de ${schedule.amount.toLocaleString()} FCFA pour "${schedule.lease.property.title}" est à régler aujourd'hui.`
                : `Pensez à régler votre loyer de ${schedule.amount.toLocaleString()} FCFA pour "${schedule.lease.property.title}" avant le ${schedule.expectedDate.toLocaleDateString('fr-FR')}.`;

            // Notification In-App
            await prisma.notification.create({
                data: {
                    userId: schedule.lease.tenantId,
                    title: title,
                    message: message,
                    type: isToday ? "WARNING" : "INFO",
                    link: `/dashboard/tenant/contract/${schedule.lease.id}`
                }
            });

            // TODO: Intégration SMS / Email (Brevo / Twilio)
            // if (schedule.lease.tenant.notifSms && schedule.lease.tenant.phone) {
            //     await sendSMS(schedule.lease.tenant.phone, message);
            // }
            // if (schedule.lease.tenant.notifEmail && schedule.lease.tenant.email) {
            //     await sendEmail(schedule.lease.tenant.email, title, message);
            // }

            sentCount++;
        }

        return NextResponse.json({ 
            success: true, 
            message: `${sentCount} rappel(s) envoyé(s) avec succès.` 
        });

    } catch (error) {
        console.error("🚨 ERREUR CRON RENT REMINDERS:", error);
        return NextResponse.json({ error: "Erreur interne." }, { status: 500 });
    }
}

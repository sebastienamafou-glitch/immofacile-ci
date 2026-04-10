import { 
    Prisma, 
    BookingPayment, 
    BookingStatus, 
    TransactionType, 
    BalanceType,
    Role,
    PaymentStatus
} from "@prisma/client";
import { sendNotification } from "@/lib/notifications";
import { logActivity } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { mapCinetPayMethod } from "@/lib/utils"; // ✅ Import du traducteur strict
import { TxClient, CinetPayApiData } from "@/services/billing/types"; // ✅ Typage unifié (DRY)

// =============================================================================
// 🚀 MOTEUR DE TRAITEMENT (AKWABA / COURT SÉJOUR)
// =============================================================================
export async function processAkwabaPayment(
    tx: TxClient, 
    bookingPayment: BookingPayment, 
    isValidPayment: boolean, 
    amountPaid: number, 
    transactionId: string, 
    apiData: CinetPayApiData, 
    postActions: Array<() => Promise<void>>
) {
    if (bookingPayment.status === PaymentStatus.SUCCESS) return;

    const bookingData = await tx.booking.findUnique({ 
        where: { id: bookingPayment.bookingId }, 
        include: { listing: { select: { title: true, hostId: true } } } 
    });

    if (!bookingData || !bookingData.listing) {
        await tx.bookingPayment.update({ 
            where: { id: bookingPayment.id }, 
            data: { status: PaymentStatus.FAILED, errorReason: "DATA_ERROR" } 
        });
        return;
    }

    if (!isValidPayment) {
        await tx.bookingPayment.update({ 
            where: { id: bookingPayment.id }, 
            data: { status: PaymentStatus.FAILED, errorReason: "PROVIDER_REJECTED" } 
        });
        return;
    }

    if (amountPaid !== bookingPayment.amount) {
        console.error(`🚨 [Fraude Akwaba] Réservation ${bookingData.id} : Attendu ${bookingPayment.amount}, Reçu ${amountPaid}`);
        await tx.bookingPayment.update({ 
            where: { id: bookingPayment.id }, 
            data: { status: PaymentStatus.FAILED, errorReason: "AMOUNT_MISMATCH" } 
        });
        return;
    }

    // Ventilation financière
    const platformFee = Math.round(amountPaid * 0.10);
    const hostPayout = amountPaid - platformFee;
    const hostId = bookingData.listing.hostId;

    // ✅ MAPPER STRICT : Protection contre le crash Prisma P2009
    const safeProvider = mapCinetPayMethod(apiData.payment_method);

    await tx.bookingPayment.update({ 
        where: { id: bookingPayment.id }, 
        data: { 
            status: PaymentStatus.SUCCESS, 
            provider: safeProvider, // 👈 CORRECTION : Typage fort Enum appliqué
            platformCommission: platformFee, 
            agencyCommission: 0,
            hostPayout: hostPayout, 
            transactionId: transactionId 
        } 
    });

    await tx.booking.update({ 
        where: { id: bookingPayment.bookingId }, 
        data: { status: BookingStatus.PAID } 
    });

    // 1. Paiement du Propriétaire (Host) via UserFinance
    await tx.userFinance.update({ 
        where: { userId: hostId }, 
        data: { walletBalance: { increment: hostPayout } }
    });
    await tx.transaction.create({ 
        data: { 
            amount: hostPayout, 
            type: TransactionType.CREDIT, 
            status: 'SUCCESS', 
            reason: `Réservation Akwaba #${bookingData.listing.title}`, 
            userId: hostId, 
            reference: `AKW-${transactionId}`, 
            balanceType: BalanceType.WALLET 
        } 
    });

    // 2. Paiement de la Plateforme (Requête hors verrou transactionnel)
    const superAdmin = await prisma.user.findFirst({ where: { role: Role.SUPER_ADMIN } });
    
    if (superAdmin && platformFee > 0) {
        await tx.userFinance.update({
            where: { userId: superAdmin.id },
            data: { walletBalance: { increment: platformFee } }
        });
        await tx.transaction.create({
            data: {
                amount: platformFee,
                type: TransactionType.CREDIT,
                status: 'SUCCESS',
                reason: `Commission Plateforme Akwaba (10%) - ${bookingData.listing.title}`,
                userId: superAdmin.id,
                reference: `PLAT-AKW-${transactionId}`,
                balanceType: BalanceType.WALLET
            }
        });
    }

    // Effets de bord asynchrones
    postActions.push(async () => {
        await sendNotification({ 
            userId: bookingData.guestId, 
            title: "Réservation Confirmée ! 🎒", 
            message: `Paiement reçu pour "${bookingData.listing.title}".`, 
            type: "SUCCESS", 
            link: `/dashboard/guest/trips` 
        });
        await sendNotification({ 
            userId: hostId, 
            title: "Nouvelle Réservation ! 🏠", 
            message: `Réservation payée pour "${bookingData.listing.title}".`, 
            type: "INFO", 
            link: `/dashboard/owner/akwaba/calendar` 
        });
    });

    await logActivity({ 
        action: "BOOKING_PAYMENT_SUCCESS", 
        entityId: bookingPayment.bookingId, 
        entityType: "BOOKING", 
        userId: bookingData.guestId, 
        metadata: { amount: amountPaid, hostPayout: hostPayout, platformFee: platformFee } 
    });
}

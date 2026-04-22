import { 
    Prisma, 
    BookingPayment, 
    BookingStatus, 
    TransactionType, 
    BalanceType,
    Role,
    PaymentStatus,
    TransactionStatus // ✅ 1. IMPORT DE L'ENUM MANQUANT
} from "@prisma/client";
import { sendNotification } from "@/lib/notifications";
import { logActivity } from "@/lib/logger";
import { mapCinetPayMethod } from "@/lib/utils";
import { TxClient, CinetPayApiData } from "@/services/billing/types";

// =============================================================================
// 🚀 MOTEUR DE TRAITEMENT (AKWABA / COURT SÉJOUR) - OPTION A
// =============================================================================
export async function processAkwabaPayment(
    tx: TxClient, 
    bookingPayment: BookingPayment, 
    isValidPayment: boolean, 
    amountPaid: number, 
    transactionId: string, 
    apiData: CinetPayApiData, 
    postActions: Array<() => Promise<void>>,
    superAdminId: string | null 
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

    const safeProvider = mapCinetPayMethod(apiData.payment_method);

    await tx.bookingPayment.update({ 
        where: { id: bookingPayment.id }, 
        data: { 
            status: PaymentStatus.SUCCESS, 
            provider: safeProvider, 
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

    // 1. Paiement du Propriétaire (Host)
    await tx.transaction.create({ 
        data: { 
            amount: hostPayout, 
            type: TransactionType.CREDIT, 
            status: TransactionStatus.SUCCESS, // ✅ 2. CORRECTION STRICTE
            reason: `Réservation Akwaba #${bookingData.listing.title}`, 
            userId: hostId, 
            reference: `AKW-${transactionId}`, 
            balanceType: BalanceType.WALLET 
        } 
    });

    // 2. Paiement de la Plateforme
    if (superAdminId && platformFee > 0) {
        await tx.userFinance.update({
            where: { userId: superAdminId },
            data: { walletBalance: { increment: platformFee } }
        });
        await tx.transaction.create({
            data: {
                amount: platformFee,
                type: TransactionType.CREDIT,
                status: TransactionStatus.SUCCESS, // ✅ 3. CORRECTION STRICTE
                reason: `Commission Plateforme Akwaba (10%) - ${bookingData.listing.title}`,
                userId: superAdminId,
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

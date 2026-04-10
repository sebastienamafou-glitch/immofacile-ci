// =============================================================================
// PATCH route.ts — à appliquer dans la section "EXÉCUTION ATOMIQUE" (étape 4)
// =============================================================================
//
// 1. Résoudre superAdminId AVANT l'ouverture de la transaction.
//    Cela évite une lecture hors snapshot (prisma global) à l'intérieur d'une TX Serializable.
//    L'ID du SUPER_ADMIN est immuable en pratique — le lire une fois avant la TX est safe.
//
// 2. Ajouter timeout sur axios (étape 3).

// ── Étape 3 modifiée : timeout axios ────────────────────────────────────────
const verification = await axios.post(
    CINETPAY_CONFIG.CHECK_URL,
    { apikey: CINETPAY_CONFIG.API_KEY, site_id: CINETPAY_CONFIG.SITE_ID, transaction_id: transactionId },
    { timeout: 8_000 }  // ← ajout
);

// ── Résolution superAdminId (entre étape 3 et étape 4) ──────────────────────
const superAdminRecord = await prisma.user.findFirst({
    where:  { role: "SUPER_ADMIN" },
    select: { id: true },
});
const superAdminId = superAdminRecord?.id ?? null;

// ── Étape 4 : signature des appels de service à mettre à jour ───────────────
// processAkwabaPayment(tx, bookingPayment, isValidPayment, amountPaid, transactionId, apiData, postTransactionActions, superAdminId)
// processInvestmentPayment(tx, investmentContract, isValidPayment, amountPaid, transactionId, superAdminId)
// processRealEstatePayment(tx, paymentRecord, isValidPayment, amountPaid, transactionId, apiData, superAdminId)

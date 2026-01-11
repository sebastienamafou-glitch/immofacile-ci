export const FINANCE_RULES = {
  TENANT_FIXED_FEE: 20000,      // Les frais de gestion à la charge du locataire
  PLATFORM_COMMISSION_RATE: 0.05, // 5% de commission plateforme sur le loyer
  AGENT_COMMISSION_RATE: 0.05,    // 5% de commission agent (1er loyer)
  CURRENCY: 'XOF'
};

export const CINETPAY_CONFIG = {
  API_KEY: process.env.CINETPAY_API_KEY,
  SITE_ID: process.env.CINETPAY_SITE_ID,
  BASE_URL: process.env.CINETPAY_BASE_URL || "https://api-checkout.cinetpay.com/v2/payment",
  NOTIFY_URL: process.env.APP_URL + "/api/payments/webhook" // Votre URL publique
};

export const FINANCE_RULES = {
  TENANT_FIXED_FEE: 20000,        // Frais dossier Locataire (FCFA)
  PLATFORM_COMMISSION_RATE: 0.05, // 5% pour ImmoFacile
  AGENT_COMMISSION_RATE: 0.05,    // 5% pour l'Agent
  CURRENCY: 'XOF'
};

// On sécurise l'URL de base (localhost par défaut si oubli en dev)
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const CINETPAY_CONFIG = {
  API_KEY: process.env.CINETPAY_API_KEY || "", // Évite le crash si undefined
  SITE_ID: process.env.CINETPAY_SITE_ID || "",
  BASE_URL: "https://api-checkout.cinetpay.com/v2/payment",
  
  // ✅ CORRECTION ICI : "payment" au singulier pour matcher le Middleware
  // ✅ SÉCURITÉ : On utilise la variable d'environnement correcte
  NOTIFY_URL: `${APP_URL}/api/payment/webhook` 
};

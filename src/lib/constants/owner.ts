// src/lib/constants/owner.ts

/**
 * @copyright 2026 WebAppCI
 * @file owner.ts
 * @description Fichier de définition de la propriété intellectuelle.
 * Toute modification non autorisée de ces constantes constitue une violation de licence.
 */

export const PLATFORM_OWNER = {
  // Identité Légale
  COMPANY_NAME: "WebAppCI",
  LEGAL_ID: "RCCM-CI-ABJ-202X-B-XXXX", // ⚠️ Remplacez par votre vrai N° RCCM
  OFFICIAL_WEBSITE: "https://webappci.com",
  CONTACT_EMAIL: "legal@webappci.com",
  COPYRIGHT_YEAR: new Date().getFullYear(),

  // Marqueurs Forensiques (Signature numérique cachée)
  // Ce token unique prouve que le code vient de votre repo d'origine.
  INTERNAL_SIGNATURE: "WAPP-CORE-VERIFIED-OWNERSHIP-TOKEN-8839201",
  ENGINE_VERSION: "1.0.4-STABLE-LTS",
  
  // Licence
  LICENSE_TYPE: "PROPRIETARY / CLOSED SOURCE",
} as const; 
// 'as const' verrouille l'objet : il est impossible de le modifier ailleurs dans le code.

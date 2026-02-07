import { z } from "zod";

/**
 * 🛡️ VALIDATION DES VARIABLES D'ENVIRONNEMENT
 * Ce fichier empêche l'application de démarrer si une clé critique manque.
 * C'est votre "Checklist de décollage".
 */

const envSchema = z.object({
  // 1. Base de données & Auth
  DATABASE_URL: z.string().url("La DATABASE_URL doit être une URL valide (postgresql://...)"),
  NEXTAUTH_SECRET: z.string().min(10, "Le NEXTAUTH_SECRET doit être une chaîne longue et aléatoire"),
  NEXTAUTH_URL: z.string().url().optional(), // Optionnel en prod sur Vercel, requis en dev

  // 2. Paiements (CinetPay) - CRITIQUE
  CINETPAY_API_KEY: z.string().min(1, "Clé API CinetPay manquante"),
  CINETPAY_SITE_ID: z.string().min(1, "Site ID CinetPay manquant"),
  CINETPAY_SECRET_KEY: z.string().min(1, "Secret Key CinetPay manquante (pour le Webhook)"),

  // 3. Emails (SMTP)
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.string().transform((val) => parseInt(val, 10)), // On convertit en nombre
  SMTP_USER: z.string().min(1),
  SMTP_PASS: z.string().min(1),
  SMTP_FROM: z.string().email(),

  // 4. Uploads (Cloudinary)
  CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),

  // 5. Variables Publiques (Accessibles au navigateur)
  // Note: Zod vérifie process.env, donc on vérifie ici que la version serveur existe bien
  NEXT_PUBLIC_APP_URL: z.string().url("L'URL publique de l'app est invalide"),
});

// Fonction de validation immédiate
const validateEnv = () => {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error(
      "❌ CRASH AU DÉMARRAGE : Variables d'environnement invalides ou manquantes :",
      parsed.error.flatten().fieldErrors
    );
    // On tue le processus Node.js pour empêcher un démarrage instable
    process.exit(1);
  }

  return parsed.data;
};

// Exportation de l'objet 'env' validé
// Partout dans ton code, remplace 'process.env.VAR' par 'env.VAR' pour être sûr à 100%
export const env = validateEnv();

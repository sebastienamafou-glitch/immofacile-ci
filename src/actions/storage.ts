// src/actions/storage.ts

import { auth } from "@/auth";
import { getPresignedViewUrl, getPresignedUploadUrl } from "@/lib/s3"; // ✅ Ajout de l'import manquant
import { prisma } from "@/lib/prisma";

/**
 * 1. GÉNÉRER UNE URL D'UPLOAD SÉCURISÉE (Celle qui manquait)
 * Utilisée par SecureDocumentUpload.tsx pour envoyer les fichiers directement à S3
 */
export async function getSecureUploadUrl(fileName: string, fileType: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non autorisé" };

  // 🛡️ SÉCURITÉ : On impose le chemin du fichier pour éviter l'écrasement
  // Structure : private/users/ID_USER/timestamp-nom_fichier
  const timestamp = Date.now();
  const safePath = `private/users/${session.user.id}/${timestamp}-${fileName}`;

  try {
    // On génère la signature S3 (nécessite que getPresignedUploadUrl existe dans @/lib/s3)
    const { url, fields } = await getPresignedUploadUrl(safePath, fileType);
    
    return { 
        success: true, 
        url, 
        fields, 
        fileKey: safePath // On renvoie la clé pour la sauvegarder en DB (ex: dans UserKYC)
    };
  } catch (error) {
    console.error("Erreur S3 Upload URL:", error);
    return { error: "Impossible de préparer l'envoi du fichier." };
  }
}

/**
 * 2. ACCÉDER À UN DOCUMENT SÉCURISÉ (Lecture)
 * Utilisée pour afficher les documents privés (KYC, Baux, etc.)
 */
export async function accessSecureDocument(fileKey: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non autorisé" };

  // 🛡️ SÉCURITÉ : Validation stricte des droits d'accès
  const parts = fileKey.split('/');
  
  // Vérification : Le fichier est-il dans un dossier utilisateur ?
  if (parts[0] === "private" && parts[1] === "users") {
      const ownerId = parts[2]; // L'ID du propriétaire est dans le chemin

      // Règle A : C'est MON fichier
      const isMyFile = ownerId === session.user.id;

      // Règle B : Je suis un ADMINISTRATEUR
      // On vérifie le rôle dans la session (assurez-vous que votre auth() renvoie bien le rôle)
      const isAdmin = session.user.role === "SUPER_ADMIN" || session.user.role === "ADMIN" || session.user.role === "AGENCY_ADMIN"; 

      if (!isMyFile && !isAdmin) {
          console.error(`🚨 ALERTE SÉCURITÉ: Tentative d'accès non autorisé par ${session.user.id} sur ${fileKey}`);
          return { error: "Accès refusé. Ce document ne vous appartient pas." };
      }
  }

  try {
    const url = await getPresignedViewUrl(fileKey);
    return { success: true, url };
  } catch (error) {
    return { error: "Document introuvable ou archivé." };
  }
}

import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || ''; // Doit être 32 chars (256 bits)
const IV_LENGTH = 16; // Pour AES, c'est toujours 16

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
  // Note: openssl rand -hex 32 donne 64 caractères hexadécimaux, ce qui est parfait.
  // On ne lance une erreur qu'en PROD pour ne pas bloquer le dev si la variable manque
  if (process.env.NODE_ENV === 'production') {
    throw new Error('ENCRYPTION_KEY invalide ou manquante (doit être 64 hex chars)');
  }
}

/**
 * Chiffre un texte sensible (ex: N° CNI) avant de l'envoyer en base.
 * @returns Format : "iv:content" (le tout en hexadécimal)
 */
export function encrypt(text: string): string {
  if (!text) return text;
  
  // On génère un vecteur d'initialisation aléatoire (IV) pour que 
  // "AB-123" ne donne pas toujours le même résultat chiffré.
  const iv = crypto.randomBytes(IV_LENGTH);
  
  // On utilise la clé convertie depuis l'hexadécimal
  const keyBuffer = Buffer.from(ENCRYPTION_KEY, 'hex');
  
  const cipher = crypto.createCipheriv('aes-256-cbc', keyBuffer, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

/**
 * Déchiffre une donnée venant de la base pour l'afficher à l'admin.
 */
export function decrypt(text: string): string {
  if (!text || !text.includes(':')) return text; // Si pas chiffré, on renvoie tel quel
  
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift()!, 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  
  const keyBuffer = Buffer.from(ENCRYPTION_KEY, 'hex');
  
  const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString();
}

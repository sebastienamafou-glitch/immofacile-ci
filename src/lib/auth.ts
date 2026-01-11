import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'votre_super_secret';

export const verifyToken = (req: Request) => {
  const authHeader = req.headers.get('authorization');

  if (!authHeader) {
    throw new Error('Token manquant');
  }

  // Extraction propre du Bearer token
  const parts = authHeader.split(' ');
  let token = parts.length > 1 ? parts[1] : parts[0];

  // Nettoyage de sécurité (espaces et guillemets parasites)
  token = token.trim();
  if (token.startsWith('"') && token.endsWith('"')) {
    token = token.slice(1, -1);
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return decoded;
  } catch (error) {
    // On garde juste un log discret en cas d'erreur réelle
    console.error("[Auth] Échec de vérification du token");
    throw new Error('Token invalide ou expiré');
  }
};

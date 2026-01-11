import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'votre_super_secret';

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Accès non autorisé. Token manquant.' });
  }

  const token = authHeader.split(' ')[1]; // On enlève "Bearer "

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // On attache l'user à la requête pour les étapes suivantes
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role
    };
    
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Token invalide ou expiré.' });
  }
};

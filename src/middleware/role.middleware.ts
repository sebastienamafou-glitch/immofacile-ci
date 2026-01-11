import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';

/**
 * @param allowedRoles Liste des rôles autorisés (ex: ['ADMIN', 'AGENT'])
 */
export const authorize = (allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    
    if (!req.user) {
      return res.status(401).json({ error: 'Utilisateur non authentifié.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `Accès interdit. Rôle requis : ${allowedRoles.join(' ou ')}` 
      });
    }

    next();
  };
};

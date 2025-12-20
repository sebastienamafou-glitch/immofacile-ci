// middleware/authMiddleware.js

/**
 * Fonction interne pour rediriger les utilisateurs égarés vers le bon endroit.
 * Si un Locataire essaie de forcer l'entrée sur une page Propriétaire, 
 * on le renvoie gentiment sur son propre dashboard au lieu de juste bloquer.
 */
const redirectUserByRole = (req, res) => {
    const user = req.session.user;
    if (!user) return res.redirect('/login');

    switch (user.role) {
        case 'OWNER': return res.redirect('/owner/dashboard');
        case 'TENANT': return res.redirect('/tenant/dashboard');
        case 'ADMIN': return res.redirect('/admin/dashboard');
        case 'AGENT': return res.redirect('/agent/dashboard');
        default: return res.redirect('/login');
    }
};

/**
 * 1. Vérification PROPRIÉTAIRE (OWNER)
 */
exports.isOwner = (req, res, next) => {
    // A. Est-il connecté ?
    if (!req.session || !req.session.user) {
        return res.redirect('/login?error=session_expired');
    }

    // B. A-t-il le bon rôle ?
    if (req.session.user.role === 'OWNER') {
        return next(); // C'est bon, on laisse passer !
    }

    // C. Sinon, redirection intelligente
    return redirectUserByRole(req, res);
};

/**
 * 2. Vérification LOCATAIRE (TENANT)
 */
exports.isTenant = (req, res, next) => {
    if (!req.session || !req.session.user) {
        return res.redirect('/login');
    }

    if (req.session.user.role === 'TENANT') {
        return next();
    }

    return redirectUserByRole(req, res);
};

/**
 * 3. Vérification AGENT (AGENT)
 */
exports.isAgent = (req, res, next) => {
    if (!req.session || !req.session.user) {
        return res.redirect('/login');
    }

    if (req.session.user.role === 'AGENT') {
        return next();
    }

    return redirectUserByRole(req, res);
};

/**
 * 4. Vérification ADMIN (ADMIN)
 */
exports.isAdmin = (req, res, next) => {
    if (!req.session || !req.session.user) {
        return res.redirect('/login'); // Pour l'admin, on renvoie au login pour ne pas fuiter d'infos
    }

    if (req.session.user.role === 'ADMIN') {
        return next();
    }

    return res.redirect('/login'); // Sécurité maximale pour les routes admin
};

/**
 * 5. Vérification Compte Actif (Pour bloquer les mauvais payeurs/bannis)
 * À utiliser en combinaison avec les autres.
 */
exports.isAccountActive = (req, res, next) => {
    if (req.session.user && req.session.user.isActive === false) {
        // Détruire la session et renvoyer au login avec un message
        return req.session.destroy(() => {
            res.redirect('/login?error=account_suspended');
        });
    }
    next();
};

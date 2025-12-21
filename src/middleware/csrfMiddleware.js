// CORRECTION AUDIT : Suppression exclusion add-lead
const csrf = require('csurf');

const csrfProtection = csrf({
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
    }
});

const csrfMiddleware = (req, res, next) => {
    const excludedPaths = [
        '/api/payment/notify' 
        // L'ajout de lead a été retiré des exclusions pour sécurité
    ];

    if (
        excludedPaths.includes(req.path) || 
        req.path.startsWith('/inventory/') || 
        req.path.startsWith('/apply/')
    ) {
        return next();
    }

    csrfProtection(req, res, next);
};

module.exports = csrfMiddleware;
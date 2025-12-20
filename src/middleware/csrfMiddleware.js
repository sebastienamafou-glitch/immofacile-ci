// middleware/csrfMiddleware.js
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
        '/api/payment/notify',
        '/agent/add-lead'
    ];

    if (
        excludedPaths.includes(req.path) || 
        req.path.startsWith('/inventory/') || 
        req.path.startsWith('/apply/') // <-- Ajout important vu dans votre app.js
    ) {
        return next();
    }

    csrfProtection(req, res, next);
};

module.exports = csrfMiddleware;

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

exports.isOwner = (req, res, next) => {
    if (!req.session || !req.session.user) return res.redirect('/login?error=session_expired');
    if (req.session.user.role === 'OWNER') return next();
    return redirectUserByRole(req, res);
};

exports.isTenant = (req, res, next) => {
    if (!req.session || !req.session.user) return res.redirect('/login');
    if (req.session.user.role === 'TENANT') return next();
    return redirectUserByRole(req, res);
};

exports.isAgent = (req, res, next) => {
    if (!req.session || !req.session.user) return res.redirect('/login');
    if (req.session.user.role === 'AGENT') return next();
    return redirectUserByRole(req, res);
};

exports.isAdmin = (req, res, next) => {
    if (!req.session || !req.session.user) return res.redirect('/login');
    if (req.session.user.role === 'ADMIN') return next();
    return res.redirect('/login');
};
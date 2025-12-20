// controllers/authController.js
const bcrypt = require('bcryptjs');
const prisma = require('../prisma/client');
const crypto = require('crypto'); // Natif Node.js
const emailService = require('../utils/email'); // Notre nouveau fichiers

// --- AFFICHAGE ---
exports.getLanding = (req, res) => {
    if (req.session.user) return res.redirect('/owner/dashboard');
    res.render('landing');
};
exports.getPrivacy = (req, res) => res.render('privacy');
exports.getCGU = (req, res) => res.render('cgu');

// --- INSCRIPTION ---
exports.getSignup = (req, res) => res.render('signup', { error: null });

exports.postSignup = async (req, res) => {
    const { name, email, phone, password } = req.body;
    try {
        const existingUser = await prisma.user.findFirst({
            where: { OR: [{ email }, { phone }] }
        });

        if (existingUser) {
            return res.render('signup', { error: "Cet email ou ce numéro est déjà utilisé." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // --- CORRECTION SCHEMA ---
        const user = await prisma.user.create({
            data: { 
                name, 
                email, 
                phone, 
                password: hashedPassword, 
                role: 'OWNER',
                walletBalance: 0, // Nouveau nom
                escrowBalance: 0  // Nouveau champ
            }
        });

        req.session.user = { id: user.id, name: user.name, role: user.role, isActive: true };
        res.redirect('/owner/dashboard');

    } catch (error) {
        console.error("Erreur Signup:", error);
        res.render('signup', { error: "Une erreur technique est survenue." });
    }
};

// --- CONNEXION ---
exports.getLogin = (req, res) => res.render('login', { error: null });

exports.postLogin = async (req, res) => {
    const { identifier, password } = req.body;
    try {
        const user = await prisma.user.findFirst({
            where: { OR: [{ email: identifier }, { phone: identifier }] }
        });

        if (!user) return res.render('login', { error: "Identifiants incorrects." });

        if (!user.isActive) {
            return res.render('login', { error: "Votre compte a été suspendu. Contactez le support." });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.render('login', { error: "Identifiants incorrects." });

        req.session.user = { id: user.id, name: user.name, role: user.role, isActive: user.isActive };

        switch (user.role) {
            case 'OWNER': return res.redirect('/owner/dashboard');
            case 'TENANT': return res.redirect('/tenant/dashboard');
            case 'AGENT': return res.redirect('/agent/dashboard');
            case 'ADMIN': return res.redirect('/admin/dashboard');
            default: return res.redirect('/');
        }

    } catch (error) {
        console.error("Erreur Login:", error);
        res.render('login', { error: "Erreur de connexion serveur." });
    }
};

// --- DÉCONNEXION ---
exports.logout = (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
};

// --- LEAD MAGNET ---
exports.postRegisterLead = async (req, res) => {
    const { name, phone } = req.body;
    try {
        await prisma.lead.create({ data: { name, phone } });
        res.send(`<div style="background:#0B1120;color:white;height:100vh;display:flex;justify-content:center;align-items:center;flex-direction:column;font-family:sans-serif;">
            <h1 style="color:#F59E0B">Merci !</h1>
            <p>On vous rappelle très vite.</p>
            <a href="/" style="color:white;margin-top:20px;">Retour</a>
        </div>`);
    } catch (error) {
        console.error("Erreur Lead:", error);
        res.status(500).send("Erreur enregistrement lead.");
    }
};

// --- CANDIDATURES ---
exports.getPublicProperty = async (req, res) => {
    try {
        const property = await prisma.property.findUnique({
            where: { id: req.params.id },
            include: { owner: true }
        });
        if (!property) return res.status(404).render('404');
        res.render('public-property', { property });
    } catch (error) {
        console.error("Erreur page publique:", error);
        res.status(500).send("Erreur serveur");
    }
};

exports.postApply = async (req, res) => {
    const propertyId = req.params.id;
    const { name, phone, email, income } = req.body;

    try {
        const property = await prisma.property.findUnique({ where: { id: propertyId } });
        let solvencyInfo = "";
        let score = 50;

        if (property) {
            const rentRatio = parseFloat(income) / property.price;
            if (rentRatio >= 3) { score += 40; solvencyInfo = "Dossier EXCELLENT"; }
            else if (rentRatio >= 2.5) { score += 20; solvencyInfo = "Bon dossier"; }
            else if (rentRatio < 2) { score -= 20; solvencyInfo = "Risque financier"; }
        }

        await prisma.lead.create({
            data: {
                name: `${name} (Candidat)`,
                phone: phone,
                address: `Candidature Bien #${propertyId} | Revenu: ${income} | Score IA: ${score}/100 (${solvencyInfo}) | Email: ${email}`,
                status: 'NOUVEAU'
            }
        });

        res.send(`
            <div style="font-family:sans-serif; text-align:center; padding:50px; display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:100vh; background-color:#f8fafc;">
                <div style="font-size:50px;">🚀</div>
                <h1 style="color:#22c55e; margin-bottom:10px;">Dossier envoyé avec succès !</h1>
                <p style="color:#475569;">Score de solvabilité : <strong>${score}/100</strong>.</p>
                <a href="/" style="margin-top:30px; background-color:#0B1120; color:white; padding:12px 24px; border-radius:10px; text-decoration:none;">Retour</a>
            </div>
        `);

    } catch (error) {
        console.error("Erreur candidature:", error);
        res.status(500).send("Erreur lors de l'envoi.");
    }
};

// --- MOT DE PASSE OUBLIÉ ---

// 1. Afficher le formulaire de demande
exports.getForgotPassword = (req, res) => {
    res.render('forgot-password', { error: null, success: null });
};

// 2. Traiter la demande (Générer Token + Email)
exports.postForgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { email } });

        // Sécurité : On ne dit pas si l'email existe ou non pour éviter le "User Enumeration"
        if (!user) {
            return res.render('forgot-password', { 
                error: null, 
                success: "Si cet email existe, un lien a été envoyé." 
            });
        }

        // Génération du token
        const token = crypto.randomBytes(32).toString('hex');
        const expireDate = new Date(Date.now() + 3600000); // 1 heure

        // Sauvegarde en DB
        await prisma.user.update({
            where: { id: user.id },
            data: {
                resetPasswordToken: token,
                resetPasswordExpires: expireDate
            }
        });

        // Envoi Email
        await emailService.sendResetEmail(user.email, token, req.headers.host);

        res.render('forgot-password', { 
            error: null, 
            success: "Si cet email existe, un lien a été envoyé. Vérifiez vos spams." 
        });

    } catch (error) {
        console.error("Forgot Password Error:", error);
        res.render('forgot-password', { error: "Erreur technique.", success: null });
    }
};

// 3. Afficher le formulaire de changement (via lien email)
exports.getResetPassword = async (req, res) => {
    const { token } = req.params;
    
    // On vérifie si le token est valide et non expiré
    const user = await prisma.user.findFirst({
        where: {
            resetPasswordToken: token,
            resetPasswordExpires: { gt: new Date() } // gt = greater than (futur)
        }
    });

    if (!user) {
        return res.render('login', { error: "Ce lien est invalide ou a expiré." });
    }

    res.render('reset-password', { token, error: null });
};

// 4. Valider le nouveau mot de passe
exports.postResetPassword = async (req, res) => {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
        return res.render('reset-password', { token, error: "Les mots de passe ne correspondent pas." });
    }

    try {
        const user = await prisma.user.findFirst({
            where: {
                resetPasswordToken: token,
                resetPasswordExpires: { gt: new Date() }
            }
        });

        if (!user) return res.redirect('/login');

        const hashedPassword = await bcrypt.hash(password, 10);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                resetPasswordToken: null,   // On nettoie
                resetPasswordExpires: null  // On nettoie
            }
        });

        res.render('login', { error: null, success: "Mot de passe modifié ! Connectez-vous." });

    } catch (error) {
        console.error("Reset Error:", error);
        res.render('reset-password', { token, error: "Erreur technique." });
    }
};

const prisma = require('../prisma/client');
const crypto = require('crypto');
// Importez vos services d'envoi (WhatsApp/SMS/Email)
// const notifService = require('../utils/notifService'); 

// 1. GÉNÉRER ET ENVOYER LE CODE (OTP)
exports.requestSignatureOtp = async (req, res) => {
    try {
        const leaseId = req.params.id;
        const user = req.session.user; // Celui qui demande à signer (Proprio ou Locataire)

        // Générer un code à 6 chiffres
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Stocker ce code temporairement en session (ou en Redis pour la prod)
        // Pour faire simple ici :
        req.session.signingOtp = {
            code: otpCode,
            leaseId: leaseId,
            expires: Date.now() + 10 * 60 * 1000 // Valide 10 min
        };

        // TODO: Envoyer ce code par SMS/WhatsApp ici
        console.log(`CODE DE SIGNATURE POUR ${user.name}: ${otpCode}`); 

        res.json({ success: true, message: "Code envoyé !" });

    } catch (error) {
        res.status(500).json({ error: "Erreur d'envoi du code" });
    }
};

// 2. VALIDER LE CODE ET SIGNER
exports.verifySignature = async (req, res) => {
    try {
        const { otp, leaseId } = req.body;
        const user = req.session.user;
        const ip = req.ip;

        // Vérification du code
        if (!req.session.signingOtp || req.session.signingOtp.code !== otp) {
            return res.status(400).json({ error: "Code incorrect ou expiré" });
        }

        // Mise à jour de la base de données selon le rôle
        const updateData = {};
        
        if (user.role === 'TENANT') {
            updateData.tenantSignDate = new Date();
            updateData.tenantSignIp = ip;
            updateData.signatureStatus = 'TENANT_SIGNED';
        } else if (user.role === 'OWNER') {
            updateData.ownerSignDate = new Date();
            updateData.ownerSignIp = ip;
            // Si le locataire a déjà signé, le contrat est complet
            const lease = await prisma.lease.findUnique({ where: { id: leaseId } });
            if (lease.signatureStatus === 'TENANT_SIGNED') {
                updateData.signatureStatus = 'COMPLETED';
            }
        }

        await prisma.lease.update({
            where: { id: leaseId },
            data: updateData
        });

        // Nettoyer la session
        delete req.session.signingOtp;

        res.json({ success: true, redirect: '/contract/' + leaseId });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erreur lors de la signature" });
    }
};

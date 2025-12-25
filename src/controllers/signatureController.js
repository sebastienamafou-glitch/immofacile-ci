// src/controllers/signatureController.js
const prisma = require('../prisma/client');
const sealing = require('../utils/sealingService');
const tracker = require('../utils/tracker');

/**
 * 1. Initialise le processus de signature
 * Calcule le Hash et génère l'OTP
 */
exports.initiateSignature = async (req, res) => {
    const { leaseId } = req.body;
    const user = req.session.user;

    try {
        // Récupérer le bail avec les infos des parties
        const lease = await prisma.lease.findUnique({
            where: { id: leaseId },
            include: { 
                tenant: true, 
                property: { include: { owner: true } } 
            }
        });

        if (!lease) return res.status(404).json({ error: "Bail non trouvé" });

        // Générer un contenu textuel unique pour le scellement
        // En V4, on pourrait utiliser le HTML du bail généré
        const documentContent = `BAIL_IMMOFACILE_ID:${lease.id}_RENT:${lease.monthlyRent}_TENANT:${lease.tenant.name}`;
        
        // Calcul du Hash SHA-256 (Scellement mathématique)
        const hash = sealing.calculateDocumentHash(documentContent);
        
        // Génération de l'OTP
        const otp = sealing.generateOTP();

        // Sauvegarde ou mise à jour de la preuve de signature
        await prisma.signatureProof.upsert({
            where: { leaseId: lease.id },
            update: { 
                documentHash: hash,
                [user.role === 'OWNER' ? 'ownerOtp' : 'tenantOtp']: otp 
            },
            create: {
                leaseId: lease.id,
                documentHash: hash,
                ownerOtp: user.role === 'OWNER' ? otp : null,
                tenantOtp: user.role === 'TENANT' ? otp : null
            }
        });

        // SIMULATION D'ENVOI SMS (À remplacer par votre service SMS Orange/MTN)
        console.log(`✉️ SMS envoyé à ${user.phone} : Votre code de signature est ${otp}`);

        res.json({ 
            success: true, 
            message: "Code de signature envoyé par SMS.",
            hash: hash // On affiche le hash pour rassurer l'utilisateur sur la sécurité
        });

    } catch (error) {
        console.error("Erreur Initiation Signature:", error);
        res.status(500).json({ error: "Erreur lors de l'initiation de la signature" });
    }
};

/**
 * 2. Vérifie l'OTP et scelle la signature
 */
exports.verifyAndSign = async (req, res) => {
    const { leaseId, otp } = req.body;
    const user = req.session.user;

    try {
        const proof = await prisma.signatureProof.findUnique({
            where: { leaseId: leaseId }
        });

        if (!proof) return res.status(404).json({ error: "Aucune signature en cours" });

        // Vérification de l'OTP selon le rôle
        const isOwner = user.role === 'OWNER' && proof.ownerOtp === otp;
        const isTenant = user.role === 'TENANT' && proof.tenantOtp === otp;

        if (!isOwner && !isTenant) {
            return res.status(401).json({ error: "Code OTP incorrect" });
        }

        // Mise à jour de la signature avec l'IP et la date
        const updatedProof = await prisma.signatureProof.update({
            where: { leaseId: leaseId },
            data: {
                [user.role === 'OWNER' ? 'ownerSigned' : 'tenantOtp']: true, // Correction: tenantSigned
                [user.role === 'OWNER' ? 'ownerIp' : 'tenantIp']: req.ip,
                signedAt: new Date()
            }
        });

        // Si les deux parties ont signé, on change le statut du bail
        if (updatedProof.ownerSigned && updatedProof.tenantSigned) {
            await prisma.lease.update({
                where: { id: leaseId },
                data: { status: 'SIGNED_ELECTRONICALLY', isActive: true }
            });

            await tracker.trackAction("LEASE_FULLY_SIGNED", "SYSTEM", user.id, { leaseId });
        }

        res.json({ success: true, message: "Document scellé avec succès ! ✅" });

    } catch (error) {
        console.error("Erreur Vérification Signature:", error);
        res.status(500).json({ error: "Erreur technique lors de la signature" });
    }
};

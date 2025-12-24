const prisma = require('../prisma/client');
const { uploadFromBuffer } = require('../utils/cloudinary');
const mindeeService = require('../services/mindeeService');

exports.uploadIdCard = async (req, res) => {
    try {
        if (!req.file) return res.status(400).send("Aucun fichier envoyé");

        const userId = req.session.user.id;
        const user = req.session.user;

        // 1. Upload vers Cloudinary (Stockage)
        const cloudImage = await uploadFromBuffer(req.file.buffer);

        // 2. Analyse IA par Mindee
        const analysis = await mindeeService.analyzeIdDocument(req.file.buffer);

        let verificationStatus = "MANUAL_CHECK"; // Par défaut, vérification manuelle

        // 3. Logique de Vérification Automatique (Auto-Validation)
        if (analysis.isValid && analysis.confidence > 0.85) {
            // Normalisation des noms pour comparaison (MAJUSCULES, sans espaces)
            const nameOnCard = (analysis.surnames + " " + analysis.givenNames).toUpperCase().replace(/\s/g, '');
            const nameOnAccount = user.name.toUpperCase().replace(/\s/g, '');

            // Si le nom correspond (ou est inclus), on valide automatiquement !
            if (nameOnCard.includes(nameOnAccount) || nameOnAccount.includes(nameOnCard)) {
                verificationStatus = "VERIFIED";
            }
        }

        // 4. Sauvegarde en Base de Données
        // On utilise 'upsert' pour créer le profil s'il n'existe pas, ou le mettre à jour
        await prisma.tenantProfile.upsert({
            where: { userId: userId },
            update: {
                idCardUrl: cloudImage.secure_url,
                idCardStatus: verificationStatus,
                extractedData: analysis
            },
            create: {
                userId: userId,
                idCardUrl: cloudImage.secure_url,
                idCardStatus: verificationStatus,
                extractedData: analysis
            }
        });

        // 5. Réponse au client
        if (verificationStatus === "VERIFIED") {
            res.json({ status: "success", message: "Identité vérifiée instantanément ! ✅" });
        } else {
            res.json({ status: "pending", message: "Document reçu. En attente de validation manuelle par nos équipes." });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erreur lors de l'analyse du document" });
    }
};

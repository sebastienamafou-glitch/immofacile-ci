// src/controllers/kycController.js
const prisma = require('../prisma/client');
const { uploadFromBuffer } = require('../utils/cloudinary');
const mindeeService = require('../services/mindeeService');

exports.uploadIdCard = async (req, res) => {
    try {
        if (!req.file) return res.status(400).send("Aucun fichier envoyé");

        const userId = req.session.user.id;
        const user = req.session.user;

        // 1. Upload vers Cloudinary (Toujours stocker la preuve)
        const cloudImage = await uploadFromBuffer(req.file.buffer);

        // 2. Analyse IA par Mindee (Sécurisé)
        let analysis = null;
        try {
            analysis = await mindeeService.analyzeIdDocument(req.file.buffer);
        } catch (apiError) {
            console.error("⚠️ API Mindee indisponible:", apiError.message);
            // Si l'IA échoue, on ne bloque pas l'user, on passe en manuel
            analysis = { isValid: false, confidence: 0 };
        }

        let verificationStatus = "MANUAL_CHECK"; // Par défaut, sécurité maximale

        // 3. RÈGLE DE SÉCURITÉ AUDIT V3 🛡️
        // On exige un score > 0.9 (90%) pour valider automatiquement
        const STRICT_THRESHOLD = 0.9;

        if (analysis && analysis.isValid && analysis.confidence >= STRICT_THRESHOLD) {
            
            // Normalisation stricte des noms (MAJUSCULES, A-Z uniquement)
            const nameOnCard = (analysis.surnames + " " + analysis.givenNames)
                                .toUpperCase().replace(/[^A-Z]/g, '');
            const nameOnAccount = user.name.toUpperCase().replace(/[^A-Z]/g, '');

            // Vérification de correspondance
            if (nameOnCard.includes(nameOnAccount) || nameOnAccount.includes(nameOnCard)) {
                verificationStatus = "VERIFIED";
            } else {
                console.log(`⛔ KYC Refusé : Noms divergents (${nameOnAccount} vs ${nameOnCard})`);
            }
        } else {
            console.log(`⚠️ KYC Manuel : Confiance IA trop basse (${analysis?.confidence || 0})`);
        }

        // 4. Sauvegarde en Base de Données
        await prisma.tenantProfile.upsert({
            where: { userId: userId },
            update: {
                idCardUrl: cloudImage.secure_url,
                idCardStatus: verificationStatus,
                extractedData: analysis ? JSON.parse(JSON.stringify(analysis)) : {}
            },
            create: {
                userId: userId,
                idCardUrl: cloudImage.secure_url,
                idCardStatus: verificationStatus,
                extractedData: analysis ? JSON.parse(JSON.stringify(analysis)) : {}
            }
        });

        // 5. Réponse au client
        if (verificationStatus === "VERIFIED") {
            res.json({ status: "success", message: "Identité vérifiée et validée ! ✅" });
        } else {
            res.json({ 
                status: "pending", 
                message: "Document reçu. En attente de validation manuelle par nos équipes (Sécurité renforcée)." 
            });
        }

    } catch (error) {
        console.error("❌ Erreur Critique Upload:", error);
        res.status(500).json({ error: "Erreur serveur lors du traitement du document" });
    }
};

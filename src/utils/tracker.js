const prisma = require('../prisma/client');

/**
 * Enregistre une action utilisateur dans la base de données
 */
exports.trackAction = async (action, category, userId = null, metadata = {}) => {
    try {
        await prisma.activityLog.create({
            data: {
                action,
                category,
                userId,
                metadata
            }
        });
    } catch (error) {
        // Log discret pour ne pas bloquer l'expérience utilisateur
        console.error("⚠️ Erreur Tracking :", error.message);
    }
};

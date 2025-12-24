
const prisma = require('../prisma/client');
const tracker = require('../utils/tracker');
const pushService = require('../utils/pushService'); // ✅ Import pour la notif

// 1. Demander un Agent (Matching Automatique)
exports.requestAgent = async (req, res) => {
    const { propertyId } = req.body;
    const ownerId = req.session.user.id;

    try {
        // A. Vérifier le bien
        const property = await prisma.property.findFirst({
            where: { id: propertyId, ownerId: ownerId }
        });

        if (!property) return res.status(403).json({ error: "Accès non autorisé." });

        // B. ALGORITHME DE MATCHING (ACTIVÉ 🚀)
        // On cherche un agent dans la MÊME commune
        const availableAgent = await prisma.user.findFirst({
            where: {
                role: 'AGENT',
                isActive: true,
                // ✅ FILTRE GÉOGRAPHIQUE ACTIVÉ
                commune: { 
                    contains: property.commune, 
                    mode: 'insensitive' // Ignore majuscules/minuscules
                } 
            },
            orderBy: {
                // On prend celui qui a le moins de travail en cours
                managedProperties: { _count: 'asc' }
            }
        });

        // Si aucun agent local, on cherche un agent global (Plan B)
        let finalAgent = availableAgent;
        if (!finalAgent) {
            finalAgent = await prisma.user.findFirst({
                where: { role: 'AGENT', isActive: true },
                orderBy: { managedProperties: { _count: 'asc' } }
            });
        }

        if (!finalAgent) {
            return res.status(404).json({ 
                success: false, 
                message: "Aucun agent disponible pour le moment." 
            });
        }

        // C. Assigner l'agent
        await prisma.property.update({
            where: { id: propertyId },
            data: { managedById: finalAgent.id }
        });

        // D. NOTIFICATION AUTOMATIQUE (ACTIVÉE 🔔)
        // On envoie un Push Web à l'agent pour le réveiller
        try {
            await pushService.sendNotificationToUser(finalAgent.id, {
                title: "Nouveau Mandat ! 🏠",
                body: `Vous avez été assigné à : ${property.title} (${property.commune}).`,
                url: "/agent/dashboard"
            });
        } catch (e) {
            console.log("Erreur notif agent (pas grave):", e.message);
        }

        // E. Tracking
        await tracker.trackAction("AGENT_ASSIGNED", "OWNER", ownerId, {
            property: property.title,
            agentName: finalAgent.name,
            matchType: availableAgent ? "LOCAL" : "GLOBAL" // On sait si c'est un agent du quartier ou pas
        });

        res.json({ 
            success: true, 
            message: `L'agent ${finalAgent.name} (${finalAgent.commune || 'Abidjan'}) a été assigné et notifié !`
        });

    } catch (error) {
        console.error("Erreur:", error);
        res.status(500).json({ error: "Erreur serveur." });
    }
};

// 2. Révoquer un Agent (Si ça se passe mal)
exports.revokeAgent = async (req, res) => {
    const { propertyId } = req.body;
    const ownerId = req.session.user.id;

    try {
        await prisma.property.updateMany({
            where: { 
                id: propertyId,
                ownerId: ownerId
            },
            data: { 
                managedById: null // On coupe le lien
            }
        });

        res.json({ success: true, message: "L'agent a été retiré de la gestion de ce bien." });

    } catch (error) {
        res.status(500).json({ error: "Impossible de révoquer l'agent." });
    }
};

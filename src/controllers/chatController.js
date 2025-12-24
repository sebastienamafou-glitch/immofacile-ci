const prisma = require('../prisma/client');
const tracker = require('../utils/tracker'); // Votre mouchard

exports.startWhatsAppChat = async (req, res) => {
    try {
        const { targetUserId, propertyId, context } = req.query;
        const currentUser = req.session.user;

        // 1. Récupérer les infos du destinataire
        const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
        
        if (!targetUser) return res.status(404).send("Utilisateur introuvable");

        // 2. Nettoyer le numéro (Enlever les espaces, ajouter l'indicatif 225 si manquant)
        let phone = targetUser.phone.replace(/\s+/g, ''); // Enlève les espaces
        if (!phone.startsWith('225')) phone = '225' + phone;

        // 3. Générer le message pré-rempli selon le contexte
        let message = "";
        if (context === 'RENT_REMINDER') {
            message = `Bonjour ${targetUser.name}, c'est ${currentUser.name} (ImmoFacile). Je vous relance concernant le loyer du bien. Merci de vérifier votre application.`;
        } else if (context === 'PLUMBER') {
            message = `Bonjour, je vous contacte via ImmoFacile pour une intervention plomberie.`;
        } else {
            message = `Bonjour ${targetUser.name}, je vous contacte via ImmoFacile.`;
        }

        // 4. L'ESPIONAGE (Traçabilité) 🕵️‍♂️
        // C'est ici qu'on résout le problème "Il a dit / Elle a dit"
        // On prouve que le propriétaire a tenté de contacter le locataire
        await tracker.trackAction("WHATSAPP_CLICK", currentUser.role, currentUser.id, {
            target: targetUser.name,
            context: context,
            propertyId: propertyId
        });

        // 5. Redirection vers WhatsApp (API URL Scheme)
        const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
        res.redirect(waUrl);

    } catch (error) {
        console.error("Erreur WhatsApp:", error);
        res.redirect('back');
    }
};

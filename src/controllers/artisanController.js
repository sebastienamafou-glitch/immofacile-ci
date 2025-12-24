const prisma = require('../prisma/client');
const { uploadFromBuffer } = require('../utils/cloudinary');

exports.getDashboard = async (req, res) => {
    try {
        const userId = req.session.user.id;
        
        // Trouver la fiche artisan liée au user connecté
        const artisan = await prisma.artisan.findUnique({
            where: { userId: userId },
            include: {
                incidents: {
                    where: { status: { in: ['ASSIGNED', 'IN_PROGRESS'] } },
                    include: { property: true, reporter: true } // Pour avoir l'adresse et le tel du locataire
                }
            }
        });

        if (!artisan) return res.render('errors/403', { message: "Profil artisan non configuré" });

        res.render('artisan/dashboard', { artisan, missions: artisan.incidents });
    } catch (error) {
        console.error(error);
        res.redirect('/login');
    }
};

exports.postCompleteMission = async (req, res) => {
    const { incidentId, comment } = req.body;
    try {
        // Upload photo de réparation (Optionnel mais recommandé)
        let proofUrl = null;
        if (req.files && req.files.length > 0) {
             // ... logique d'upload similaire à add-property ...
        }

        await prisma.incident.update({
            where: { id: incidentId },
            data: { 
                status: 'RESOLVED',
                description: { set: comment } // Ou créer un champ 'resolutionNote'
                // resolutionPhoto: proofUrl 
            }
        });

        res.redirect('/artisan/dashboard?success=mission_completed');
    } catch (error) {
        console.error(error);
        res.redirect('/artisan/dashboard?error=update_failed');
    }
};

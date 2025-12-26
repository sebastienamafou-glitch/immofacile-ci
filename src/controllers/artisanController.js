const prisma = require('../prisma/client');
const { uploadFromBuffer } = require('../utils/cloudinary');

exports.getDashboard = async (req, res) => {
    try {
        const userId = req.session.user.id;
        
        // 1. Récupérer le profil Artisan avec ses relations
        const artisan = await prisma.artisan.findUnique({
            where: { userId: userId },
            include: {
                // On inclut les infos utilisateur (Nom, Email...)
                user: true, 
                // On inclut les missions (Incidents assignés)
                incidents: {
                    where: { status: { in: ['ASSIGNED', 'IN_PROGRESS', 'RESOLVED'] } },
                    include: { 
                        property: { include: { owner: true } }, // Pour avoir le tél du propriétaire
                        reporter: true 
                    },
                    orderBy: { createdAt: 'desc' }
                }
            }
        });

        if (!artisan) return res.render('errors/403', { message: "Profil artisan non configuré" });

        // 2. Calcul des Statistiques (KPIs)
        const totalMissions = artisan.incidents.length;
        const activeMissions = artisan.incidents.filter(i => i.status === 'IN_PROGRESS').length;
        
        // Calcul des revenus du mois (Basé sur les factures validées - Simulation ici)
        const now = new Date();
        const monthlyEarnings = artisan.incidents
            .filter(i => i.status === 'RESOLVED' && i.updatedAt.getMonth() === now.getMonth())
            .reduce((sum, i) => sum + (i.cost || 0), 0); // Suppose un champ 'cost' sur l'incident

        const stats = {
            totalMissions,
            activeMissions,
            rating: artisan.rating || '5.0',
            monthlyEarnings
        };

        // 3. Formatage des données pour la vue
        // On passe 'user' (l'objet User) et 'artisan' (le profil métier)
        // On mappe les incidents vers 'missions' pour correspondre à la vue
        const missions = artisan.incidents.map(inc => ({
            id: inc.id,
            title: inc.title || "Réparation", // Fallback si pas de titre
            description: inc.description,
            status: inc.status,
            amount: inc.cost || 0,
            createdAt: inc.createdAt,
            property: inc.property
        }));

        res.render('artisan/dashboard', { 
            user: artisan.user, // IMPORTANT : La vue attend user.name
            artisan, 
            stats, 
            missions 
        });

    } catch (error) {
        console.error("Erreur Dashboard Artisan:", error);
        res.redirect('/login');
    }
};

exports.postCompleteMission = async (req, res) => {
    const { incidentId, comment } = req.body;
    try {
        // Logique d'upload (si fichier présent)
        let proofUrl = null;
        if (req.file) {
             const result = await uploadFromBuffer(req.file.buffer);
             proofUrl = result.secure_url;
        }

        await prisma.incident.update({
            where: { id: incidentId },
            data: { 
                status: 'RESOLVED',
                resolutionNote: comment, // Assurez-vous que ce champ existe dans Prisma ou utilisez description
                // resolutionPhoto: proofUrl 
            }
        });

        // Créditer le solde de l'artisan (Simulation - À adapter selon votre logique de paiement)
        // await prisma.artisan.update(...)

        res.redirect('/artisan/dashboard?success=mission_completed');
    } catch (error) {
        console.error(error);
        res.redirect('/artisan/dashboard?error=update_failed');
    }
};

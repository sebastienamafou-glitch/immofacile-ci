// src/routes/systemRoutes.js (Version CTO V4)
const sealedBails = await prisma.lease.count({ where: { NOT: { signatureHash: null } } });

router.get('/status', auth.isAdmin, async (req, res) => {
    try {
        const data = await Dispatcher.runParallel({
            users: prisma.user.count(),
            properties: prisma.property.count(),
            // 🟢 NOUVEAU : Surveillance des flux financiers V4
            totalWallet: prisma.user.aggregate({ _sum: { walletBalance: true } }),
            unpaidBails: prisma.lease.count({ where: { status: 'PENDING_FEES' } }),
            dbTime: prisma.$queryRaw`SELECT NOW()`
        });

        res.json({
            success: true,
            timestamp: new Date(),
            region: "iad1", // Virginie, USA
            stats: {
                ...data,
                // On formate le solde pour le dispatcher
                totalCash: data.totalWallet?._sum?.walletBalance || 0
            }
        });
    } catch (error) {
        res.status(500).json({ error: "Erreur lors du dispatch système" });
    }
});

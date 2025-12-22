const webPush = require('web-push');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Configuration initiale
webPush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

module.exports = {
  // 1. Sauvegarder l'abonnement d'un utilisateur
  async saveSubscription(userId, subscription) {
    return await prisma.pushSubscription.create({
      data: {
        userId,
        endpoint: subscription.endpoint,
        keys: subscription.keys
      }
    });
  },

  // 2. Envoyer une notification à un utilisateur spécifique
  async sendNotificationToUser(userId, payload) {
    // Récupérer tous les appareils de l'utilisateur
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId }
    });

    const notifications = subscriptions.map(sub => {
      // Structure attendue par web-push
      const pushConfig = {
        endpoint: sub.endpoint,
        keys: sub.keys
      };
      
      return webPush.sendNotification(pushConfig, JSON.stringify(payload))
        .catch(err => {
          if (err.statusCode === 410 || err.statusCode === 404) {
            // L'abonnement n'est plus valide (utilisateur a supprimé l'app), on nettoie la BDD
            console.log('Suppression abonnement périmé');
            prisma.pushSubscription.delete({ where: { id: sub.id } });
          }
        });
    });

    return Promise.all(notifications);
  }
};

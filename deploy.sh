#!/bin/bash

echo "🚀 Démarrage du déploiement ImmoFacile V5..."

# 1. Récupération de la dernière version
git pull origin main

# 2. Installation des dépendances et de l'optimiseur d'images
npm install
npm install sharp # ✅ Recommandé par vos logs de build

# 3. Synchronisation de la base de données (Prisma)
# On génère le client et on pousse le schéma vers la DB de production
npx prisma generate
npx prisma db push

# 4. Build de l'application Next.js
# Note: Les erreurs TS/ESLint sont ignorées via votre config
npm run build

# 5. Redémarrage du processus (avec PM2 pour le monitoring)
pm2 restart immofacile-v5 || pm2 start npm --name "immofacile-v5" -- start

echo "✅ Déploiement terminé avec succès !"

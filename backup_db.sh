#!/bin/bash

# --- CONFIGURATION ---
# Charge les variables d'environnement (assure-toi que le chemin est correct)
source .env

BACKUP_DIR="./backups"
DATE=$(date +%Y-%m-%d_%Hh%M)
FILE_NAME="immofacile_backup_$DATE.sql.gz"

# Création du dossier si inexistant
mkdir -p $BACKUP_DIR

echo "📂 Début de la sauvegarde pour ImmoFacile V5..."

# --- EXÉCUTION ---
# Utilise la DATABASE_URL définie dans ton .env pour pg_dump
pg_dump $DATABASE_URL | gzip > $BACKUP_DIR/$FILE_NAME

# --- NETTOYAGE ---
# Garde seulement les sauvegardes des 7 derniers jours
find $BACKUP_DIR -type f -mtime +7 -name "*.sql.gz" -delete

if [ $? -eq 0 ]; then
  echo "✅ Sauvegarde réussie : $BACKUP_DIR/$FILE_NAME"
else
  echo "❌ Erreur lors de la sauvegarde"
  exit 1
fi

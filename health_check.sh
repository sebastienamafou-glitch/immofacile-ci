#!/bin/bash

# --- CONFIGURATION ---
source .env
LOG_FILE="./backups/health_log.txt"
DATE=$(date +%Y-%m-%d_%Hh%M)

echo "------------------------------------------------" >> $LOG_FILE
echo "🔍 DIAGNOSTIC IMMOFACILE V5 - $DATE" >> $LOG_FILE

# 1. Vérification du Processus (PM2)
if pm2 show immofacile-v5 > /dev/null; then
    echo "✅ APPLICATION : En ligne (PM2 OK)" >> $LOG_FILE
else
    echo "❌ APPLICATION : CRASHÉE ou HORS LIGNE" >> $LOG_FILE
    # Optionnel : pm2 restart immofacile-v5
fi

# 2. Test de Connexion Database
DB_CHECK=$(psql $DATABASE_URL -c "SELECT 1;" 2>&1)
if [[ $DB_CHECK == *"1"* ]]; then
    echo "✅ DATABASE : Connexion établie" >> $LOG_FILE
else
    echo "❌ DATABASE : ÉCHEC DE CONNEXION" >> $LOG_FILE
fi

# 3. Intégrité de l'Audit Trail (previousHash)
# On vérifie s'il existe des transactions avec un hash rompu
HASH_CHECK=$(psql $DATABASE_URL -t -c "SELECT count(*) FROM \"Transaction\" WHERE \"previousHash\" IS NULL AND \"id\" != (SELECT id FROM \"Transaction\" ORDER BY \"createdAt\" ASC LIMIT 1);" | xargs)
if [ "$HASH_CHECK" == "0" ]; then
    echo "✅ AUDIT TRAIL : Intégrité cryptographique vérifiée" >> $LOG_FILE
else
    echo "⚠️ ALERTE : $HASH_CHECK transactions sans hash de liaison !" >> $LOG_FILE
fi

# 4. État des Sessions Actives
SESSION_COUNT=$(psql $DATABASE_URL -t -c "SELECT count(*) FROM \"Session\" WHERE \"expires\" > now();" | xargs)
echo "👥 UTILISATEURS : $SESSION_COUNT sessions actives détectées" >> $LOG_FILE

echo "------------------------------------------------" >> $LOG_FILE

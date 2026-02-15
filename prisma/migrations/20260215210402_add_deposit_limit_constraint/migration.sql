-- Ajout de la contrainte de vérification (CHECK constraint)
-- Cela rejette toute tentative d'insertion si la caution dépasse 2 mois de loyer
ALTER TABLE "Lease"
ADD CONSTRAINT check_deposit_limit
CHECK ("depositAmount" <= "monthlyRent" * 2);

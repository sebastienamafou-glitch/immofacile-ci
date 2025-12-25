const crypto = require('crypto');

/**
 * Génère une empreinte numérique SHA-256 unique pour un document
 * @param {string|Buffer} content - Le contenu du bail ou de l'état des lieux
 * @returns {string} - Le Hash (Empreinte) unique
 */
exports.calculateDocumentHash = (content) => {
    // On utilise SHA-256 pour une sécurité bancaire
    return crypto.createHash('sha256').update(content).digest('hex');
};

/**
 * Vérifie si un document correspond à une empreinte stockée
 * @param {string|Buffer} content - Le document à vérifier
 * @param {string} storedHash - L'empreinte enregistrée en base de données
 * @returns {boolean}
 */
exports.verifyIntegrity = (content, storedHash) => {
    const currentHash = this.calculateDocumentHash(content);
    return currentHash === storedHash;
};

/**
 * Génère un OTP sécurisé pour la signature
 */
exports.generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

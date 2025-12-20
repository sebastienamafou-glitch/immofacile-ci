// utils/security.js
const crypto = require('crypto');

exports.generateRandomPassword = (length = 8) => {
    // Génère un mot de passe fort (ex: "aB9#fG2!")
    return crypto.randomBytes(length).toString('hex').slice(0, length);
};

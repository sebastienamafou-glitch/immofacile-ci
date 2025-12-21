const crypto = require('crypto');
exports.generateRandomPassword = (length = 8) => {
    return crypto.randomBytes(length).toString('hex').slice(0, length);
};
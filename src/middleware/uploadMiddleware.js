// middleware/uploadMiddleware.js
const multer = require('multer');
const path = require('path');

// Configuration du stockage :
// IMPORTANT : On utilise la mémoire (RAM) car Vercel interdit l'écriture sur le disque.
const storage = multer.memoryStorage();

// Filtre de sécurité (Images uniquement)
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb(new Error('Format non supporté : Seules les images (JPG, PNG, WEBP) sont autorisées !'));
    }
};

// Export du middleware configuré
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Limite 5MB
    fileFilter: fileFilter
});

module.exports = upload;

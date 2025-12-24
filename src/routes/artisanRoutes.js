const express = require('express');
const router = express.Router();
const artisanController = require('../controllers/artisanController');
const { isArtisan } = require('../middleware/authMiddleware'); // À créer/vérifier dans authMiddleware
const upload = require('../middleware/uploadMiddleware');

// Dashboard : Liste des missions
router.get('/dashboard', isArtisan, artisanController.getDashboard);

// Action : Terminer une mission (avec photo)
router.post('/complete-mission', isArtisan, upload.single('proof'), artisanController.postCompleteMission);

module.exports = router;

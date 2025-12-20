// routes/agentRoutes.js
const express = require('express');
const router = express.Router();
const agentController = require('../controllers/agentController');
const auth = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware'); // Notre nouveau fichier

// Sécurité : Seuls les AGENTS passent
router.use(auth.isAgent);

// Dashboard
router.get('/dashboard', agentController.getDashboard);

// Ajout de Lead (Formulaire avec Photo)
// 'leadPhoto' correspond au name="leadPhoto" dans votre fichier dashboard-agent.ejs
router.post('/add-lead', upload.single('leadPhoto'), agentController.postAddLead);

module.exports = router;

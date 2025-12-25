// src/routes/cronRoutes.js
const express = require('express');
const router = express.Router();
const cronController = require('../controllers/cronController');

// Cette route sera appelée par Vercel tous les jours
router.get('/remind-unpaid', cronController.runDailyReminders);

module.exports = router;

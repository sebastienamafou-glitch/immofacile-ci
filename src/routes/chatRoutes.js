const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { isAuthenticated } = require('../middleware/authMiddleware');

// Route magique : /chat/whatsapp?targetUserId=...&context=...
router.get('/whatsapp', isAuthenticated, chatController.startWhatsAppChat);

module.exports = router;

const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

// 👇 MODIFICATION ICI : On utilise isOwner au lieu de isAuthenticated
const { isOwner } = require('../middleware/authMiddleware');

// Route magique : /chat/whatsapp?targetUserId=...&context=...
router.get('/whatsapp', isOwner, chatController.startWhatsAppChat);

module.exports = router;

const aiService = require('../services/aiService');

exports.generateDescription = async (req, res) => {
    try {
        const { type, pieces, commune, details } = req.body;
        
        // Validation basique
        if (!commune || !type) {
            return res.status(400).json({ error: "Informations manquantes" });
        }

        const description = await aiService.generateAdDescription({ type, pieces, commune, details });
        
        res.json({ success: true, description });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.askLegalBot = async (req, res) => {
    try {
        const { question } = req.body;
        const answer = await aiService.getLegalAdvice(question);
        res.json({ success: true, answer });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

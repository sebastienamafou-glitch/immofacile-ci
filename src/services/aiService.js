const OpenAI = require('openai');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

exports.generateAdDescription = async (data) => {
    try {
        const { type, pieces, commune, details } = data;

        // Le Prompt (L'instruction stricte)
        const prompt = `
            Tu es un expert immobilier à Abidjan. Rédige une description d'annonce immobilière attractive, professionnelle et chaleureuse pour le bien suivant :
            - Type : ${type}
            - Nombre de pièces : ${pieces}
            - Quartier/Commune : ${commune}
            - Détails supplémentaires : ${details}

            Consignes :
            - Utilise un ton vendeur adapté au marché ivoirien.
            - Mets en avant la localisation (${commune}).
            - Structure le texte avec des émojis.
            - Ne dépasse pas 150 mots.
            - N'invente pas d'équipements non mentionnés, mais sublime ceux existants.
        `;

        const completion = await openai.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "gpt-3.5-turbo", // Rapide et pas cher
        });

        return completion.choices[0].message.content;

    } catch (error) {
        console.error("Erreur OpenAI:", error);
        throw new Error("L'IA n'a pas pu générer la description.");
    }
};

exports.getLegalAdvice = async (question) => {
    try {
        const prompt = `
            Tu es un juriste expert en droit immobilier ivoirien.
            Réponds à la question suivante d'un propriétaire : "${question}"
            
            Consignes :
            - Cite les articles de loi ivoiriens si pertinent (Code civil, lois sur le bail à usage d'habitation).
            - Sois concis, rassurant et professionnel.
            - Si la question concerne un impayé, suggère la procédure d'injonction de payer.
        `;

        const completion = await openai.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "gpt-4", // Plus intelligent pour le juridique
        });

        return completion.choices[0].message.content;
    } catch (error) {
        console.error("Erreur OpenAI:", error);
        throw new Error("Service juridique indisponible.");
    }
};

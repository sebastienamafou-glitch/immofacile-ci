const { Client } = require("mindee");

// Initialisation du client Mindee
const mindeeClient = new Client({ apiKey: process.env.MINDEE_API_KEY });

exports.analyzeIdDocument = async (fileBuffer) => {
    try {
        // Chargement du fichier depuis le buffer (mémoire)
        const inputSource = mindeeClient.docFromBuffer(fileBuffer);

        // Appel à l'API "International ID" (Gère CNI et Passeports)
        // Note: Assurez-vous d'avoir activé cette API sur votre dashboard Mindee
        const apiResponse = await mindeeClient.parse(
            require("mindee").product.InternationalIdV2, // Ou PassportV1 selon votre choix
            inputSource
        );

        if (!apiResponse.document) {
            throw new Error("Document non reconnu");
        }

        const prediction = apiResponse.document.inference.prediction;

        // On retourne les données structurées
        return {
            isValid: true,
            surnames: prediction.surnames.map(n => n.value).join(" "),
            givenNames: prediction.givenNames.map(n => n.value).join(" "),
            documentNumber: prediction.documentNumber.value,
            expiryDate: prediction.expiryDate.value,
            birthDate: prediction.birthDate.value,
            // Score de confiance global (0 à 1)
            confidence: prediction.documentNumber.confidence
        };

    } catch (error) {
        console.error("Erreur Mindee:", error);
        return { isValid: false, error: error.message };
    }
};

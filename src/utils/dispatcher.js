/**
 * src/utils/dispatcher.js
 * Centralise les exécutions asynchrones pour optimiser le temps de réponse
 */

class Dispatcher {
    /**
     * Exécute une liste de tâches asynchrones en parallèle
     * @param {Object} tasks - Un objet où chaque clé est un nom de tâche et chaque valeur une promesse
     * @returns {Promise<Object>} - Les résultats indexés par les clés d'origine
     */
    static async runParallel(tasks) {
        const keys = Object.keys(tasks);
        const promises = Object.values(tasks);

        const results = await Promise.allSettled(promises);

        const summary = {};
        results.forEach((result, index) => {
            const key = keys[index];
            if (result.status === 'fulfilled') {
                summary[key] = result.value;
            } else {
                console.error(`❌ Dispatcher Error [${key}]:`, result.reason);
                summary[key] = null; // Sécurité pour éviter de faire planter la vue
            }
        });

        return summary;
    }
}

module.exports = Dispatcher;

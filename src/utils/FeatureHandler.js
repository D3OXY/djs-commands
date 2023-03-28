const getAllFiles = require('./get-all-files');

class FeatureHandler {
    constructor(instance, featureDir, client) {
        this.readFiles(instance, featureDir, client);
    }

    async readFiles(instance, featureDir, client) {
        const files = getAllFiles(featureDir);

        for (const file of files) {
            const func = require(file);
            if (func instanceof Function) {
                await func(instance, client);
            }
        }
    }
}

module.exports = FeatureHandler;
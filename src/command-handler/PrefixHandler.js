const guildPrefixSchema = require('../models/guild-prefix-schema');

class PrefixHandler {
    _prefixes = new Map();
    _defaultPrefix = '!';

    constructor() {
        this.loadPrefixes();
    }

    async loadPrefixes() {
        const results = await guildPrefixSchema.find({});
        for (const result of results) {
            this._prefixes.set(result._id, result.prefix);
        }
    }

    get defaultPrefix() {
        return this._defaultPrefix;
    }

    get(guildId) {
        if (!guildId) return defaultPrefix;

        return this._prefixes.get(guildId) || this.defaultPrefix;
    }

    async set(guildId, prefix) {
        this._prefixes.set(guildId, prefix);

        await guildPrefixSchema.findOneAndUpdate(
            {
                _id: guildId,
            },
            {
                _id: guildId,
                prefix,
            },
            {
                upsert: true,
            }
        );
    }
}

module.exports = PrefixHandler;
import DJSCommands from "../../typings";

import guildPrefixSchema from '../models/guild-prefix-schema';

class PrefixHandler {
    private _prefixes = new Map();
    private _defaultPrefix = "!";
    private _instance: DJSCommands;

    constructor(instance: DJSCommands) {
        this._instance = instance;
        this._defaultPrefix = instance.defaultPrefix;

        this.loadPrefixes();
    }

    private async loadPrefixes() {
        if (!this._instance.isConnectedToDB) {
            return;
        }

        const results = await guildPrefixSchema.find({});
        for (const result of results) {
            this._prefixes.set(result._id, result.prefix);
        }
    }

    public get defaultPrefix() {
        return this._defaultPrefix;
    }

    public get(guildId?: string) {
        if (!guildId) return this.defaultPrefix;

        return this._prefixes.get(guildId) || this.defaultPrefix;
    }

    public async set(guildId: string, prefix: string) {
        if (!this._instance.isConnectedToDB) {
            return;
        }

        if (prefix.toLowerCase() === 'reset') {
            this._prefixes.delete(guildId);

            await guildPrefixSchema.findOneAndDelete({
                _id: guildId,
            });
            return;
        }

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

export default PrefixHandler;
"use strict";
const { Schema, model, models } = require('mongoose');
const guildPrefixSchema = new Schema({
    // guildId
    _id: {
        type: String,
        required: true
    },
    prefix: {
        type: String,
        required: true
    }
});
const name = "guild-prefix";
module.exports = models[name] || model(name, guildPrefixSchema);

"use strict";
const { Schema, model, models } = require('mongoose');
const channelCommandsSchema = new Schema({
    //guildId-commnadName
    _id: {
        type: String,
        required: true
    },
    channels: {
        type: [String],
        required: true
    }
});
const name = 'Channel-commands';
module.exports = models[name] || model(name, channelCommandsSchema);

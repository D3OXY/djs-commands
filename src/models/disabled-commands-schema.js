const { Schema, model, models } = require('mongoose');

const disabledCommandSchema = new Schema({
    // guildId-commandName
    _id: {
        type: String,
        required: true
    }
})

const name = "disabled-commands";

module.exports = models[name] || model(name, disabledCommandSchema)
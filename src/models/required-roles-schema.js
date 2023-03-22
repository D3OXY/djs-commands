const { Schema, model, models } = require('mongoose');

const requiredRolesSchema = new Schema({
    // guildId-commandName
    _id: {
        type: String,
        required: true
    },
    roles: {
        type: [String],
        required: true
    }
})

const name = "required-roles";

module.exports = models[name] || model(name, requiredRolesSchema)
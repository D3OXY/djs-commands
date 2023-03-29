const { ApplicationCommandOptionType } = require('discord.js');

module.exports = {
    description: "Sets Your Device",
    type: "SLASH",
    testOnly: true,
    // delete: true,
    options: [
        {
            name: 'device',
            type: ApplicationCommandOptionType.String,
            description: 'The device you want to set',
            required: true,
            autocomplete: true,
        }
    ],

    autocomplete: (interaction, command, arg) => {
        // console.log(command.commandName)
        // console.log('Arg: ', arg)

        return ['Desktop', 'Laptop', 'Mobile', 'Tablet']
    },
    callback: async ({ args }) => {
        return `Your device is now set to ${args[0]}`
    }
}
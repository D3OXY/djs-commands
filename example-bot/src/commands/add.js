const { ApplicationCommandOptionType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
module.exports = {
    aliases: ["a"],
    //number
    minArgs: 2,
    //number
    maxArgs: 2,
    correctSyntax: 'Correct Syntax: {PREFIX}add {ARGS}',
    expectedArgs: '<num 1> <num 2>',
    //"BOTH", "SLASH", "LEGACY"
    type: 'BOTH',
    //true, false
    // testOnly: true,
    //required
    description: "Adds Multiple Numbers.",
    //true, false
    delete: false,
    //true, false
    guildOnly: true,
    //true false
    ownerOnly: false,
    init: async (client, instance) => {
        // console.log('Add Command Loaded!')
    },
    //true, false
    // reply: false,
    // true, false, "ephemeral"
    // deferReply: "ephemeral",
    // options: [
    //     {
    //         name: 'num1',
    //         description: 'The number to add',
    //         required: true,
    //         type: ApplicationCommandOptionType.Number,
    //     },
    //     {
    //         name: 'num2',
    //         description: 'The number to add',
    //         required: true,
    //         type: ApplicationCommandOptionType.Number,  
    //     }
    // ],
    cooldowns: {
        // perUser: 0, //0 sec
        // perUserPerGuild: "10 m", //10 min
        // perGuild: "10 h", //10 hrs
        // global: "10 d", //10 days
        errorMessage: "Please Wait {TIME}", // {TIME} will be replaced with the time
        global: "10 m",
    },
    permissions: [
        PermissionFlagsBits.Administrator,
        PermissionFlagsBits.BanMembers,
    ],

    callback: ({ args, cancelCooldown, updateCooldown }) => {

        cancelCooldown()
        // const expires = new Date()
        // expires.setSeconds(expires.getSeconds() + 30)
        // updateCooldown(expires)

        let sum = 0
        for (const arg of args) {
            sum += parseInt(arg)
        }
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('testing')
                    .setLabel('Testing')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('👍')
            )

        return {
            content: `The Sum of ${args[0]} and ${args[1]} is ${sum}`,
            components: [
                row
            ]
        }
    }
}
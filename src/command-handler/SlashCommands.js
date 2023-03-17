const { ApplicationCommandOptionType } = require('discord.js');

class SlashCommands {
    constructor(client) {
        this._client = client
    }

    async getCommands(guildId) {
        let commands

        if (guildId) {
            const guild = await this._client.guilds.fetch(guildId)
            commands = guild.commands
        } else {
            commands = this._client.application.commands
        }

        await commands.fetch();

        return commands;
    }

    async create(name, description, options, guildId) {
        const commands = await this.getCommands(guildId)

        const existingCommand = commands.cache.find((cmd) => cmd.name === name)

        if (existingCommand) {
            console.log(`Ignoring command ${name} because it already exists.`)
            return
        }

        await commands.create({
            name,
            description,
            options
        })
    }

    async delete(commandName, guildId) {
        const commands = await this.getCommands(guildId)

        const existingCommand = commands.cache.find((cmd) => cmd.name === commandName)

        if (!existingCommand) return;

        await existingCommand.delete();
    }

    createOptions({ expectedArgs = '', minArgs = 0 }) {
        const options = []


        if (expectedArgs) {
            const split = expectedArgs
                //<num1> <num2>
                .substring(1, expectedArgs.length - 1)
                // num1> <num2
                .split(/[>\]] [<\[]/)
            // [ 'num1', 'num2' ]

            for (let a = 0; a < split.length; ++a) {
                const arg = split[a]

                options.push({
                    name: arg.toLowerCase().replace(/\s+/g, '-'),
                    description: arg,
                    type: ApplicationCommandOptionType.String,
                    required: a < minArgs
                })
            }

        }

        return options;
    }
}

module.exports = SlashCommands
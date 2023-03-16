const path = require('path')
const { InteractionType } = require('discord.js')

const getAllFiles = require("../utils/get-all-files")
const Command = require("./Command")
const SlashCommands = require('./SlashCommands')

class CommandHandler {
    // <CommandName, Instance of the Command class>
    _commands = new Map()
    _validations = this.getValidations('run-time')
    _prefix = '!';

    constructor(instance, commandDir, client) {
        this._instance = instance
        this._commandDir = commandDir
        this._SlashCommands = new SlashCommands(client)

        this.readFiles()
        this.messageListener(client)
        this.interactionListener(client)
    }

    readFiles() {
        const files = getAllFiles(this._commandDir)
        const validations = this.getValidations('syntax')

        for (const file of files) {
            const commandObject = require(file)

            let commandName = file.split(/[/\\]/)
            commandName = commandName.pop()
            commandName = commandName.split('.')[0]

            const command = new Command(this._instance, commandName, commandObject)


            const { description, options = [], type, testOnly, delete: del } = commandObject

            if (del) {
                if (type === "SLASH" || type === "BOTH") {
                    if (testOnly) {
                        for (const guildId of this._instance.testServers) {
                            this._SlashCommands.delete(
                                command.commandName,
                                guildId
                            )
                        }
                    } else {
                        this._SlashCommands.delete(command.commandName)
                    }
                }


                continue
            }

            for (const validation of validations) {
                validation(command)
            }

            this._commands.set(command.commandName, command)

            if (type === "SLASH" || type === "BOTH") {
                if (testOnly) {
                    for (const guildId of this._instance.testServers) {
                        this._SlashCommands.create(command.commandName, description, options, guildId)
                    }
                } else {
                    this._SlashCommands.create(command.commandName, description, options)
                }
            }
        }
        // console.log(this.commands)
    }

    async runCommand(commandName, args, message, interaction) {
        const command = this._commands.get(commandName)
        if (!command) return;

        const { callback, type } = command.commandObject

        if (message && type === "SLASH") return;

        const usage = { message, interaction, args, text: args.join(' '), guild: message ? message.guild : interaction.guild }

        for (const validation of this._validations) {
            if (!validation(command, usage, this._prefix)) {
                return
            }
        }

        return await callback(usage)
    }

    messageListener(client) {

        client.on('messageCreate', async (message) => {
            const { content } = message
            if (!content.startsWith(this._prefix)) return;

            const args = content.split(/\s+/)
            const commandName = args.shift().substring(this._prefix.length).toLowerCase()

            const response = await this.runCommand(commandName, args, message, null)

            if (response) {
                message.reply(response).catch(() => { })
            }
        });
    }

    interactionListener(client) {
        client.on('interactionCreate', async (interaction) => {
            if (interaction.type !== InteractionType.ApplicationCommand) return;

            const args = ['5', '10']

            const response = await this.runCommand(interaction.commandName, args, null, interaction)

            if (response) {
                interaction.reply(response).catch(() => { })
            }
        })
    }

    getValidations(folder) {
        const validations = getAllFiles(path.join(__dirname, `./validations/${folder}`)).map((filePath) => {
            return require(filePath)
        })

        return validations;
    }
}

module.exports = CommandHandler
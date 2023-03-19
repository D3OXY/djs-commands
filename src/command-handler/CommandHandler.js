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
        this._client = client

        this.readFiles()
        this.messageListener(client)
        this.interactionListener(client)
    }

    async readFiles() {
        const files = getAllFiles(this._commandDir)
        const validations = this.getValidations('syntax')

        for (const file of files) {
            const commandObject = require(file)

            let commandName = file.split(/[/\\]/)
            commandName = commandName.pop()
            commandName = commandName.split('.')[0]

            const command = new Command(this._instance, commandName, commandObject)


            const {
                description,
                type,
                testOnly,
                delete: del,
                aliases = [],
                init = () => { },
            } = commandObject

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

            await init(this._client, this._instance)

            const names = [command.commandName, ...aliases]

            for (const name of names) {
                this._commands.set(name, command)
            }


            if (type === "SLASH" || type === "BOTH") {
                const options = commandObject.options || this._SlashCommands.createOptions(commandObject)

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

    async runCommand(command, args, message, interaction) {

        const { callback, type } = command.commandObject

        if (message && type === "SLASH") return;

        const usage = {
            message,
            interaction,
            args,
            text: args.join(' '),
            guild: message ? message.guild : interaction.guild,
            member: message ? message.member : interaction.member,
            user: message ? message.author : interaction.user
        }

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

            const command = this._commands.get(commandName)
            if (!command) return;

            const { reply, deferReply } = command.commandObject

            if (deferReply) message.channel.sendTyping();

            const response = await this.runCommand(command, args, message, null)

            if (!response) return;

            if (reply) {
                message.reply(response).catch(() => { });
            } else {
                message.channel.send(response).catch(() => { });
            }
        });
    }

    interactionListener(client) {
        client.on('interactionCreate', async (interaction) => {
            if (interaction.type !== InteractionType.ApplicationCommand) return;

            const args = interaction.options.data.map(({ value }) => {
                return String(value)
            })

            const command = this._commands.get(interaction.commandName)
            if (!command) return;

            const { deferReply } = command.commandObject

            if (deferReply) await interaction.deferReply({
                ephemeral: deferReply === "ephemeral"
            });

            const response = await this.runCommand(command, args, null, interaction)

            if (!response) return;

            if (deferReply) {
                interaction.editReply(response).catch(() => { })
            } else {
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
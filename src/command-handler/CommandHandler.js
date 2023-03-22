const path = require('path')
const { InteractionType } = require('discord.js')

const getAllFiles = require("../utils/get-all-files")
const Command = require("./Command")
const SlashCommands = require('./SlashCommands')
const { cooldownTypes } = require('../utils/Cooldowns')
const ChannelCommands = require('./ChannelCommands')

class CommandHandler {
    // <CommandName, Instance of the Command class>
    _commands = new Map()
    _validations = this.getValidations('run-time')
    _prefix = '!';
    _channelCommands = new ChannelCommands()

    constructor(instance, commandDir, client) {
        this._instance = instance
        this._commandDir = commandDir
        this._SlashCommands = new SlashCommands(client)
        this._client = client

        this.readFiles()
        this.messageListener(client)
        this.interactionListener(client)
    }

    get commands() {
        return this._commands
    }

    get channelCommands() {
        return this._channelCommands
    }

    async readFiles() {
        const defaultCommands = getAllFiles(path.join(__dirname, './commands'))
        const files = getAllFiles(this._commandDir)
        const validations = this.getValidations('syntax')

        for (const file of [...defaultCommands, ...files]) {
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

            if (del || this._instance.disabledDefaultCommands.includes(commandName.toLowerCase())) {
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

        const { callback, type, cooldowns } = command.commandObject

        if (message && type === "SLASH") return;

        const text = args.join(' ')
        const guild = message ? message.guild : interaction.guild
        const member = message ? message.member : interaction.member
        const user = message ? message.author : interaction.user
        const channel = message ? message.channel : interaction.channel


        const usage = {
            instance: command.instance,
            message,
            interaction,
            args,
            text,
            guild,
            member,
            user,
            channel
        }

        for (const validation of this._validations) {
            if (!await validation(command, usage, this._prefix)) {
                return
            }
        }

        if (cooldowns) {
            let cooldownType

            for (const type of cooldownTypes) {
                if (cooldowns[type]) {
                    cooldownType = type
                    break
                }
            }

            const cooldownUsage = {
                cooldownType,
                userId: user.id,
                actionId: `command_${command.commandName}`,
                guildId: guild?.id,
                duration: cooldowns[cooldownType],
                errorMessage: cooldowns.errorMessage,
            }

            const result = this._instance.cooldowns.canRunAction(cooldownUsage)

            if (typeof result === 'string') {
                return result
            }

            await this._instance.cooldowns.start(cooldownUsage)

            usage.cancelCooldown = () => {
                this._instance.cooldowns.cancelCooldown(cooldownUsage)
            }

            usage.updateCooldown = (expires) => {
                this._instance.cooldowns.updateCooldown(cooldownUsage, expires)
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
            if (interaction.type === InteractionType.ApplicationCommandAutocomplete) {
                this.handleAutoComplete(interaction)
                return
            }
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

    async handleAutoComplete(interaction) {
        const command = this._commands.get(interaction.commandName)
        if (!command) return;

        const { autocomplete } = command.commandObject
        if (!autocomplete) return;

        const focusedOption = interaction.options.getFocused(true)

        const choices = await autocomplete(interaction, command, focusedOption.name)

        const filtered = choices.filter((choice) =>
            choice.toLowerCase().startsWith(focusedOption.value.toLowerCase())
        ).slice(0, 25)


        await interaction.respond(
            filtered.map((choice) => ({
                name: choice,
                value: choice
            }))
        )
    }

    getValidations(folder) {
        const validations = getAllFiles(path.join(__dirname, `./validations/${folder}`)).map((filePath) => {
            return require(filePath)
        })

        return validations;
    }
}

module.exports = CommandHandler
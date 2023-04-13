import { ApplicationCommandOption, Client, ApplicationCommandOptionType } from "discord.js";
import logToConsole from "../utils/DJSLogger";
import chalk from "chalk";
import DJSLogger from "../utils/DJSLogger";

class SlashCommands {
    private _client: Client;
    private DJSLogger: DJSLogger;

    constructor(client: Client) {
        this._client = client
        this.DJSLogger = new DJSLogger()
    }

    async getCommands(guildId?: string) {
        let commands

        if (guildId) {
            const guild = await this._client.guilds.fetch(guildId)
            commands = guild.commands
        } else {
            commands = this._client.application?.commands;
        }

        // @ts-ignore
        await commands?.fetch();

        return commands;
    }

    areOptionsDifferent(options: ApplicationCommandOption[], existingOptions: any[]) {
        for (let a = 0; a < options.length; a++) {
            const option = options[a]
            const existing = existingOptions[a]

            if (option.name !== existing.name || option.type !== existing.type || option.description !== existing.description, option.autocomplete !== existing.autocomplete) {
                return true
            }
        }

        return false
    }

    async create(name: string, description: string, options: ApplicationCommandOption[], guildId?: string) {
        if (guildId && !this._client.guilds.cache.has(guildId)) {
            new DJSLogger().warn(`Could not find guild ${guildId} to create command ${name} in. Skipping...`)
            return;
        }

        const commands = await this.getCommands(guildId)
        if (!commands) {
            throw new Error(`Could not find commands for guild ${guildId}`);
        }

        const existingCommand = commands.cache.find((cmd) => cmd.name === name)

        if (existingCommand) {
            const { description: existingDescription, options: existingOptions } = existingCommand

            if (description !== existingDescription || options.length !== existingOptions.length || this.areOptionsDifferent(options, existingOptions)) {
                this.DJSLogger.info(`Updating the command "${name}"`)

                await commands.edit(existingCommand.id, {
                    description,
                    options
                })
            }
            return;
        }

        await commands.create({
            name,
            description,
            options
        })
    }

    async delete(commandName: string, guildId?: string) {
        if (guildId && !this._client.guilds.cache.has(guildId)) {
            new DJSLogger().warn(`Could not find guild ${guildId} to delete command ${commandName} in. Skipping...`)
            return;
        }

        const commands = await this.getCommands(guildId)

        const existingCommand = commands?.cache.find((cmd) => cmd.name === commandName)

        if (!existingCommand) return;

        await existingCommand.delete();
    }

    createOptions({ expectedArgs = '', minArgs = 0 }): ApplicationCommandOption[] {
        const options: ApplicationCommandOption[] = []


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

export default SlashCommands;
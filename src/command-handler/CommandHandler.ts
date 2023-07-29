import {
    Client,
    CommandInteraction,
    GuildMember,
    InteractionType,
    Message,
    TextChannel,
} from "discord.js";
import path from "path";

import getAllFiles from "../utils/get-all-files";
import Command from "./Command";
import SlashCommands from "./SlashCommands";
import ChannelCommands from "./ChannelCommands";
import CustomCommands from "./CustomCommands";
import DisabledCommands from "./DisabledCommands";
import PrefixHandler from "./PrefixHandler";
import CommandType from "../utils/CommandType";
import DJSCommands, {
    CommandObject,
    CommandUsage,
    FileData,
    InternalCooldownConfig,
} from "../../typings";
import DefaultCommands from "../utils/DefaultCommands";

class CommandHandler {
    // <CommandName, Instance of the Command class>
    private _commands: Map<string, Command> = new Map();
    private _validations = this.getValidations(
        path.join(__dirname, "validations", "runtime")
    );
    private _instance: DJSCommands;
    private _client: Client;
    private _commandsDir: string;
    private _slashCommands: SlashCommands;
    private _channelCommands: ChannelCommands;
    private _customCommands: CustomCommands;
    private _disabledCommands: DisabledCommands;
    private _prefixes: PrefixHandler;
    // _prefixes = new PrefixHandler()

    constructor(instance: DJSCommands, commandDir: string, client: Client) {
        this._instance = instance;
        this._commandsDir = commandDir;
        this._slashCommands = new SlashCommands(client);
        this._client = client;
        this._channelCommands = new ChannelCommands(instance);
        this._customCommands = new CustomCommands(instance, this);
        this._disabledCommands = new DisabledCommands(instance);
        this._prefixes = new PrefixHandler(instance);

        this._validations = [
            ...this._validations,
            ...this.getValidations(instance.validations?.runtime),
        ];

        this.readFiles();
    }

    get commands() {
        return this._commands;
    }

    get channelCommands() {
        return this._channelCommands;
    }

    get slashCommands() {
        return this._slashCommands;
    }

    get customCommands() {
        return this._customCommands;
    }

    get disabledCommands() {
        return this._disabledCommands;
    }

    get prefixHandler() {
        return this._prefixes;
    }

    private async readFiles() {
        const defaultCommands = getAllFiles(
            path.join(__dirname, "./default-commands")
        );
        const files = getAllFiles(this._commandsDir);
        const validations = [
            ...this.getValidations(
                path.join(__dirname, "validations", "syntax")
            ),
            ...this.getValidations(this._instance.validations?.syntax),
        ];

        // Load default commands
        for (let fileData of defaultCommands) {
            const { filePath } = fileData;
            const commandObject: CommandObject = fileData.fileContents;

            const split = filePath.split(/[\/\\]/);
            let commandName = split.pop()!;
            commandName = commandName.split(".")[0];

            const command = new Command(
                this._instance,
                commandName,
                commandObject
            );

            const {
                description,
                type,
                testOnly,
                delete: del,
                aliases = [],
                init = () => {},
            } = commandObject;

            let defaultCommandValue: DefaultCommands | undefined;

            for (const [key, value] of Object.entries(DefaultCommands)) {
                if (value === commandName.toLowerCase()) {
                    defaultCommandValue =
                        DefaultCommands[key as keyof typeof DefaultCommands];
                    break;
                }
            }

            if (
                del ||
                (defaultCommandValue &&
                    this._instance.disabledDefaultCommands.includes(
                        defaultCommandValue
                    )) ||
                this._instance.disableAllDefaultCommands
            ) {
                if (type === "SLASH" || type === "BOTH") {
                    if (testOnly) {
                        for (const guildId of this._instance.testServers) {
                            this._slashCommands.delete(
                                command.commandName,
                                guildId
                            );
                        }
                    } else {
                        this._slashCommands.delete(command.commandName);
                    }
                }

                continue;
            }

            for (const validation of validations) {
                validation(command);
            }

            await init(this._client, this._instance);

            const names = [command.commandName, ...aliases];

            for (const name of names) {
                this._commands.set(name, command);
            }

            if (type === "SLASH" || type === "BOTH") {
                const options =
                    commandObject.options ||
                    this._slashCommands.createOptions(commandObject);

                if (testOnly) {
                    for (const guildId of this._instance.testServers) {
                        this._slashCommands.create(
                            command.commandName,
                            description!,
                            options,
                            guildId
                        );
                    }
                }
                this._slashCommands.create(
                    command.commandName,
                    description!,
                    options
                );
            }
        }

        //Load Other Commands
        for (let fileData of files) {
            const { filePath } = fileData;
            const commandObject: CommandObject = fileData.fileContents;

            const split = filePath.split(/[\/\\]/);
            let commandName = split.pop()!;
            commandName = commandName.split(".")[0];

            const command = new Command(
                this._instance,
                commandName,
                commandObject
            );

            const {
                description,
                type,
                testOnly,
                delete: del,
                aliases = [],
                init = () => {},
            } = commandObject;

            let defaultCommandValue: DefaultCommands | undefined;

            for (const [key, value] of Object.entries(DefaultCommands)) {
                if (value === commandName.toLowerCase()) {
                    defaultCommandValue =
                        DefaultCommands[key as keyof typeof DefaultCommands];
                    break;
                }
            }

            if (del) {
                if (type === "SLASH" || type === "BOTH") {
                    if (testOnly) {
                        for (const guildId of this._instance.testServers) {
                            this._slashCommands.delete(
                                command.commandName,
                                guildId
                            );
                        }
                    } else {
                        this._slashCommands.delete(command.commandName);
                    }
                }

                continue;
            }

            for (const validation of validations) {
                validation(command);
            }

            await init(this._client, this._instance);

            const names = [command.commandName, ...aliases];

            for (const name of names) {
                this._commands.set(name, command);
            }

            if (type === "SLASH" || type === "BOTH") {
                const options =
                    commandObject.options ||
                    this._slashCommands.createOptions(commandObject);

                if (testOnly) {
                    for (const guildId of this._instance.testServers) {
                        this._slashCommands.create(
                            command.commandName,
                            description!,
                            options,
                            guildId
                        );
                    }
                } else {
                    this._slashCommands.create(
                        command.commandName,
                        description!,
                        options
                    );
                }
            }
        }
    }

    public async runCommand(
        command: Command,
        args: string[],
        message: Message | null,
        interaction: CommandInteraction | null
    ) {
        const { callback, type, cooldowns } = command.commandObject;

        if (message && type === CommandType.SLASH) return;

        const guild = message ? message.guild : interaction?.guild;
        const member = (
            message ? message.member : interaction?.member
        ) as GuildMember;
        const user = message ? message.author : interaction?.user;
        const channel = (
            message ? message.channel : interaction?.channel
        ) as TextChannel;

        const usage: CommandUsage = {
            client: command.instance.client,
            instance: command.instance,
            message,
            interaction,
            args,
            text: args.join(" "),
            guild,
            member,
            user: user!,
            channel,
        };

        for (const validation of this._validations) {
            if (
                !(await validation(
                    command,
                    usage,
                    this._prefixes.get(guild?.id)
                ))
            ) {
                return;
            }
        }

        if (cooldowns) {
            const cooldownUsage: InternalCooldownConfig = {
                cooldownType: cooldowns.type,
                userId: user!.id,
                actionId: `command_${command.commandName}`,
                guildId: guild?.id,
                duration: cooldowns.duration,
                errorMessage: cooldowns.errorMessage,
            };

            const result = this._instance.cooldowns.canRunAction(cooldownUsage);

            if (typeof result === "string") {
                return result;
            }

            await this._instance.cooldowns?.start(cooldownUsage);

            usage.cancelCooldown = () => {
                this._instance.cooldowns?.cancelCooldown(cooldownUsage);
            };

            usage.updateCooldown = (expires: Date) => {
                this._instance.cooldowns?.updateCooldown(
                    cooldownUsage,
                    expires
                );
            };
        }

        return await callback(usage);
    }

    private getValidations(folder?: string) {
        if (!folder) return [];
        const validations = getAllFiles(folder).map(
            (fileData: FileData) => fileData.fileContents
        );

        return validations;
    }
}

export default CommandHandler;

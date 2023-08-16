import {
    ApplicationCommandOption,
    Client,
    CommandInteraction,
    Guild,
    GuildMember,
    Message,
    TextChannel,
    User,
} from "discord.js";

import DJSLogger from "./dist/utils/DJSLogger";
import Cooldowns from "./dist/util/Cooldowns";
// import CommandType from "./src/util/CommandType";
// import CooldownTypes from "./src/util/CooldownTypes";
// import DefaultCommands from "./src/util/DefaultCommands";

const CommandType = {
    SLASH: "SLASH",
    LEGACY: "LEGACY",
    BOTH: "BOTH",
} as const;

type CommandType = (typeof CommandType)[keyof typeof CommandType];

const DefaultCommands = {
    ChannelOnly: "channelonly",
    CustomCommand: "customcommand",
    Prefix: "prefix",
    RequiredPermissions: "requiredpermissions",
    RequiredRoles: "requiredroles",
    ToggleCommand: "togglecommand",
} as const;

type DefaultCommands = (typeof DefaultCommands)[keyof typeof DefaultCommands];

const CooldownTypes = {
    perUser: "perUser",
    perUserPerGuild: "perUserPerGuild",
    perGuild: "perGuild",
    global: "global",
} as const;

type CooldownTypes = (typeof CooldownTypes)[keyof typeof CooldownTypes];

export default class DJSCommands {
    private _client!: Client;
    private _testServers!: string[];
    private _botOwners!: string[];
    private _cooldowns: Cooldowns | undefined;
    private _defaultCommand!: DefaultCommandObject;
    private _validations!: Validations;
    private _commandHandler: CommandHandler | undefined;
    private _eventHandler!: EventHandler;
    private _isConnectedToDB = false;
    private _defaultPrefix!: string;
    private _antiCrash: boolean = false;

    private DJSLogger: DJSLogger;

    constructor(mainConfig: MainConfig);

    public get client(): Client;
    public get testServers(): string[];
    public get botOwners(): string[];
    public get cooldowns(): Cooldowns;
    public get defaultCommand(): DefaultCommandObject;
    public get commandHandler(): CommandHandler;
    public get eventHandler(): EventHandler;
    public get validations(): Validations;
    public get isConnectedToDB(): boolean;
    public get defaultPrefix(): string;
    public get antiCrash(): boolean;
}

export interface MainConfig {
    client: Client;
    mongoUri?: string;
    commandDir?: string;
    featuresDir?: string;
    testServers?: string[];
    botOwners?: string[];
    cooldownConfig?: CooldownConfig;
    defaultCommand?: DefaultCommandObject;
    events?: Events;
    validations?: Validations;
    defaultPrefix?: string;
    antiCrash?: boolean;
}

export interface CooldownConfig {
    errorMessage: string;
    botOwnersBypass: boolean;
    dbRequired: number;
}

export interface Events {
    dir: string;
    [key: string]: any;
}

export interface Validations {
    runtime?: string;
    syntax?: string;
}

export class Cooldowns {
    constructor(instance: DJSCommands, cooldownConfig: CooldownConfig) {}
}

export interface CooldownUsage {
    errorMessage?: string;
    type: CooldownTypes;
    duration: string;
}

export interface InternalCooldownConfig {
    cooldownType: CooldownTypes;
    userId: string;
    actionId: string;
    guildId?: string;
    duration?: string;
    errorMessage?: string;
}

export interface CommandUsage {
    client: Client;
    instance: DJSCommands;
    message?: Message | null;
    interaction?: CommandInteraction | null;
    args: string[];
    text: string;
    guild?: Guild | null;
    member?: GuildMember;
    user: User;
    channel?: TextChannel;
    cancelCooldown?: function;
    updateCooldown?: function;
}

export interface DefaultCommandObject {
    disableAll?: boolean;
    testOnly?: boolean;
    disabledCommands?: DefaultCommands[];
}

export interface CommandObject {
    delete?: boolean;
    aliases?: string[];
    minArgs?: number;
    maxArgs?: number;
    options?: APIApplicationCommandOption[];
    correctSyntax?: string;
    description?: string;
    type: CommandType;
    testOnly?: boolean;
    guildOnly?: boolean;
    ownerOnly?: boolean;
    permissions?: bigint[];
    deferReply?: "ephemeral" | boolean;
    cooldowns?: CooldownUsage;
    autocomplete?: function;
    init?: function;
    callback: (commandUsage: CommandUsage) => unknown;
    reply?: boolean;
    expectedArgs?: string;
}

export type FileData = {
    filePath: string;
    fileContents: any;
};

export class Command {
    constructor(
        instance: DJSCommands,
        commandName: string,
        commandObject: CommandObject
    );

    public get instance(): DJSCommands;
    public get commandName(): string;
    public get commandObject(): CommandObject;
}

export {
    CommandObject,
    Command,
    CommandType,
    CooldownTypes,
    DefaultCommands,
    DJSLogger,
};

import { ApplicationCommandOption, Client, CommandInteraction, Guild, GuildMember, Message, TextChannel, User } from 'discord.js';

/// <reference types="./src/util/CommandType" />
import CommandType from './src/util/CommandType'
/// <reference types="./src/util/CooldownTypes" />
import CooldownTypes from './src/util/CooldownTypes'
/// <reference types="./src/util/Cooldowns" />
import Cooldowns from './src/util/Cooldowns'
/// <reference types="../src/util/DefaultCommands" />
import DefaultCommands from './src/util/DefaultCommands'

export default class DJSCommands {
    private _client!: Client
    private _testServers!: string[];
    private _botOwners!: string[];
    private _cooldowns: Cooldowns | undefined;
    private _disabledDefaultCommands!: DefaultCommands[];
    private _validations!: Validations;
    private _commandHandler: CommandHandler | undefined;
    private _eventHandler!: EventHandler;
    private _isConnectedToDB = false
    private _defaultPrefix!: string;

    constructor(mainConfig: MainConfig)

    public get client(): Client
    public get testServers(): string[]
    public get botOwners(): string[]
    public get cooldowns(): Cooldowns
    public get disabledDefaultCommands(): DefaultCommands[]
    public get commandHandler(): CommandHandler
    public get eventHandler(): EventHandler
    public get validations(): Validations
    public get isConnectedToDB(): boolean
    public get defaultPrefix(): string
}

export interface MainConfig {
    client: Client;
    mongoUri?: string;
    commandDir: string;
    featuresDir?: string;
    testServers?: string[];
    botOwners?: string[];
    cooldownConfig?: CooldownConfig;
    disabledDefaultCommands?: DefaultCommands[];
    events?: Events;
    validations?: Validations;
    defaultPrefix?: string;
}

export interface CooldownConfig {
    errorMessage: string
    botOwnersBypass: boolean
    dbRequired: number
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
    constructor(instance: DJSCommands, cooldownConfig: CooldownConfig) { }
}

export interface CooldownUsage {
    errorMessage?: string
    type: CooldownTypes
    duration: string
}

export interface InternalCooldownConfig {
    cooldownType: CooldownTypes
    userId: string
    actionId: string
    guildId?: string
    duration?: string
    errorMessage?: string
}

export interface CommandUsage {
    client: Client
    instance: DJSCommands
    message?: Message | null
    interaction?: CommandInteraction | null
    args: string[]
    text: string
    guild?: Guild | null
    member?: GuildMember
    user: User
    channel?: TextChannel
    cancelCooldown?: function
    updateCooldown?: function
}

export interface CommandObject {
    delete?: boolean
    aliases?: string[]
    minArgs?: number
    maxArgs?: number
    options?: ApplicationCommandOption[]
    correctSyntax?: string
    description?: string
    type: CommandType
    testOnly?: boolean
    guildOnly?: boolean
    ownerOnly?: boolean
    permissions?: bigint[]
    deferReply?: 'ephemeral' | boolean
    cooldowns?: CooldownUsage
    autocomplete?: function
    init?: function
    callback: (commandUsage: CommandUsage) => unknown
    reply?: boolean
    expectedArgs?: string
}

export type FileData = {
    filePath: string
    fileContents: any
}

export class Command {
    constructor(instance: DJSCommands, commandName: string, commandObject: CommandObject)

    public get instance(): DJSCommands
    public get commandName(): string
    public get commandObject(): CommandObject
}

export { CommandObject, Command, CommandType, CooldownTypes, DefaultCommands }
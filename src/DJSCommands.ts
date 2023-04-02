import { Client } from 'discord.js'
import mongoose from 'mongoose'
import chalk from 'chalk';

import CommandHandler from "./command-handler/CommandHandler"
import EventHandler from './event-handler/EventHandler'
import DJSCommands, { MainConfig, Validations, Events } from '../typings'
import Cooldowns from './utils/Cooldowns'
import DefaultCommands from './utils/DefaultCommands'
import FeaturesHandler from './utils/FeaturesHandler'

class Main {
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
    constructor(mainConfig: MainConfig) {
        this.init(mainConfig)
    }

    private async init(mainConfig: MainConfig) {
        //chalk Start
        const name = chalk.bold(chalk.cyan('D3OXY'))
        const lines = chalk.yellow("############################################")
        const line = chalk.yellow("#")
        const Title = chalk.red(chalk.underline(chalk.bold("DJS Commands")))
        let firstLine = `${lines}`
        let secondLine = `${line}               ${Title}               ${line}`
        let thirdLine = `${line}                                          ${line}`
        let fourthLine = `${line}           The Bot Has Started!           ${line}`
        let fifthLine = `${line}          Made with ❤️  by ${name}.          ${line}`
        let sixthLine = `${lines}`
        console.log(`
                ${firstLine}
                ${secondLine}
                ${thirdLine}
                ${fourthLine}
                ${fifthLine}
                ${sixthLine}
        `)
        //chalk End

        const {
            client,
            mongoUri,
            commandDir,
            featuresDir,
            testServers = [],
            botOwners = [],
            cooldownConfig = {},
            disabledDefaultCommands = [],
            events = {},
            validations = {},
            defaultPrefix = '!'
        } = mainConfig

        if (!client) {
            console.log(chalk.cyan(chalk.bold("DJSCommands >> ")) + chalk.red("A Discord Client is required to use DJSCommands."))
            process.exit(1)
        }

        if (mongoUri) {
            await this.connectToMongo(mongoUri).then(() => {
                console.log(chalk.cyan(chalk.bold("DJSCommands >> ")) + chalk.green("Connected to MongoDB"))
            })
        } else {
            console.log(chalk.cyan(chalk.bold("DJSCommands >> ")) + chalk.red("MongoDB connection failed, No URI provided."))
        }

        this._client = client
        this._testServers = testServers;
        this._botOwners = botOwners
        this._disabledDefaultCommands = disabledDefaultCommands
        this._validations = validations
        this._defaultPrefix = defaultPrefix

        this._cooldowns = new Cooldowns(this as unknown as DJSCommands, {
            errorMessage: 'Please wait {TIME} before doing that again.',
            botOwnersBypass: false,
            dbRequired: 300, // 5 minutes
            ...cooldownConfig
        })


        if (commandDir) {
            this._commandHandler = new CommandHandler(this as unknown as DJSCommands, commandDir, client)
        }

        if (featuresDir) {
            new FeaturesHandler(this as unknown as DJSCommands, featuresDir, client)
        }

        this._eventHandler = new EventHandler(this as unknown as DJSCommands, events as Events, client)
    }

    public get client() {
        return this._client
    }

    public get testServers() {
        return this._testServers
    }

    public get botOwners() {
        return this._botOwners
    }

    public get cooldowns() {
        return this._cooldowns
    }

    public get disabledDefaultCommands() {
        return this._disabledDefaultCommands
    }

    public get commandHandler() {
        return this._commandHandler
    }

    public get eventHandler() {
        return this._eventHandler
    }

    public get validations() {
        return this._validations
    }

    public get isConnectedToDB(): boolean {
        return this._isConnectedToDB
    }

    public get defaultPrefix() {
        return this._defaultPrefix
    }

    private async connectToMongo(mongoUri: string) {
        await mongoose.connect(mongoUri, {
            keepAlive: true
        })

        this._isConnectedToDB = true
    }
}

export default Main
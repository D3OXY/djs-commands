import { Client } from "discord.js";
import mongoose from "mongoose";
import chalk from "chalk";

import CommandHandler from "./command-handler/CommandHandler";
import EventHandler from "./event-handler/EventHandler";
import DJSCommands, {
    MainConfig,
    Validations,
    Events,
    DefaultCommandObject,
} from "../typings";
import Cooldowns from "./utils/Cooldowns";
import FeaturesHandler from "./utils/FeaturesHandler";
import DJSLogger from "./utils/DJSLogger";

class Main {
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

    constructor(mainConfig: MainConfig) {
        this.DJSLogger = new DJSLogger();
        this.init(mainConfig);
    }

    private async init(mainConfig: MainConfig) {
        //chalk Start
        const name = chalk.bold(chalk.cyan("D3OXY"));
        const lines = chalk.yellow(
            "############################################"
        );
        const line = chalk.yellow("#");
        const Title = chalk.red(chalk.underline(chalk.bold("DJS Commands")));
        let firstLine = `${lines}`;
        let secondLine = `${line}               ${Title}               ${line}`;
        let thirdLine = `${line}                                          ${line}`;
        let fourthLine = `${line}           The Bot Has Started!           ${line}`;
        let fifthLine = `${line}          Made with ❤️  by ${name}.          ${line}`;
        let sixthLine = `${lines}`;
        console.log(`
                ${firstLine}
                ${secondLine}
                ${thirdLine}
                ${fourthLine}
                ${fifthLine}
                ${sixthLine}
        `);
        //chalk End

        const {
            client,
            mongoUri,
            commandDir,
            featuresDir,
            testServers = [],
            botOwners = [],
            cooldownConfig = {},
            defaultCommand = {},
            events = {},
            validations = {},
            defaultPrefix = "!",
            antiCrash = false,
        } = mainConfig;

        if (!client) {
            // logToConsole(chalk.red())
            this.DJSLogger.error(
                "A Discord Client is required to use DJSCommands.",
                true
            );
        }

        if (mongoUri) {
            await this.connectToMongo(mongoUri).then(() => {
                this.DJSLogger.success("Connected to MongoDB");
            });
        } else {
            this.DJSLogger.warn(
                "No MongoDB URI provided. Any features that require a database will not function properly."
            );
        }

        if (antiCrash) {
            process.on("uncaughtException", (error, origin) => {
                console.log("----- Uncaught exception -----");
                console.log(error);
                console.log("----- Exception origin -----");
                console.log(origin);
            });

            process.on("unhandledRejection", (reason, promise) => {
                console.log("----- Unhandled Rejection at -----");
                console.log(promise);
                console.log("----- Reason -----");
                console.log(reason);
            });
        }

        this._client = client;

        testServers.forEach((serverId) => {
            if (this._client.guilds.cache.has(serverId)) return;
            this.DJSLogger.warn(
                `The Guild ID "${serverId}" is not a valid Guild ID. Please check your config.`
            );
            testServers.splice(testServers.indexOf(serverId), 1);
        });

        this._testServers = testServers;
        this._botOwners = botOwners;
        this._defaultCommand = defaultCommand;
        this._validations = validations;
        this._defaultPrefix = defaultPrefix;
        this._antiCrash = antiCrash;

        this._cooldowns = new Cooldowns(this as unknown as DJSCommands, {
            errorMessage: "Please wait {TIME} before doing that again.",
            botOwnersBypass: false,
            dbRequired: 300, // 5 minutes
            ...cooldownConfig,
        });

        if (commandDir) {
            this._commandHandler = new CommandHandler(
                this as unknown as DJSCommands,
                commandDir,
                client
            );
        } else {
            this.DJSLogger.warn(
                "No command directory provided. No commands will be loaded."
            );
        }

        if (featuresDir) {
            new FeaturesHandler(
                this as unknown as DJSCommands,
                featuresDir,
                client
            );
        }

        this._eventHandler = new EventHandler(
            this as unknown as DJSCommands,
            events as Events,
            client
        );
    }

    public get client() {
        return this._client;
    }

    public get testServers() {
        return this._testServers;
    }

    public get botOwners() {
        return this._botOwners;
    }

    public get cooldowns() {
        return this._cooldowns;
    }

    public get defaultCommand() {
        return this._defaultCommand;
    }

    public get commandHandler() {
        return this._commandHandler;
    }

    public get eventHandler() {
        return this._eventHandler;
    }

    public get validations() {
        return this._validations;
    }

    public get isConnectedToDB(): boolean {
        return this._isConnectedToDB;
    }

    public get defaultPrefix() {
        return this._defaultPrefix;
    }

    public get antiCrash() {
        return this._antiCrash;
    }

    private async connectToMongo(mongoUri: string) {
        await mongoose.connect(mongoUri, {
            // keepAlive: true,
        });

        this._isConnectedToDB = true;
    }
}

export default Main;

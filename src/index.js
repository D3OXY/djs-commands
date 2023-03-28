const mongoose = require('mongoose')

const CommandHandler = require("./command-handler/CommandHandler")
const EventHandler = require('./event-handler/EventHandler')
const Cooldowns = require('./utils/Cooldowns')

class Main {
    constructor({
        client,
        mongoUri,
        commandDir,
        testServers = [],
        botOwners = [],
        cooldownConfig = {},
        disabledDefaultCommands = [],
        events = {},
        validations = {},
        defaultPrefix = '!'
    }) {
        if (!client) throw new Error('A Client is required.')

        this._testServers = testServers
        this._botOwners = botOwners
        this._cooldowns = new Cooldowns({
            instance: this,
            ...cooldownConfig
        })
        this._disabledDefaultCommands = disabledDefaultCommands.map(cmd => cmd.toLowerCase())
        this._validations = validations
        this._defaultPrefix = defaultPrefix

        if (mongoUri) this.connectToMongo(mongoUri);

        if (commandDir) {
            this._commandHandler = new CommandHandler(this, commandDir, client)
        }

        this._eventHandler = new EventHandler(this, events, client)

    }

    get testServers() {
        return this._testServers
    }

    get botOwners() {
        return this._botOwners
    }

    get cooldowns() {
        return this._cooldowns
    }

    get disabledDefaultCommands() {
        return this._disabledDefaultCommands
    }

    get commandHandler() {
        return this._commandHandler
    }

    get eventHandler() {
        return this._eventHandler
    }

    get validations() {
        return this._validations
    }

    connectToMongo(mongoUri) {
        mongoose.connect(mongoUri, {
            keepAlive: true
        })
    }
}

module.exports = Main
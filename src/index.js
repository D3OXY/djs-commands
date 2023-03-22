const mongoose = require('mongoose')

const CommandHandler = require("./command-handler/CommandHandler")
const Cooldowns = require('./utils/Cooldowns')

class Main {
    constructor({
        client,
        mongoUri,
        commandDir,
        testServers = [],
        botOwners = [],
        cooldownConfig = {}
    }) {
        if (!client) throw new Error('A Client is required.')

        this._testServers = testServers
        this._botOwners = botOwners
        this._cooldowns = new Cooldowns({
            instance: this,
            ...cooldownConfig
        })

        if (mongoUri) this.connectToMongo(mongoUri);

        if (commandDir) {
            this._commandHandler = new CommandHandler(this, commandDir, client)
        }

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

    get commandHandler() {
        return this._commandHandler
    }

    connectToMongo(mongoUri) {
        mongoose.connect(mongoUri, {
            keepAlive: true
        })
    }
}

module.exports = Main
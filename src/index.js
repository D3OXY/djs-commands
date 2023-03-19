const mongoose = require('mongoose')

const CommandHandler = require("./command-handler/CommandHandler")

class Main {
    constructor({ client, mongoUri, commandDir, testServers = [], botOwners = [] }) {
        if (!client) throw new Error('A Client is required.')

        this._testServers = testServers
        this._botOwners = botOwners

        if (mongoUri) this.connectToMongo(mongoUri);

        if (commandDir) {
            new CommandHandler(this, commandDir, client)
        }

    }

    get testServers() {
        return this._testServers
    }

    get botOwners() {
        return this._botOwners
    }

    connectToMongo(mongoUri) {
        mongoose.connect(mongoUri, {
            keepAlive: true
        })
    }
}

module.exports = Main
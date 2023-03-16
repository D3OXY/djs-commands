const mongoose = require('mongoose')

const CommandHandler = require("./command-handler/CommandHandler")

class Main {
    constructor({ client, mongoUri, commandDir, testServers = [] }) {
        if (!client) throw new Error('A Client is required.')

        this._testServers = testServers

        if (mongoUri) this.connectToMongo(mongoUri);

        if (commandDir) {
            new CommandHandler(this, commandDir, client)
        }

    }

    get testServers() {
        return this._testServers
    }

    connectToMongo(mongoUri) {
        mongoose.connect(mongoUri, {
            keepAlive: true
        })
    }
}

module.exports = Main
const mongoose = require('mongoose')

const CommandHandler = require("./CommandHandler")

class Main {
    constructor({ client, mongoUri, commandDir }) {
        if (!client) throw new Error('A Client is required.')

        if (mongoUri) this.connectToMongo(mongoUri);

        if (commandDir) {
            new CommandHandler(commandDir, client)
        }

    }

    connectToMongo(mongoUri) {
        mongoose.connect(mongoUri, {
            keepAlive: true
        })
    }
}

module.exports = Main
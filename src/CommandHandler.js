const getAllFiles = require("./utils/get-all-files")

class CommandHandler {
    // <CommandName, CommandObject>
    commands = new Map()

    constructor(commandDir, client) {
        this.commandDir = commandDir
        this.readFiles()
        this.messageListener(client)
    }

    readFiles() {
        const files = getAllFiles(this.commandDir)

        for (const file of files) {
            const commandObject = require(file)

            let commandName = file.split(/[/\\]/)
            commandName = commandName.pop()
            commandName = commandName.split('.')[0]

            if (!commandObject.callback) {
                throw new Error(`Command "${commandName}" does not have a callback function.`)
            }


            this.commands.set(commandName.toLowerCase(), commandObject)
        }
        // console.log(this.commands)
    }

    messageListener(client) {
        client.on('messageCreate', (message) => {
            const { content } = message
            if (!content.startsWith('!')) return;

            const args = content.split(/\s+/)
            const commandName = args.shift().substring(1).toLowerCase()

            const commandObject = this.commands.get(commandName)
            if (!commandObject) return;

            const text = args.join(' ')
            const { callback } = commandObject
            callback({ message, args, text })
        });
    }
}

module.exports = CommandHandler
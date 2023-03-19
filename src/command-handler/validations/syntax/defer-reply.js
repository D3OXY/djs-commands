module.exports = (command) => {
    const { commandName, commandObject } = command
    const { deferReply } = commandObject

    if (deferReply && typeof deferReply !== "boolean" && deferReply !== 'ephemeral') {
        throw new Error(`Command "${commandName}" does not have a valid value for "deferReply". Must be true, false or 'ephemeral'`)
    }
}
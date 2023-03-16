module.exports = (command, usage, prefix) => {
    const { minArgs = 0, maxArgs = -1, correctSyntax } = command.commandObject
    const { length } = usage.args

    if (length < minArgs || (length > maxArgs && maxArgs !== -1)) {
        usage.message.reply(correctSyntax.replace('{PREFIX}', prefix))
        return false;
    }

    console.log(minArgs, maxArgs)
    console.log(length)

    return true;
}
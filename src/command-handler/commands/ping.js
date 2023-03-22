module.exports = {
    type: "BOTH",
    description: "Get the bot's ping",
    cooldown: {
        global: 5
    },
    callback: ({ interaction, message }) => {
        let ping
        if (message) {
            ping = Date.now() - message.createdTimestamp
        } else if (interaction) {
            ping = Date.now() - interaction.createdTimestamp
        }
        return `Bot ping: ${ping}ms`
    },
}
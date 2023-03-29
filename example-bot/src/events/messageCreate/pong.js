module.exports = (message) => {
    if (message.content === 'pong') {
        message.reply('Ping!');
    }
}
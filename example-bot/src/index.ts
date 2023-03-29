// APPLICATION_ID=757853204259274813
import { Client, IntentsBitField, Partials, Interaction, Message } from 'discord.js';
import path from 'path';
import CommandHandler from '@d3oxy/djs-commands';
require('dotenv').config();

const client = new Client({
    intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.DirectMessages
    ],
    partials: [Partials.Channel],
});

client.on('ready', () => {
    console.log(`Logged in as ${client.user?.tag}!`);

    new CommandHandler({
        client,
        mongoUri: process.env.MONGO_URI,
        commandDir: path.join(__dirname, 'commands'),
        featuresDir: path.join(__dirname, 'features'),
        testServers: ['756751516169142323'],
        botOwners: ['481864111005892618'],
        cooldownConfig: {
            errorMessage: "Please Wait {TIME} before doing that again.", // {TIME} will be replaced with the time
            botOwnersBypass: false, // true, false
            dbRequired: 300, //5 Min Cooldown. Longer than 5 Min will be stored in the database if provided.
        },
        disabledDefaultCommands: [
            'channelonly',
            // 'customcommand',
            // 'delcustomcomand',
            // 'prefix',
            // 'requiredpermissions',
            // 'requiredroles',
            // 'togglecommand',
        ],
        defaultPrefix: '!',
        events: {
            dir: path.join(__dirname, 'events'),
            interactionCreate: {
                isButton: (interaction: Interaction) => interaction.isButton(),
            },
            messageCreate: {
                isHuman: (message: Message) => !message.author.bot,
            },
        },
        validations: {
            // runtime: path.join(__dirname, 'validations', 'runtime'),
            syntax: path.join(__dirname, 'validations', 'syntax'),
        }
    })
});

client.login(process.env.APPLICATION_TOKEN);
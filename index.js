require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

const TOKEN = process.env.TOKEN;

// Spam settings
const SPAM_MESSAGES = [
    'SPAM SPAM SPAM',
    '🔥🔥🔥',
    'DISCORD BOT SPAM',
    '💀💀💀',
    'RIP NOTIFICATIONS',
    'SPAMMMMMM!',
    '🤖 BOT SPAM',
    '💥💥💥'
];

// Store active spams
const activeSpams = new Map();

client.once('ready', () => {
    console.log(`✅ ${client.user.tag} is online!`);
    console.log(`📝 Spam commands: !spam, !stopspam, !help`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.guild) return;

    const args = message.content.split(' ');
    const command = args[0].toLowerCase();

    // !help command
    if (command === '!help') {
        const embed = new EmbedBuilder()
            .setColor(0x000000)
            .setTitle('🖤 SPAM BOT COMMANDS')
            .setDescription('Black & White Edition')
            .addFields(
                { name: '!spam [count]', value: 'Spam messages in the channel\nDefault: 50, Max: 1000', inline: false },
                { name: '!spamhere [count]', value: 'Spam in current channel', inline: false },
                { name: '!stopspam', value: 'Stop all spam', inline: false },
                { name: '!status', value: 'Check spam status', inline: false },
                { name: '!help', value: 'Show this menu', inline: false }
            )
            .setFooter({ text: '⚡ SPAM BOT' })
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    }

    // !spam command
    if (command === '!spam' || command === '!spamhere') {
        const count = parseInt(args[1]) || 50;
        
        if (count < 1 || count > 1000) {
            return message.reply('❌ Count must be between 1 and 1000');
        }

        const channel = message.channel;
        const guildId = message.guild.id;
        
        // Check if already spamming
        if (activeSpams.has(guildId)) {
            return message.reply('⚠️ Already spamming! Use !stopspam first.');
        }

        // Send initial message
        const reply = await message.reply(`🚀 **SPAMMING ${count} MESSAGES!**\nType \`!stopspam\` to stop.`);
        
        let sent = 0;
        let failed = 0;
        let isActive = true;

        // Store spam state
        activeSpams.set(guildId, { 
            active: true, 
            count: count,
            sent: 0,
            failed: 0
        });

        // Spam loop
        for (let i = 0; i < count; i++) {
            // Check if stopped
            if (!activeSpams.get(guildId)?.active) {
                isActive = false;
                break;
            }

            const msg = SPAM_MESSAGES[Math.floor(Math.random() * SPAM_MESSAGES.length)];
            
            try {
                await channel.send(`${msg} #${i + 1}`);
                sent++;
                activeSpams.get(guildId).sent = sent;
            } catch (error) {
                failed++;
                activeSpams.get(guildId).failed = failed;
                
                // Rate limit handling
                if (error.code === 429) {
                    const wait = error.retryAfter || 2000;
                    await new Promise(resolve => setTimeout(resolve, wait));
                    i--; // Retry
                    continue;
                }
            }

            // Update status every 10 messages
            if (i % 10 === 0 || i === count - 1) {
                try {
                    await reply.edit(`🚀 **SPAMMING ${count} MESSAGES!**\n📨 Sent: ${sent}/${count} | ❌ Failed: ${failed}\nType \`!stopspam\` to stop.`);
                } catch (e) {}
            }

            // Delay between messages (100ms)
            if (i < count - 1 && isActive) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        // Clean up
        activeSpams.delete(guildId);

        if (isActive) {
            await reply.edit(`✅ **SPAM COMPLETE!**\n📨 Sent: ${sent}/${count} | ❌ Failed: ${failed}`);
        } else {
            await reply.edit(`⏹ **SPAM STOPPED!**\n📨 Sent: ${sent}/${count} | ❌ Failed: ${failed}`);
        }
    }

    // !stopspam command
    if (command === '!stopspam') {
        const guildId = message.guild.id;
        
        if (!activeSpams.has(guildId)) {
            return message.reply('ℹ️ No active spam to stop.');
        }

        const spam = activeSpams.get(guildId);
        spam.active = false;
        
        message.reply(`⏹ **STOPPING SPAM...**\n📨 Sent: ${spam.sent}/${spam.count} | ❌ Failed: ${spam.failed}`);
    }

    // !status command
    if (command === '!status') {
        const guildId = message.guild.id;
        
        if (!activeSpams.has(guildId)) {
            return message.reply('ℹ️ No active spam.');
        }

        const spam = activeSpams.get(guildId);
        message.reply(`📊 **SPAM STATUS**\n📨 Sent: ${spam.sent}/${spam.count}\n❌ Failed: ${spam.failed}\n⚡ Active: ${spam.active}`);
    }
});

// Error handling
client.on('error', (error) => {
    console.error('❌ Client error:', error);
});

// Login
client.login(TOKEN).catch(error => {
    console.error('❌ Failed to login:', error);
});

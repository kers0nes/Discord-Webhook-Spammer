const axios = require('axios');
const chalk = require('chalk');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

class WebhookSpammer {
    constructor(webhookUrl) {
        this.webhookUrl = webhookUrl;
        this.running = false;
        this.intervals = [];
        this.sentCount = 0;
        this.failedCount = 0;
    }

    async sendMessage(content, username = null, avatarUrl = null, embeds = null) {
        const payload = { content };
        if (username) payload.username = username;
        if (avatarUrl) payload.avatar_url = avatarUrl;
        if (embeds) payload.embeds = embeds;

        try {
            const response = await axios.post(this.webhookUrl, payload, {
                headers: { 'Content-Type': 'application/json' }
            });
            return { success: true, status: response.status };
        } catch (error) {
            const status = error.response?.status || 500;
            const message = error.response?.data?.message || error.message;
            return { success: false, status, message };
        }
    }

    async startSpam(config) {
        const {
            threads = 5,
            totalMessages = 100,
            delay = 100,
            message = 'Spam #{count}',
            username = null,
            avatarUrl = null,
            embeds = null,
            randomDelay = false,
            proxyList = []
        } = config;

        this.running = true;
        this.sentCount = 0;
        this.failedCount = 0;
        
        const messagesPerThread = Math.ceil(totalMessages / threads);
        let completedThreads = 0;

        console.log(chalk.cyan(`
╔══════════════════════════════════════════════╗
║     DISCORD WEBHOOK SPAMMER v2.0            ║
╠══════════════════════════════════════════════╣
║ Threads: ${threads}                              ║
║ Total Messages: ${totalMessages}                   ║
║ Delay: ${delay}ms                               ║
║ Random Delay: ${randomDelay ? 'Yes' : 'No'}                  ║
╚══════════════════════════════════════════════╝
        `));

        for (let t = 0; t < threads; t++) {
            const interval = setInterval(async () => {
                if (!this.running) {
                    clearInterval(interval);
                    return;
                }

                if (this.sentCount >= totalMessages) {
                    clearInterval(interval);
                    completedThreads++;
                    if (completedThreads === threads) {
                        this.printStats();
                    }
                    return;
                }

                this.sentCount++;
                const msg = message.replace(/\{count\}/g, this.sentCount);
                
                // Random delay if enabled
                const currentDelay = randomDelay ? 
                    Math.floor(Math.random() * delay * 2) + 50 : 
                    delay;

                const result = await this.sendMessage(
                    msg, 
                    username, 
                    avatarUrl,
                    embeds
                );

                if (result.success) {
                    process.stdout.write(chalk.green(`✓ ${this.sentCount} `));
                } else {
                    this.failedCount++;
                    process.stdout.write(chalk.red(`✗ ${this.sentCount} `));
                }

                // Rate limit handling
                if (result.status === 429) {
                    console.log(chalk.yellow(`\n⏳ Rate limited, waiting...`));
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }

                await new Promise(resolve => setTimeout(resolve, currentDelay));

            }, 100);
            
            this.intervals.push(interval);
        }
    }

    printStats() {
        console.log(chalk.cyan(`
╔══════════════════════════════════════════════╗
║              SPAM COMPLETE                  ║
╠══════════════════════════════════════════════╣
║ Sent: ${chalk.green(this.sentCount)}                              ║
║ Failed: ${chalk.red(this.failedCount)}                            ║
║ Total: ${chalk.yellow(this.sentCount + this.failedCount)}                         ║
╚══════════════════════════════════════════════╝
        `));
    }

    stopSpam() {
        this.running = false;
        this.intervals.forEach(clearInterval);
        this.intervals = [];
        console.log(chalk.red('\n⛔ Spam stopped!'));
        this.printStats();
    }

    async testWebhook() {
        console.log(chalk.yellow('🔍 Testing webhook...'));
        const result = await this.sendMessage('🔧 Webhook test message');
        if (result.success) {
            console.log(chalk.green('✅ Webhook is working!'));
            return true;
        } else {
            console.log(chalk.red(`❌ Webhook failed: ${result.message}`));
            return false;
        }
    }
}

// Advanced Spammer with Embeds
async function createEmbed(title, description, color = 0x00ff00, fields = []) {
    return [{
        title,
        description,
        color,
        fields,
        timestamp: new Date().toISOString(),
        footer: { text: 'Webhook Spammer' }
    }];
}

// CLI Interface
async function main() {
    console.log(chalk.magenta(`
    ╔══════════════════════════════════════════════════════════╗
    ║                                                          ║
    ║     🚀 DISCORD WEBHOOK SPAMMER v2.0 - NODE.JS          ║
    ║                                                          ║
    ║     ⚠️  For educational/testing purposes only           ║
    ║                                                          ║
    ╚══════════════════════════════════════════════════════════╝
    `));

    const webhookUrl = await new Promise(resolve => 
        rl.question(chalk.cyan('📌 Enter webhook URL: '), resolve)
    );

    const spammer = new WebhookSpammer(webhookUrl);

    // Test webhook
    const working = await spammer.testWebhook();
    if (!working) {
        console.log(chalk.red('❌ Invalid webhook URL!'));
        rl.close();
        return;
    }

    while (true) {
        console.log(chalk.cyan(`
    ┌─────────────────────────────────────────┐
    │  1. 🚀 Start Simple Spam               │
    │  2. 🎨 Start Spam with Embeds          │
    │  3. ⏹️  Stop Spam                      │
    │  4. 📊 Show Stats                      │
    │  5. 🧹 Clear Console                   │
    │  6. 🚪 Exit                           │
    └─────────────────────────────────────────┘
        `));

        const choice = await new Promise(resolve => 
            rl.question(chalk.yellow('👉 Select option: '), resolve)
        );

        switch (choice) {
            case '1': {
                const total = await new Promise(resolve => 
                    rl.question('📊 Total messages: ', resolve)
                );
                const threads = await new Promise(resolve => 
                    rl.question('🧵 Threads (1-20): ', resolve)
                );
                const delay = await new Promise(resolve => 
                    rl.question('⏱️  Delay (ms): ', resolve)
                );
                const message = await new Promise(resolve => 
                    rl.question('💬 Message (use {count} for number): ', resolve)
                );
                const username = await new Promise(resolve => 
                    rl.question('👤 Bot name (optional): ', resolve)
                );

                await spammer.startSpam({
                    totalMessages: parseInt(total) || 100,
                    threads: Math.min(parseInt(threads) || 5, 20),
                    delay: parseInt(delay) || 100,
                    message: message || 'Spam #{count}',
                    username: username || null,
                    randomDelay: false
                });
                break;
            }

            case '2': {
                const total = await new Promise(resolve => 
                    rl.question('📊 Total messages: ', resolve)
                );
                const title = await new Promise(resolve => 
                    rl.question('📝 Embed title: ', resolve)
                );
                const description = await new Promise(resolve => 
                    rl.question('📄 Embed description: ', resolve)
                );
                
                const embeds = await createEmbed(
                    title || 'Spam Embed',
                    description || 'This is spam!'
                );

                await spammer.startSpam({
                    totalMessages: parseInt(total) || 50,
                    threads: 3,
                    delay: 200,
                    message: '',
                    embeds: embeds,
                    username: 'Embed Spammer'
                });
                break;
            }

            case '3':
                spammer.stopSpam();
                break;

            case '4':
                spammer.printStats();
                break;

            case '5':
                console.clear();
                break;

            case '6':
                spammer.stopSpam();
                console.log(chalk.magenta('👋 Goodbye!'));
                rl.close();
                return;

            default:
                console.log(chalk.red('❌ Invalid option!'));
        }
    }
}

// Handle Ctrl+C
process.on('SIGINT', () => {
    console.log(chalk.yellow('\n⚠️  Interrupted by user'));
    process.exit(0);
});

main().catch(console.error);

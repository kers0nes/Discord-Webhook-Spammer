const axios = require('axios');
const chalk = require('chalk');

async function spamWebhook(url, count = 50, message = 'SPAM!') {
    console.log(chalk.green(`🔥 Sending ${count} messages...`));
    
    const promises = [];
    for (let i = 0; i < count; i++) {
        promises.push(
            axios.post(url, { 
                content: `${message} #${i+1}`,
                username: 'SpamBot'
            }).catch(err => ({
                error: err.response?.status || err.message
            }))
        );
        // Add small delay to avoid rate limits
        await new Promise(r => setTimeout(r, 100));
    }
    
    const results = await Promise.all(promises);
    const success = results.filter(r => !r.error).length;
    const failed = results.filter(r => r.error).length;
    
    console.log(chalk.cyan(`
    ✅ Successful: ${success}
    ❌ Failed: ${failed}
    `));
}

// Run it
const WEBHOOK_URL = process.argv[2] || 'YOUR_WEBHOOK_URL';
const COUNT = parseInt(process.argv[3]) || 50;
const MESSAGE = process.argv[4] || 'SPAM!';

spamWebhook(WEBHOOK_URL, COUNT, MESSAGE);

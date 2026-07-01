const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3000;

// HTML form for easy testing
const HTML_FORM = `
<!DOCTYPE html>
<html>
<head>
    <title>Spam Bot</title>
    <style>
        body { font-family: Arial; max-width: 600px; margin: 50px auto; padding: 20px; }
        input, textarea { width: 100%; padding: 10px; margin: 10px 0; }
        button { padding: 10px 20px; background: #5865F2; color: white; border: none; cursor: pointer; }
        .result { margin-top: 20px; padding: 10px; background: #f0f0f0; }
    </style>
</head>
<body>
    <h1>🔥 Discord Spam Bot</h1>
    <p>Enter any webhook URL and spam away!</p>
    
    <form id="spamForm">
        <input type="text" id="webhook" placeholder="Webhook URL" required>
        <textarea id="messages" rows="5" placeholder="Messages (one per line)" required></textarea>
        <input type="number" id="delay" placeholder="Delay (ms)" value="1000">
        <button type="submit">🚀 SPAM!</button>
    </form>
    
    <div id="result" class="result"></div>

    <script>
        document.getElementById('spamForm').onsubmit = async (e) => {
            e.preventDefault();
            const result = document.getElementById('result');
            result.innerHTML = 'Sending...';
            
            const webhook = document.getElementById('webhook').value;
            const messages = document.getElementById('messages').value.split('\\n').filter(m => m.trim());
            const delay = parseInt(document.getElementById('delay').value) || 1000;
            
            try {
                const response = await fetch('/api/spam', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ webhook, messages, delay })
                });
                const data = await response.json();
                result.innerHTML = JSON.stringify(data, null, 2);
            } catch (error) {
                result.innerHTML = 'Error: ' + error.message;
            }
        };
    </script>
</body>
</html>
`;

// Spam function
async function spamWebhook(webhookUrl, messages, delayMs = 1000) {
    const results = [];
    
    for (let i = 0; i < messages.length; i++) {
        try {
            const payload = {
                content: messages[i],
                allowed_mentions: { parse: [] }
            };
            
            const response = await axios.post(webhookUrl, payload, {
                headers: { 'Content-Type': 'application/json' }
            });
            
            results.push({ 
                message: messages[i], 
                success: true, 
                status: response.status 
            });
            
        } catch (error) {
            if (error.response?.status === 429) {
                const retryAfter = error.response.data.retry_after || 5;
                results.push({ 
                    message: messages[i], 
                    success: false, 
                    error: `Rate limited, wait ${retryAfter}s` 
                });
                await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
            } else {
                results.push({ 
                    message: messages[i], 
                    success: false, 
                    error: error.message 
                });
            }
        }
        
        // Wait between messages
        if (i < messages.length - 1) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }
    
    return results;
}

// ---------- ENDPOINTS ----------

// Homepage with form
app.get('/', (req, res) => {
    res.send(HTML_FORM);
});

// API endpoint - anyone can use
app.post('/api/spam', async (req, res) => {
    const { webhook, messages, delay } = req.body;
    
    // Validate
    if (!webhook || !webhook.startsWith('https://discord.com/api/webhooks/')) {
        return res.status(400).json({ 
            error: 'Invalid webhook URL. Must start with https://discord.com/api/webhooks/' 
        });
    }
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: 'No messages provided' });
    }
    
    if (messages.length > 100) {
        return res.status(400).json({ error: 'Maximum 100 messages per request' });
    }
    
    const delayMs = delay || 1000;
    
    console.log(`📨 Spamming ${messages.length} messages to webhook`);
    
    const results = await spamWebhook(webhook, messages, delayMs);
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    res.json({
        success: successCount > 0,
        total: results.length,
        sent: successCount,
        failed: failCount,
        results: results
    });
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'alive', uptime: process.uptime() });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Spam bot running on http://localhost:${PORT}`);
    console.log(`📝 Anyone can use it at /api/spam`);
});

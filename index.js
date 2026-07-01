const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3000;

// Compact B&W HTML form with auto-spam
const HTML_FORM = `
<!DOCTYPE html>
<html>
<head>
    <title>SPAM</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            background: #000;
            color: #fff;
            font-family: 'Courier New', monospace;
            height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        .container {
            background: #0a0a0a;
            padding: 20px;
            border: 1px solid #222;
            width: 380px;
            max-width: 95%;
        }
        h1 {
            font-size: 16px;
            font-weight: normal;
            letter-spacing: 4px;
            text-align: center;
            margin-bottom: 15px;
            color: #fff;
            border-bottom: 1px solid #222;
            padding-bottom: 10px;
        }
        .field {
            margin-bottom: 8px;
        }
        label {
            display: block;
            font-size: 10px;
            color: #666;
            margin-bottom: 2px;
            letter-spacing: 1px;
        }
        input, textarea {
            width: 100%;
            padding: 6px 8px;
            background: #000;
            border: 1px solid #222;
            color: #fff;
            font-family: 'Courier New', monospace;
            font-size: 11px;
            outline: none;
            resize: vertical;
        }
        input:focus, textarea:focus {
            border-color: #fff;
        }
        textarea {
            height: 50px;
            font-size: 10px;
        }
        input::placeholder, textarea::placeholder {
            color: #333;
        }
        .row {
            display: flex;
            gap: 8px;
        }
        .row .field {
            flex: 1;
        }
        .btn-group {
            display: flex;
            gap: 8px;
            margin-top: 5px;
        }
        button {
            flex: 1;
            padding: 10px;
            background: #fff;
            color: #000;
            border: none;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            font-weight: bold;
            letter-spacing: 2px;
            cursor: pointer;
            transition: all 0.15s;
        }
        button:hover {
            background: #ddd;
        }
        button:active {
            transform: scale(0.97);
        }
        button:disabled {
            opacity: 0.2;
            cursor: not-allowed;
            transform: none;
        }
        button.danger {
            background: #222;
            color: #fff;
        }
        button.danger:hover {
            background: #333;
        }
        #status {
            margin-top: 10px;
            padding: 6px;
            background: #000;
            border: 1px solid #222;
            font-size: 10px;
            color: #555;
            text-align: center;
            min-height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Courier New', monospace;
            letter-spacing: 0.5px;
        }
        #status.active {
            color: #fff;
            border-color: #fff;
        }
        #status.done {
            color: #0f0;
            border-color: #0f0;
        }
        #status.error {
            color: #f00;
            border-color: #f00;
        }
        .badge {
            font-size: 8px;
            color: #333;
            text-align: center;
            margin-top: 6px;
            letter-spacing: 1px;
        }
        .badge span {
            color: #fff;
        }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: #000; }
        ::-webkit-scrollbar-thumb { background: #222; }
    </style>
</head>
<body>
    <div class="container">
        <h1>⏣ SPAM</h1>
        
        <div class="field">
            <label>WEBHOOK</label>
            <input type="text" id="webhook" placeholder="https://discord.com/api/webhooks/..." value="">
        </div>
        
        <div class="field">
            <label>MESSAGES (one per line)</label>
            <textarea id="messages" placeholder="SPAM&#10;SPAM SPAM&#10;🔥">SPAM
SPAM SPAM
🔥</textarea>
        </div>
        
        <div class="row">
            <div class="field">
                <label>DELAY (MS)</label>
                <input type="number" id="delay" value="200" min="50" max="5000">
            </div>
            <div class="field">
                <label>COUNT</label>
                <input type="number" id="count" value="1000" min="1" max="10000">
            </div>
        </div>
        
        <div class="btn-group">
            <button id="spamBtn">▶ AUTO</button>
            <button id="stopBtn" class="danger" disabled>■ STOP</button>
        </div>
        
        <div id="status">ready</div>
        <div class="badge">⚡ <span>AUTO</span> · 1000 MSGS</div>
    </div>

    <script>
        const webhookInput = document.getElementById('webhook');
        const messagesInput = document.getElementById('messages');
        const delayInput = document.getElementById('delay');
        const countInput = document.getElementById('count');
        const spamBtn = document.getElementById('spamBtn');
        const stopBtn = document.getElementById('stopBtn');
        const status = document.getElementById('status');
        
        let isSpamming = false;
        let shouldStop = false;
        
        // Auto-fill webhook from URL
        const params = new URLSearchParams(window.location.search);
        if (params.get('webhook')) {
            webhookInput.value = params.get('webhook');
        }
        
        async function startSpam() {
            if (isSpamming) return;
            
            const webhook = webhookInput.value.trim();
            const messages = messagesInput.value.split('\\n').filter(m => m.trim());
            const delay = parseInt(delayInput.value) || 200;
            const count = parseInt(countInput.value) || 1000;
            
            if (!webhook || !webhook.startsWith('https://discord.com/api/webhooks/')) {
                status.textContent = '❌ INVALID WEBHOOK';
                status.className = 'error';
                return;
            }
            
            if (messages.length === 0) {
                status.textContent = '❌ NO MESSAGES';
                status.className = 'error';
                return;
            }
            
            isSpamming = true;
            shouldStop = false;
            spamBtn.disabled = true;
            stopBtn.disabled = false;
            spamBtn.textContent = '⏳ SPAMMING';
            status.textContent = \`🚀 SENDING \${count} MESSAGES...\`;
            status.className = 'active';
            
            let sent = 0;
            let failed = 0;
            let totalMessages = Math.min(count, 10000);
            
            for (let i = 0; i < totalMessages; i++) {
                if (shouldStop) {
                    status.textContent = \`⏹ STOPPED · \${sent} SENT · \${failed} FAILED\`;
                    status.className = '';
                    break;
                }
                
                const msg = messages[Math.floor(Math.random() * messages.length)];
                
                try {
                    const response = await fetch('/api/spam', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            webhook: webhook,
                            messages: [msg],
                            delay: 0
                        })
                    });
                    
                    const data = await response.json();
                    if (data.sent > 0) {
                        sent++;
                    } else {
                        failed++;
                    }
                } catch (err) {
                    failed++;
                }
                
                // Update status every 10 messages
                if (i % 10 === 0 || i === totalMessages - 1) {
                    status.textContent = \`📨 \${sent}/\${totalMessages} SENT · ❌ \${failed} FAILED\`;
                }
                
                // Delay between messages
                if (i < totalMessages - 1 && !shouldStop) {
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
            
            if (!shouldStop) {
                status.textContent = \`✅ DONE! \${sent} SENT · \${failed} FAILED\`;
                status.className = 'done';
            }
            
            isSpamming = false;
            spamBtn.disabled = false;
            stopBtn.disabled = true;
            spamBtn.textContent = '▶ AUTO';
        }
        
        function stopSpam() {
            if (isSpamming) {
                shouldStop = true;
                status.textContent = '⏹ STOPPING...';
                stopBtn.disabled = true;
            }
        }
        
        spamBtn.addEventListener('click', startSpam);
        stopBtn.addEventListener('click', stopSpam);
        
        // Auto-start with webhook param
        if (params.get('webhook')) {
            setTimeout(startSpam, 500);
        }
        
        // Enter key support
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !isSpamming && e.target.tagName !== 'TEXTAREA') {
                startSpam();
            }
        });
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
                    error: \`Rate limited, wait \${retryAfter}s\` 
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

// Endpoints
app.get('/', (req, res) => {
    res.send(HTML_FORM);
});

app.post('/api/spam', async (req, res) => {
    const { webhook, messages, delay } = req.body;
    
    if (!webhook || !webhook.startsWith('https://discord.com/api/webhooks/')) {
        return res.status(400).json({ 
            error: 'Invalid webhook URL' 
        });
    }
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: 'No messages provided' });
    }
    
    if (messages.length > 100) {
        return res.status(400).json({ error: 'Maximum 100 messages per request' });
    }
    
    const delayMs = delay || 1000;
    
    console.log(\`📨 Spamming \${messages.length} messages\`);
    
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

app.get('/health', (req, res) => {
    res.json({ status: 'alive', uptime: process.uptime() });
});

app.listen(PORT, () => {
    console.log(\`🚀 Spam bot running on http://localhost:\${PORT}\`);
    console.log('📝 Auto-spam 1000 messages with one click!');
});

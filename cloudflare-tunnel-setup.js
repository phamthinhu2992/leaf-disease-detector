#!/usr/bin/env node

/**
 * Cloudflare Tunnel Setup via API
 * Creates public tunnel without installing cloudflared locally
 * 
 * Setup:
 * 1. Get API token from: https://dash.cloudflare.com/profile/api-tokens
 * 2. Set environment: set CLOUDFLARE_API_TOKEN=your_token
 *                     set CLOUDFLARE_ACCOUNT_ID=your_account_id
 * 3. Run: node cloudflare-tunnel-setup.js
 */

const https = require('https');
const querystring = require('querystring');

// Configuration
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const LOCAL_HOST = 'localhost';
const LOCAL_PORT = 8765;

if (!CLOUDFLARE_API_TOKEN || !CLOUDFLARE_ACCOUNT_ID) {
    console.log(`
❌ Cloudflare credentials not found!

Setup Hướng dẫn:
==========================================
1️⃣  Truy cập: https://dash.cloudflare.com/profile/api-tokens
2️⃣  Click "Create Token" → Chọn "Edit Cloudflare Workers"
3️⃣  Copy API Token

4️⃣  Truy cập: https://dash.cloudflare.com/
5️⃣  URL có format: https://dash.cloudflare.com/xxxxxxxxxxxxxxxxxxxxxxx
6️⃣  Copy phần ID (xxxxxxx...)

7️⃣  Chạy lệnh:
    set CLOUDFLARE_API_TOKEN=your_token_here
    set CLOUDFLARE_ACCOUNT_ID=your_account_id_here
    node cloudflare-tunnel-setup.js

==========================================
  `);
    process.exit(1);
}

console.log(`
🚀 Cloudflare Tunnel Setup
==========================================
📍 Local: http://${LOCAL_HOST}:${LOCAL_PORT}
🔑 Token: ${CLOUDFLARE_API_TOKEN.substring(0, 20)}...
👤 Account: ${CLOUDFLARE_ACCOUNT_ID}
==========================================\n`);

// Step 1: Create tunnel
async function createTunnel() {
    return new Promise((resolve, reject) => {
        const tunnelName = `leaf-disease-${Date.now()}`;

        const data = JSON.stringify({
            name: tunnelName,
            config: {
                ingress: [
                    {
                        hostname: `${tunnelName}.trycloudflare.com`,
                        service: `http://${LOCAL_HOST}:${LOCAL_PORT}`
                    },
                    {
                        service: "http_status:404"
                    }
                ]
            }
        });

        const options = {
            hostname: 'api.cloudflare.com',
            path: `/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/cfd_tunnel`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };

        console.log('🔄 Creating tunnel...');

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const response = JSON.parse(body);
                    if (response.success) {
                        console.log('✅ Tunnel created successfully!');
                        resolve(response.result);
                    } else {
                        console.log('❌ Error:', response.errors);
                        reject(new Error(response.errors?.[0]?.message || 'Unknown error'));
                    }
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

// Step 2: Get tunnel details
async function getTunnelDetails(tunnelId) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.cloudflare.com',
            path: `/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/cfd_tunnel/${tunnelId}`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const response = JSON.parse(body);
                    if (response.success) {
                        resolve(response.result);
                    } else {
                        reject(new Error(response.errors?.[0]?.message || 'Unknown error'));
                    }
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

// Main execution
async function setup() {
    try {
        const tunnel = await createTunnel();
        console.log(`\n✨ Tunnel ID: ${tunnel.id}`);

        // Get tunnel details
        const details = await getTunnelDetails(tunnel.id);

        console.log(`
╔════════════════════════════════════════╗
║   ✅ CLOUDFLARE TUNNEL READY TO USE    ║
╚════════════════════════════════════════╝

📍 Tunnel Name: ${tunnel.name}
🔗 Public URL: https://${tunnel.name}.trycloudflare.com
🎯 Local Address: http://${LOCAL_HOST}:${LOCAL_PORT}

📊 Status: ${tunnel.status || 'Active'}
🆔 Tunnel ID: ${tunnel.id}

═════════════════════════════════════════

🚀 Next Step - Start Tunnel:
   node cloudflare-tunnel-start.js ${tunnel.id}

📋 Share this URL with others:
   https://${tunnel.name}.trycloudflare.com

⚠️  Note: Server must be running on port ${LOCAL_PORT}
     Make sure npm start is running!

═════════════════════════════════════════
    `);

    } catch (error) {
        console.error('❌ Setup failed:', error.message);
        process.exit(1);
    }
}

setup();

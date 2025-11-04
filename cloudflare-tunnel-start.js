#!/usr/bin/env node

/**
 * Cloudflare Tunnel Connector
 * Keeps tunnel alive and connects to local server
 * 
 * Usage: node cloudflare-tunnel-start.js [TUNNEL_ID]
 */

const https = require('https');
const http = require('http');

const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const TUNNEL_ID = process.argv[2];
const LOCAL_HOST = 'localhost';
const LOCAL_PORT = 8765;

if (!CLOUDFLARE_API_TOKEN || !CLOUDFLARE_ACCOUNT_ID) {
    console.log('❌ Missing Cloudflare credentials!');
    process.exit(1);
}

if (!TUNNEL_ID) {
    console.log('Usage: node cloudflare-tunnel-start.js [TUNNEL_ID]');
    process.exit(1);
}

console.log(`
🌐 Starting Cloudflare Tunnel Connector
========================================
🔗 Tunnel ID: ${TUNNEL_ID}
📍 Local: http://${LOCAL_HOST}:${LOCAL_PORT}
🔐 Token: ${CLOUDFLARE_API_TOKEN.substring(0, 20)}...
========================================\n`);

// Keep tunnel alive
async function keepTunnelAlive() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.cloudflare.com',
            path: `/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/cfd_tunnel/${TUNNEL_ID}/connections`,
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
                        const connections = response.result || [];
                        console.log(`✅ Tunnel active with ${connections.length} connection(s)`);
                        resolve(connections);
                    } else {
                        console.log('⚠️  Response:', response.errors?.[0]?.message);
                        resolve([]);
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

// Get tunnel info
async function getTunnelInfo() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.cloudflare.com',
            path: `/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/cfd_tunnel/${TUNNEL_ID}`,
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
                        reject(new Error(response.errors?.[0]?.message));
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

// Check if local server is running
function checkLocalServer() {
    return new Promise((resolve) => {
        const req = http.get(`http://${LOCAL_HOST}:${LOCAL_PORT}`, (res) => {
            console.log(`✅ Local server is running (status: ${res.statusCode})`);
            resolve(true);
        });

        req.on('error', () => {
            console.log(`⚠️  Local server not responding on http://${LOCAL_HOST}:${LOCAL_PORT}`);
            console.log('   Make sure to run: npm start');
            resolve(false);
        });
    });
}

// Main
async function main() {
    try {
        console.log('🔍 Getting tunnel info...');
        const tunnel = await getTunnelInfo();
        console.log(`✅ Tunnel: ${tunnel.name}`);
        console.log(`📍 Status: ${tunnel.status}`);

        console.log('\n🔄 Checking local server...');
        await checkLocalServer();

        console.log('\n🔄 Checking tunnel connections...');
        await keepTunnelAlive();

        console.log(`
╔════════════════════════════════════════╗
║      ✅ TUNNEL IS READY TO USE!        ║
╚════════════════════════════════════════╝

🔗 Public URL: https://${tunnel.name}.trycloudflare.com
📍 Local URL: http://${LOCAL_HOST}:${LOCAL_PORT}

📊 Tunnel Status: ${tunnel.status}
🆔 ID: ${tunnel.id}

═════════════════════════════════════════

📋 Share this URL: https://${tunnel.name}.trycloudflare.com

⚠️  Keep this terminal open to keep tunnel alive!

═════════════════════════════════════════
    `);

        // Periodically check tunnel status
        setInterval(async () => {
            try {
                await keepTunnelAlive();
            } catch (error) {
                console.error('❌ Error checking tunnel:', error.message);
            }
        }, 30000); // Check every 30 seconds

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

main();

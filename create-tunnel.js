#!/usr/bin/env node

/**
 * Simple Cloudflare Tunnel Creator
 * Uses Wrangler (Cloudflare Workers CLI)
 * 
 * Setup:
 * 1. npm install -g wrangler
 * 2. wrangler login (paste token when asked)
 * 3. node create-tunnel.js
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

const TOKEN = '6Wzmoc58oCaYwFx7ybEEx4VTXNxKV0EN_EVpT1KW';
const LOCAL_PORT = 8765;

console.log(`
╔════════════════════════════════════════╗
║   🌐 CLOUDFLARE TUNNEL CREATOR        ║
╚════════════════════════════════════════╝

🔗 Using Token: ${TOKEN.substring(0, 20)}...
📍 Local Port: ${LOCAL_PORT}
`);

async function setupTunnel() {
    try {
        // Check if wrangler is installed
        console.log('\n📦 Checking Wrangler installation...');
        try {
            await execAsync('wrangler --version');
            console.log('✅ Wrangler found!');
        } catch {
            console.log('⬇️  Installing Wrangler...');
            await execAsync('npm install -g wrangler');
            console.log('✅ Wrangler installed!');
        }

        // Create wrangler config
        console.log('\n📝 Creating wrangler.toml configuration...');
        const wranglerConfig = `name = "leaf-disease-tunnel"
main = "index.js"
compatibility_date = "2024-01-01"

[env.production]
routes = [
  { pattern = "*", zone_name = "example.com" }
]

[build]
command = "npm install"
cwd = "."
`;

        fs.writeFileSync('wrangler-tunnel.toml', wranglerConfig);
        console.log('✅ wrangler.toml created!');

        // Setup tunnel using Wrangler
        console.log('\n🔄 Setting up Cloudflare Tunnel...');
        console.log('   This will use your Cloudflare account...\n');

        const setupScript = `
const https = require('https');

const options = {
  hostname: 'api.cloudflare.com',
  path: '/client/v4/accounts',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer ${TOKEN}',
    'Content-Type': 'application/json'
  }
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    const data = JSON.parse(body);
    if (data.success && data.result.length > 0) {
      const account = data.result[0];
      console.log('✅ Account found: ' + account.name);
      console.log('🆔 Account ID: ' + account.id);
      console.log('\\n📋 Save these values to .env.tunnel:');
      console.log('   CLOUDFLARE_ACCOUNT_ID=' + account.id);
      console.log('   CLOUDFLARE_API_TOKEN=${TOKEN}');
    } else {
      console.log('❌ No accounts found');
    }
  });
});
req.on('error', e => console.error(e));
req.end();
`;

        fs.writeFileSync('get-account.js', setupScript);

        const { stdout } = await execAsync('node get-account.js');
        console.log(stdout);

        console.log(`
╔════════════════════════════════════════╗
║      ✅ SETUP COMPLETE!               ║
╚════════════════════════════════════════╝

📋 Next Steps:

1️⃣  Update .env.tunnel with your Account ID
    nano .env.tunnel

2️⃣  Start the tunnel:
    node start-tunnel-wrangler.js

3️⃣  Share the public URL with anyone!

✨ No password needed - Public access!
    `);

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

setupTunnel();

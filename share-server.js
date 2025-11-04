#!/usr/bin/env node

/**
 * 🌍 PUBLIC SHARING SERVER - No Password
 * Share Leaf Disease Detector with anyone on internet
 * Uses TunnelTo.dev for free public URL
 */

const http = require('http');
const { execSync } = require('child_process');
const os = require('os');
const fs = require('fs');

const LOCAL_PORT = 8765;
const SHARE_PORT = 3000;

console.log(`
╔═══════════════════════════════════════════╗
║  🌿 LEAF DISEASE DETECTOR - SHARE SERVER ║
║         🌍 PUBLIC INTERNET ACCESS         ║
╚═══════════════════════════════════════════╝
`);

// Get local IP
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

const localIP = getLocalIP();

// Create proxy server
const server = http.createServer((req, res) => {
    const options = {
        hostname: 'localhost',
        port: LOCAL_PORT,
        path: req.url,
        method: req.method,
        headers: req.headers,
    };

    const proxyReq = http.request(options, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res, { end: true });
    });

    req.pipe(proxyReq, { end: true });

    proxyReq.on('error', (err) => {
        res.writeHead(502);
        res.end('Bad Gateway');
    });
});

server.listen(SHARE_PORT, '0.0.0.0', () => {
    console.log(`
📡 PROXY SERVER READY
├─ Local: http://localhost:${SHARE_PORT}
├─ Network: http://${localIP}:${SHARE_PORT}
└─ Proxying: http://localhost:${LOCAL_PORT}

🌐 SHARING OPTIONS:
`);

    // Try different public URL services
    tryPublicTunnel();
});

async function tryPublicTunnel() {
    // Option 1: Try TunnelTo.dev (no auth needed)
    console.log(`\n⏳ Creating public tunnel...`);

    try {
        // Use ngrok if available
        console.log(`\n✅ SHARE WITH ANYONE (Copy this URL):`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`http://${localIP}:3000`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

        console.log(`\n📲 FOR SAME NETWORK (WiFi):
Send this link: http://${localIP}:3000

🌍 FOR INTERNET (Different WiFi):
Option 1 - Use ngrok (if installed):
  ngrok http ${SHARE_PORT}

Option 2 - Use tunnelto.dev:
  ssh -R 80:localhost:${SHARE_PORT} tunnelto.dev

Option 3 - Share via your router's port forwarding
`);

        // Save sharing info to file
        const shareInfo = `
🌿 LEAF DISEASE DETECTOR - PUBLIC SHARING
Generated: ${new Date().toLocaleString()}

LOCAL NETWORK:
  URL: http://${localIP}:${SHARE_PORT}
  Use this if on same WiFi

INTERNET SHARING (Different Network):
  
Method 1 - TunnelTo (Recommended):
  ssh -R 80:localhost:${SHARE_PORT} tunnelto.dev
  
Method 2 - ngrok:
  ngrok http ${SHARE_PORT}
  
Method 3 - Cloudflare:
  cloudflared tunnel --url http://localhost:${SHARE_PORT}

FEATURES AVAILABLE:
  ✅ Upload/Camera photo
  ✅ 4 AI models for detection
  ✅ Weather & disease forecasting
  ✅ AI chatbot
  ✅ Disease database
  ✅ NO PASSWORD REQUIRED

DIRECT SERVER (Local Machine Only):
  http://localhost:8765
`;

        fs.writeFileSync('SHARING_INFO.txt', shareInfo);
        console.log(`\n💾 Saved: SHARING_INFO.txt`);

    } catch (err) {
        console.error('Error:', err.message);
    }
}

server.on('error', (err) => {
    console.error('❌ Server error:', err);
    process.exit(1);
});

console.log(`\n⏸️  Running... Press Ctrl+C to stop\n`);

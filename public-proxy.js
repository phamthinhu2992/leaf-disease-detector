#!/usr/bin/env node

/**
 * Public Proxy Server with Sharing - No Password Required
 * Exposes localhost:8765 to internet via QR code and short URL
 */

const http = require('http');
const url = require('url');

const LOCAL_PORT = 8765;
const PUBLIC_PORT = process.env.PORT || 3000;

console.log(`\n🌐 PUBLIC PROXY SERVER
=====================================
📍 Proxying: http://localhost:${LOCAL_PORT}
🌍 Public Access: http://localhost:${PUBLIC_PORT}
=====================================\n`);

const server = http.createServer((req, res) => {
    console.log(`📨 ${req.method} ${req.url}`);

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

    req.on('error', (err) => {
        console.error('❌ Request error:', err);
        res.writeHead(502, { 'Content-Type': 'text/plain' });
        res.end('Bad Gateway');
    });

    proxyReq.on('error', (err) => {
        console.error('❌ Proxy error:', err);
        res.writeHead(502, { 'Content-Type': 'text/plain' });
        res.end('Bad Gateway: Cannot connect to localhost:' + LOCAL_PORT);
    });

    req.pipe(proxyReq, { end: true });
});

server.listen(PUBLIC_PORT, '0.0.0.0', () => {
    console.log(`✅ Server running on http://0.0.0.0:${PUBLIC_PORT}`);
    console.log(`✅ Accessible at http://localhost:${PUBLIC_PORT}`);
    console.log(`ℹ️  Share this URL: http://localhost:${PUBLIC_PORT}`);
    console.log(`\nPress Ctrl+C to stop\n`);
});

server.on('error', (err) => {
    console.error('❌ Server error:', err);
    process.exit(1);
});

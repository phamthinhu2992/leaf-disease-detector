// Simple deployment script for Cloudflare Worker
const CLOUDFLARE_API_TOKEN = "lrQ2It-mwBaiXnJVqmT9EGeUWf3MfPBeuAeR-Ij5";
const ACCOUNT_ID = "YOUR_ACCOUNT_ID"; // We'll get this dynamically

// Read the worker script
const fs = require('fs');
const path = require('path');

const workerScript = fs.readFileSync(path.join(__dirname, 'cloudflare', 'worker.js'), 'utf8');

async function deployWorker() {
    try {
        // Get account ID first
        const accountResponse = await fetch('https://api.cloudflare.com/client/v4/accounts', {
            headers: {
                'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        const accountData = await accountResponse.json();
        if (!accountData.success) {
            console.error('Failed to get account info:', accountData.errors);
            return;
        }

        const accountId = accountData.result[0].id;
        console.log('Account ID:', accountId);

        // Deploy worker
        const deployResponse = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/leaf-disease-ai`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
                'Content-Type': 'application/javascript'
            },
            body: workerScript
        });

        const deployData = await deployResponse.json();

        if (deployData.success) {
            console.log('✅ Worker deployed successfully!');
            console.log('🌐 URL: https://leaf-disease-ai.' + accountData.result[0].name + '.workers.dev');
        } else {
            console.error('❌ Deployment failed:', deployData.errors);
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

deployWorker();
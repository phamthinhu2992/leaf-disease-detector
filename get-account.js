
const https = require('https');

const options = {
  hostname: 'api.cloudflare.com',
  path: '/client/v4/accounts',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer 6Wzmoc58oCaYwFx7ybEEx4VTXNxKV0EN_EVpT1KW',
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
      console.log('\n📋 Save these values to .env.tunnel:');
      console.log('   CLOUDFLARE_ACCOUNT_ID=' + account.id);
      console.log('   CLOUDFLARE_API_TOKEN=6Wzmoc58oCaYwFx7ybEEx4VTXNxKV0EN_EVpT1KW');
    } else {
      console.log('❌ No accounts found');
    }
  });
});
req.on('error', e => console.error(e));
req.end();

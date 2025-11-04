#!/usr/bin/env node

/**
 * Download Models from HuggingFace Hub on Startup
 * Ensures full functionality even when deployed
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const MODELS = [
    {
        name: 'efficientnetb0_notop.h5',
        size: '16.7 MB',
        // Use public model hub URL - will be set after upload
        url: 'https://huggingface.co/huyhuy07/leaf-disease-detector-1/resolve/main/efficientnetb0_notop.h5'
    },
    {
        name: 'plant_disease_model.h5',
        size: '39.7 MB',
        url: 'https://huggingface.co/huyhuy07/leaf-disease-detector-1/resolve/main/plant_disease_model.h5'
    },
    {
        name: 'mango_model.h5',
        size: '49.1 MB',
        url: 'https://huggingface.co/huyhuy07/leaf-disease-detector-1/resolve/main/mango_model.h5'
    }
];

const MODEL_DIR = path.join(__dirname, '../model');

// Ensure model directory exists
if (!fs.existsSync(MODEL_DIR)) {
    fs.mkdirSync(MODEL_DIR, { recursive: true });
}

async function downloadFile(url, filepath, filename) {
    return new Promise((resolve, reject) => {
        console.log(`📥 Downloading ${filename}...`);

        const file = fs.createWriteStream(filepath);
        const request = https.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Download failed: ${response.statusCode}`));
                return;
            }

            const len = parseInt(response.headers['content-length'], 10);
            let downloaded = 0;

            response.on('data', (chunk) => {
                downloaded += chunk.length;
                const percent = Math.round((downloaded / len) * 100);
                process.stdout.write(`\r  Progress: ${percent}%`);
            });

            response.pipe(file);

            file.on('finish', () => {
                file.close();
                console.log(`\n✅ ${filename} downloaded!`);
                resolve();
            });

            file.on('error', (err) => {
                fs.unlink(filepath, () => { });
                reject(err);
            });
        });

        request.on('error', reject);
    });
}

async function ensureModelsExist() {
    console.log(`
╔════════════════════════════════════════╗
║   🤖 LOADING AI MODELS                 ║
╚════════════════════════════════════════╝
  `);

    for (const model of MODELS) {
        const modelPath = path.join(MODEL_DIR, model.name);

        if (fs.existsSync(modelPath)) {
            const stats = fs.statSync(modelPath);
            const size = (stats.size / (1024 * 1024)).toFixed(1);
            console.log(`✅ ${model.name} (${size} MB) - Already loaded`);
        } else {
            try {
                await downloadFile(model.url, modelPath, model.name);
            } catch (error) {
                console.error(`\n⚠️  Warning: Could not download ${model.name}`);
                console.error(`   Error: ${error.message}`);
                console.log(`   Make sure to upload models manually or configure URLs\n`);
            }
        }
    }

    console.log(`
╔════════════════════════════════════════╗
║   ✅ MODELS READY!                    ║
╚════════════════════════════════════════╝
  `);
}

// Export for use in server
module.exports = { ensureModelsExist };

// Run if called directly
if (require.main === module) {
    ensureModelsExist().catch((err) => {
        console.error('Failed to ensure models:', err);
        process.exit(1);
    });
}

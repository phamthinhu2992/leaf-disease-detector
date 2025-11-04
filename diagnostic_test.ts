/**
 * 🔍 DIAGNOSTIC TEST - Prediction Pipeline Service Test
 * Tests each component of the prediction pipeline independently
 * Run: npx ts-node diagnostic_test.ts
 */

import * as fs from 'fs';
import * as path from 'path';

console.log(`
╔════════════════════════════════════════════════════════════════════╗
║  🌿 LEAF DISEASE DETECTOR - PREDICTION PIPELINE DIAGNOSTIC TEST     ║
╚════════════════════════════════════════════════════════════════════╝
`);

// Test 1: Check if services can be imported
console.log(`\n🧪 TEST 1: Service Import Verification`);
console.log(`─────────────────────────────────────────────`);

try {
    const services = [
        'pixelAnalysisService',
        'mlModelsService',
        'modelService',
        'analysisService',
        'cropDetectionService',
        'vietnamDiseaseDatabase',
        'databaseService'
    ];

    const serviceDir = path.join(__dirname, 'server/src/services');
    const available = fs.readdirSync(serviceDir).map(f => f.replace('.ts', ''));

    for (const service of services) {
        if (available.includes(service)) {
            console.log(`✅ ${service}.ts - FOUND`);
        } else {
            console.log(`❌ ${service}.ts - MISSING`);
        }
    }
} catch (err) {
    console.error(`❌ Error checking services:`, err);
}

// Test 2: Check if data files exist
console.log(`\n🧪 TEST 2: Data Files Verification`);
console.log(`─────────────────────────────────────────────`);

try {
    const dataFiles = [
        'models/disease_info.json',
        'models/disease_database.json',
        'data/organized'
    ];

    for (const file of dataFiles) {
        const fullPath = path.join(__dirname, file);
        if (fs.existsSync(fullPath)) {
            const stat = fs.statSync(fullPath);
            const sizeStr = stat.isDirectory() ? 'DIR' : `${(stat.size / 1024).toFixed(1)}KB`;
            console.log(`✅ ${file} - EXISTS (${sizeStr})`);
        } else {
            console.log(`❌ ${file} - MISSING`);
        }
    }
} catch (err) {
    console.error(`❌ Error checking data files:`, err);
}

// Test 3: Check test image availability
console.log(`\n🧪 TEST 3: Test Image Availability`);
console.log(`─────────────────────────────────────────────`);

try {
    const orgDir = path.join(__dirname, 'data/organized');
    if (fs.existsSync(orgDir)) {
        const getAllFiles = (dir: string, maxDepth = 3, currentDepth = 0): string[] => {
            if (currentDepth > maxDepth) return [];
            const files: string[] = [];
            const items = fs.readdirSync(dir);
            for (const item of items) {
                const fullPath = path.join(dir, item);
                const stat = fs.statSync(fullPath);
                if (stat.isFile() && /\.(jpg|jpeg|png|gif)$/i.test(item)) {
                    files.push(fullPath);
                    if (files.length >= 5) break; // Get first 5
                } else if (stat.isDirectory()) {
                    files.push(...getAllFiles(fullPath, maxDepth, currentDepth + 1));
                    if (files.length >= 5) break;
                }
            }
            return files;
        };

        const images = getAllFiles(orgDir);
        console.log(`✅ Found ${images.length} test images`);
        if (images.length > 0) {
            console.log(`   Sample: ${path.basename(images[0])}`);
        }
    } else {
        console.log(`❌ Organized data directory not found`);
    }
} catch (err) {
    console.error(`❌ Error checking test images:`, err);
}

// Test 4: Verify API endpoints
console.log(`\n🧪 TEST 4: API Endpoint Verification`);
console.log(`─────────────────────────────────────────────`);

try {
    const routesFile = path.join(__dirname, 'server/src/routes/api.ts');
    const content = fs.readFileSync(routesFile, 'utf-8');

    const endpoints = [
        '/predict',
        '/weather',
        '/feedback',
        '/models/performance'
    ];

    for (const endpoint of endpoints) {
        if (content.includes(`'${endpoint}'`) || content.includes(`"${endpoint}"`)) {
            console.log(`✅ Endpoint ${endpoint} - DEFINED`);
        } else {
            console.log(`⚠️  Endpoint ${endpoint} - CHECK MANUALLY`);
        }
    }
} catch (err) {
    console.error(`❌ Error checking endpoints:`, err);
}

// Test 5: Database schema check
console.log(`\n🧪 TEST 5: Database Schema Verification`);
console.log(`─────────────────────────────────────────────`);

try {
    const dbServiceFile = path.join(__dirname, 'server/src/services/databaseService.ts');
    const content = fs.readFileSync(dbServiceFile, 'utf-8');

    const tables = [
        'predictions',
        'feedback',
        'system_logs'
    ];

    for (const table of tables) {
        if (content.includes(table)) {
            console.log(`✅ Table ${table} - SCHEMA DEFINED`);
        } else {
            console.log(`⚠️  Table ${table} - NOT FOUND IN SCHEMA`);
        }
    }
} catch (err) {
    console.error(`❌ Error checking database schema:`, err);
}

// Test 6: Check prediction controller structure
console.log(`\n🧪 TEST 6: Prediction Controller Structure`);
console.log(`─────────────────────────────────────────────`);

try {
    const controllerFile = path.join(__dirname, 'server/src/controllers/predictController.ts');
    const content = fs.readFileSync(controllerFile, 'utf-8');

    const required = [
        'predictWithEnsemble',
        'predictImage',
        'generateDetailedAnalysis',
        'databaseService.savePrediction'
    ];

    for (const fn of required) {
        if (content.includes(fn)) {
            console.log(`✅ Function ${fn} - CALLED`);
        } else {
            console.log(`❌ Function ${fn} - NOT CALLED`);
        }
    }
} catch (err) {
    console.error(`❌ Error checking controller:`, err);
}

console.log(`
╔════════════════════════════════════════════════════════════════════╗
║                      ✅ DIAGNOSTIC COMPLETE                         ║
║  Next: Run 'npm start' and test with http://localhost:8765         ║
╚════════════════════════════════════════════════════════════════════╝
`);

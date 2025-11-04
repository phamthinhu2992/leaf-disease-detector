/**
 * Plant Disease Model H5 Service
 * Tích hợp model plant_disease_model.h5 đã được huấn luyện
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';

const execAsync = promisify(exec);

interface PlantModelPrediction {
    label: string;
    confidence: number;
    is_valid: boolean;
    topk: Array<{
        label: string;
        confidence: number;
    }>;
    info: {
        [key: string]: any;
    };
}

/**
 * Dự đoán hình ảnh bằng Plant Disease Model
 */
export async function predictWithPlantModel(imagePath: string): Promise<PlantModelPrediction> {
    try {
        // Kiểm tra file model
        const modelPath = path.join(__dirname, '../../model/plant_disease_model.h5');

        if (!fs.existsSync(modelPath)) {
            throw new Error(`Model file not found: ${modelPath}`);
        }

        // Kiểm tra file ảnh
        if (!fs.existsSync(imagePath)) {
            throw new Error(`Image file not found: ${imagePath}`);
        }

        // Đường dẫn script Python
        const scriptPath = path.join(__dirname, '../../model/predict_h5.py');
        const diseaseInfoPath = path.join(__dirname, '../../models/disease_info.json');

        // Tạo command
        let command = `python "${scriptPath}" --model "${modelPath}" --image "${imagePath}" --json-output`;

        if (fs.existsSync(diseaseInfoPath)) {
            command += ` --disease-info "${diseaseInfoPath}"`;
        }

        console.log('🔍 Đang dự đoán với Plant Disease Model...');
        console.log(`   Image: ${imagePath}`);
        console.log(`   Model: ${modelPath}`);

        // Execute Python script
        const { stdout, stderr } = await execAsync(command, {
            timeout: 30000,
            maxBuffer: 10 * 1024 * 1024
        });

        // Parse output
        let prediction: PlantModelPrediction;

        try {
            const jsonMatch = stdout.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON output found');
            }
            prediction = JSON.parse(jsonMatch[0]);
        } catch (error) {
            console.error('❌ Parse JSON error:', error);
            console.error('   stdout:', stdout);
            console.error('   stderr:', stderr);
            throw error;
        }

        console.log('✅ Dự đoán thành công!');
        console.log(`   Bệnh: ${prediction.label}`);
        console.log(`   Độ tin cậy: ${(prediction.confidence * 100).toFixed(1)}%`);

        return prediction;
    } catch (error) {
        console.error('❌ Plant Disease Model prediction error:', error);
        throw error;
    }
}

/**
 * Dự đoán với retry
 */
export async function predictWithPlantModelSafe(imagePath: string, maxRetries: number = 2): Promise<PlantModelPrediction> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`🔄 Attempt ${attempt}/${maxRetries}...`);
            return await predictWithPlantModel(imagePath);
        } catch (error) {
            lastError = error as Error;
            console.warn(`⚠️  Attempt ${attempt} failed:`, lastError.message);

            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }

    throw lastError || new Error('Prediction failed after retries');
}

/**
 * Format prediction result cho frontend
 */
export function formatPlantModelResult(prediction: PlantModelPrediction): any {
    return {
        success: true,
        disease: prediction.label,
        confidence: prediction.confidence,
        confidence_percent: `${(prediction.confidence * 100).toFixed(1)}%`,
        is_valid: prediction.is_valid,
        severity: prediction.is_valid ? (
            prediction.confidence > 0.9 ? 'CRITICAL' :
                prediction.confidence > 0.8 ? 'SEVERE' :
                    prediction.confidence > 0.7 ? 'MODERATE' :
                        prediction.confidence > 0.6 ? 'MILD' :
                            'SUSPECTED'
        ) : 'UNKNOWN',
        topk_predictions: prediction.topk.map((p, idx) => ({
            rank: idx + 1,
            disease: p.label,
            confidence: p.confidence,
            confidence_percent: `${(p.confidence * 100).toFixed(1)}%`
        })),
        disease_info: prediction.info || {},
        model_type: 'PlantDiseaseModel',
        timestamp: new Date().toISOString()
    };
}

export { PlantModelPrediction };

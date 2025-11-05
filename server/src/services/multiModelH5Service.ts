import * as tf from '@tensorflow/tfjs';
import * as fs from 'fs';
import * as path from 'path';

const MODEL_DIR = path.join(__dirname, '../../..', 'model');

interface PredictionResult {
    modelName: string;
    predictions: any[];
    confidence: number;
}

interface EnsembleResult {
    disease: string;
    confidence: number;
    severity: string;
    votes: { [key: string]: number };
    modelResults: PredictionResult[];
    timestamp: string;
}

class MultiModelH5Service {
    private loadedModels: Map<string, any> = new Map();
    private modelFiles = [
        'efficientnet_merged.h5',
        'efficientnetb0_notop.h5',
        'leaf_disease_model.h5',
        'leaf_disease_modhel.h5',
        'mango_model.h5',
        'plant_disease_model.h5'
    ];

    async initializeModels(): Promise<void> {
        console.log('🔄 Initializing 6 models...');

        for (const modelFile of this.modelFiles) {
            const modelPath = path.join(MODEL_DIR, modelFile);

            if (!fs.existsSync(modelPath)) {
                console.warn(`⚠️  ${modelFile} not found`);
                continue;
            }

            try {
                console.log(`📥 Loading ${modelFile}...`);
                const model = await tf.loadLayersModel(
                    `file://${modelPath.replace(/\\/g, '/')}`
                );
                this.loadedModels.set(modelFile, model);
                console.log(`✓ ${modelFile} loaded`);
            } catch (error) {
                console.error(`❌ Error loading ${modelFile}:`, error);
            }
        }

        console.log(`✅ Loaded ${this.loadedModels.size} models`);
    }

    async predictWithEnsemble(
        imageBuffer: Buffer,
        prepareImageFn: (buf: Buffer) => tf.Tensor
    ): Promise<EnsembleResult> {
        const modelResults: PredictionResult[] = [];
        const allPredictions: string[] = [];
        const confidenceScores: number[] = [];

        // Get tensor from image
        const tensor = prepareImageFn(imageBuffer);

        // Run through each model
        for (const [modelName, model] of this.loadedModels.entries()) {
            try {
                const prediction = await tf.tidy(() => {
                    const result = model.predict(tensor) as tf.Tensor;
                    return result.dataSync();
                });

                const maxIdx = Array.from(prediction).indexOf(Math.max(...Array.from(prediction)));
                const confidence = Array.from(prediction)[maxIdx];

                // Convert index to disease name (generic mapping)
                const disease = this.indexToDiseaseName(maxIdx);
                allPredictions.push(disease);
                confidenceScores.push(confidence);

                modelResults.push({
                    modelName,
                    predictions: Array.from(prediction),
                    confidence
                });

                console.log(`  ${modelName}: ${disease} (${(confidence * 100).toFixed(2)}%)`);
            } catch (error) {
                console.error(`Error predicting with ${modelName}:`, error);
            }
        }

        tensor.dispose();

        // Voting system
        const votes = this.countVotes(allPredictions);
        const [topDisease, voteCount] = Object.entries(votes).sort(
            (a, b) => (b[1] as number) - (a[1] as number)
        )[0] as [string, number];

        const avgConfidence = confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length;

        return {
            disease: topDisease,
            confidence: Math.min(avgConfidence, voteCount / this.loadedModels.size),
            severity: this.getSeverity(topDisease, avgConfidence),
            votes,
            modelResults,
            timestamp: new Date().toISOString()
        };
    }

    private countVotes(predictions: string[]): { [key: string]: number } {
        const votes: { [key: string]: number } = {};
        predictions.forEach(disease => {
            votes[disease] = (votes[disease] || 0) + 1;
        });
        return votes;
    }

    private indexToDiseaseName(idx: number): string {
        const diseases = [
            'Apple Scab',
            'Apple Black Rot',
            'Apple Cedar Rust',
            'Blueberry Mildew',
            'Cherry Powdery Mildew',
            'Corn Cercospora Leaf Spot',
            'Corn Common Rust',
            'Corn Northern Leaf Blight',
            'Grape Black Rot',
            'Grape Esca',
            'Grape Leaf Blight',
            'Peach Bacterial Spot',
            'Pepper Bacterial Spot',
            'Potato Early Blight',
            'Potato Late Blight',
            'Raspberry',
            'Soybean Brown Spot',
            'Squash Powdery Mildew',
            'Strawberry Leaf Scorch',
            'Tomato Bacterial Spot',
            'Tomato Early Blight',
            'Tomato Late Blight',
            'Tomato Leaf Mold',
            'Tomato Septoria Leaf Spot',
            'Tomato Spider Mites',
            'Tomato Yellow Leaf Curl Virus',
            'Healthy'
        ];
        return diseases[idx] || `Disease ${idx}`;
    }

    private getSeverity(disease: string, confidence: number): string {
        if (confidence < 0.5) return 'Low';
        if (confidence < 0.7) return 'Medium';
        if (confidence < 0.85) return 'High';
        return 'Critical';
    }

    getLoadedModelsCount(): number {
        return this.loadedModels.size;
    }

    getModelList(): string[] {
        return Array.from(this.loadedModels.keys());
    }
}

export default new MultiModelH5Service();

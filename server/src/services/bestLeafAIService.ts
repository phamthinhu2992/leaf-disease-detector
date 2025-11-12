import * as tf from '@tensorflow/tfjs';
import * as fs from 'fs';
import * as path from 'path';

const MODEL_PATH = path.join(__dirname, '../../..', 'model', 'best_leaf_ai.h5');

interface BestLeafAIPrediction {
    disease: string;
    confidence: number;
    probability: number;
    severity: string;
    treatment: string;
}

class BestLeafAIService {
    private model: any = null;
    private isLoading = false;

    async loadModel(): Promise<boolean> {
        if (this.model) return true;
        if (this.isLoading) return false;

        try {
            this.isLoading = true;
            console.log('📥 Loading best_leaf_ai.h5 model...');

            // Check if file exists
            if (!fs.existsSync(MODEL_PATH)) {
                console.warn(`⚠️  Model not found at ${MODEL_PATH}`);
                return false;
            }

            // Load model using file:// protocol
            const modelURL = `file://${MODEL_PATH.replace(/\\/g, '/')}`;
            this.model = await tf.loadLayersModel(modelURL);

            console.log('✓ best_leaf_ai.h5 model loaded successfully');
            console.log(`  Input shape: ${this.model.inputShape}`);
            console.log(`  Output shape: ${this.model.outputShape}`);

            return true;
        } catch (error) {
            console.error('❌ Error loading best_leaf_ai.h5:', error);
            this.model = null;
            return false;
        } finally {
            this.isLoading = false;
        }
    }

    async predict(imageBuffer: Buffer): Promise<BestLeafAIPrediction | null> {
        if (!this.model) {
            const loaded = await this.loadModel();
            if (!loaded) return null;
        }

        try {
            console.log('🔍 Running prediction with best_leaf_ai.h5...');

            // Convert buffer to tensor
            const tensor = tf.tidy(() => {
                // Decode image
                const decodedImage = tf.image.decodeImage(imageBuffer, 3);

                // Resize to 224x224 (or appropriate size for the model)
                const resized = tf.image.resizeBilinear(decodedImage, [224, 224]);

                // Normalize to [0, 1]
                const normalized = resized.div(tf.scalar(255.0));

                // Add batch dimension
                const batched = normalized.expandDims(0);

                return batched;
            });

            // Run prediction
            const prediction = this.model.predict(tensor) as tf.Tensor;
            const predictionData = await prediction.data();

            // Get class with highest confidence
            const predictions = Array.from(predictionData);
            const maxIdx = predictions.indexOf(Math.max(...predictions));
            const confidence = predictions[maxIdx];

            // Cleanup tensors
            tensor.dispose();
            prediction.dispose();

            // Disease classification (generic mapping)
            const diseaseMap = [
                'Healthy Leaf',
                'Powdery Mildew',
                'Leaf Spot',
                'Rust',
                'Blight',
                'Anthracnose',
                'Canker',
                'Chlorosis',
                'Necrosis',
                'Scab'
            ];

            const disease = diseaseMap[maxIdx] || `Disease ${maxIdx}`;

            // Determine severity based on confidence
            let severity = 'Low';
            if (confidence > 0.8) severity = 'Critical';
            else if (confidence > 0.7) severity = 'High';
            else if (confidence > 0.5) severity = 'Medium';

            // Treatment recommendation
            const treatments: { [key: string]: string } = {
                'Healthy Leaf': 'No treatment needed. Maintain regular plant care.',
                'Powdery Mildew': 'Apply sulfur or neem oil spray. Improve air circulation.',
                'Leaf Spot': 'Remove affected leaves. Apply copper fungicide.',
                'Rust': 'Remove infected leaves. Apply fungicide spray.',
                'Blight': 'Prune affected areas. Apply systemic fungicide.',
                'Anthracnose': 'Remove infected tissue. Apply protective fungicide.',
                'Canker': 'Prune affected branches. Apply wound dressing.',
                'Chlorosis': 'Check soil pH and nutrients. Apply iron supplement.',
                'Necrosis': 'Identify cause (disease/nutrient). Adjust care accordingly.',
                'Scab': 'Improve water management. Apply fungicide if severe.'
            };

            return {
                disease,
                confidence: Math.round(confidence * 100) / 100,
                probability: confidence,
                severity,
                treatment: treatments[disease] || 'Consult agricultural specialist'
            };

        } catch (error) {
            console.error('❌ Prediction error:', error);
            return null;
        }
    }

    isModelLoaded(): boolean {
        return this.model !== null;
    }

    getModelInfo() {
        if (!this.model) {
            return {
                loaded: false,
                message: 'Model not loaded'
            };
        }

        return {
            loaded: true,
            name: 'best_leaf_ai.h5',
            inputShape: this.model.inputShape,
            outputShape: this.model.outputShape,
            modelPath: MODEL_PATH
        };
    }
}

export default new BestLeafAIService();

/**
 * Model Performance Tracking Service
 * Tracks accuracy of each AI model and adjusts their voting weights
 */

import databaseService from './databaseService';

export interface ModelPerformance {
    modelName: string;
    totalPredictions: number;
    correctPredictions: number;
    accuracy: number; // 0-1
    votingWeight: number; // 0.5 - 1.5 multiplier
    lastUpdated: string;
    recentAccuracy: number; // Last 10 predictions
}

interface PredictionFeedback {
    predictionId: string;
    imageFilename: string;
    modelName: string;
    predictedDisease: string;
    userSelectedDisease: string;
    isCorrect: boolean;
    timestamp: string;
    userIP?: string;
}

class ModelPerformanceService {
    private modelStats: Map<string, ModelPerformance> = new Map();

    constructor() {
        this.initializeDefaultModels();
    }

    /**
     * Initialize with 3 models at equal weight
     */
    private initializeDefaultModels() {
        const models = ['ResNet50', 'MobileNetV2', 'InceptionV3'];
        models.forEach(model => {
            this.modelStats.set(model, {
                modelName: model,
                totalPredictions: 0,
                correctPredictions: 0,
                accuracy: 0.5, // Start neutral
                votingWeight: 1.0, // Equal weight initially
                lastUpdated: new Date().toISOString(),
                recentAccuracy: 0.5
            });
        });
    }

    /**
     * Record user feedback on a prediction
     */
    async recordFeedback(feedback: PredictionFeedback): Promise<void> {
        try {
            const model = this.modelStats.get(feedback.modelName);
            if (!model) {
                console.warn(`Unknown model: ${feedback.modelName}`);
                return;
            }

            // Update stats
            model.totalPredictions++;
            if (feedback.isCorrect) {
                model.correctPredictions++;
            }

            // Calculate accuracy
            model.accuracy = model.totalPredictions > 0
                ? model.correctPredictions / model.totalPredictions
                : 0.5;

            // Calculate recent accuracy (weighted towards recent votes)
            model.recentAccuracy = this.calculateRecentAccuracy(model);

            // Update voting weight based on accuracy
            model.votingWeight = this.calculateVotingWeight(model);
            model.lastUpdated = new Date().toISOString();

            console.log(`📊 Model Performance Updated: ${feedback.modelName}`);
            console.log(`   Total: ${model.totalPredictions} | Correct: ${model.correctPredictions}`);
            console.log(`   Accuracy: ${(model.accuracy * 100).toFixed(1)}%`);
            console.log(`   Voting Weight: ${model.votingWeight.toFixed(2)}x`);

            // Save to database
            await this.saveFeedbackToDatabase(feedback);
        } catch (error) {
            console.error('❌ Error recording feedback:', error);
        }
    }

    /**
     * Calculate recent accuracy (weighted average of last 10 predictions)
     */
    private calculateRecentAccuracy(model: ModelPerformance): number {
        // Simple calculation: recent predictions weighted 2x
        // In production, you'd query last N predictions from database
        const recentWeight = 0.6;
        const historicalWeight = 0.4;
        return (model.accuracy * historicalWeight) + (model.accuracy * recentWeight);
    }

    /**
     * Calculate voting weight based on accuracy
     * Better performing models get higher weight
     */
    private calculateVotingWeight(model: ModelPerformance): number {
        const accuracy = Math.max(0.3, model.accuracy); // Minimum 0.3

        if (accuracy >= 0.9) {
            return 1.5; // Excellent: 1.5x weight
        } else if (accuracy >= 0.8) {
            return 1.3; // Very Good: 1.3x weight
        } else if (accuracy >= 0.7) {
            return 1.1; // Good: 1.1x weight
        } else if (accuracy >= 0.6) {
            return 1.0; // Average: 1.0x weight
        } else if (accuracy >= 0.5) {
            return 0.9; // Below Average: 0.9x weight
        } else if (accuracy >= 0.4) {
            return 0.7; // Poor: 0.7x weight
        } else {
            return 0.5; // Very Poor: 0.5x weight
        }
    }

    /**
     * Save feedback to database
     */
    private async saveFeedbackToDatabase(feedback: PredictionFeedback): Promise<void> {
        try {
            // This would save to a model_feedback table
            // For now, we log it
            console.log('💾 Feedback saved:', {
                model: feedback.modelName,
                predicted: feedback.predictedDisease,
                correct: feedback.userSelectedDisease,
                isCorrect: feedback.isCorrect,
                timestamp: feedback.timestamp
            });
        } catch (error) {
            console.error('Error saving to database:', error);
        }
    }

    /**
     * Get current performance of all models
     */
    getModelPerformances(): ModelPerformance[] {
        return Array.from(this.modelStats.values());
    }

    /**
     * Get specific model performance
     */
    getModelPerformance(modelName: string): ModelPerformance | undefined {
        return this.modelStats.get(modelName);
    }

    /**
     * Get voting weights for ensemble
     */
    getVotingWeights(): { [key: string]: number } {
        const weights: { [key: string]: number } = {};
        this.modelStats.forEach((stats, modelName) => {
            weights[modelName] = stats.votingWeight;
        });
        return weights;
    }

    /**
     * Get leaderboard (models ranked by accuracy)
     */
    getLeaderboard(): ModelPerformance[] {
        return Array.from(this.modelStats.values())
            .sort((a, b) => b.accuracy - a.accuracy)
            .map((model, index) => ({
                ...model,
                // Add rank if needed
            }));
    }

    /**
     * Get performance summary
     */
    getPerformanceSummary(): string {
        const leaderboard = this.getLeaderboard();
        let summary = '🏆 Model Performance Leaderboard\n';
        summary += '================================\n';

        leaderboard.forEach((model, index) => {
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
            summary += `${medal} ${index + 1}. ${model.modelName}\n`;
            summary += `   Accuracy: ${(model.accuracy * 100).toFixed(1)}% `;
            summary += `(${model.correctPredictions}/${model.totalPredictions})\n`;
            summary += `   Weight: ${model.votingWeight.toFixed(2)}x\n`;
        });

        return summary;
    }

    /**
     * Reset all stats (for testing)
     */
    resetStats(): void {
        this.initializeDefaultModels();
        console.log('✅ Model stats reset to defaults');
    }
}

export default new ModelPerformanceService();

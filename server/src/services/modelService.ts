import { loadModel, predict } from '../utils/modelLoader';
import { ImageData } from '../types';

let model: any;

export const initializeModel = async () => {
  model = await loadModel();
};

export const getPrediction = async (imageData: ImageData) => {
  if (!model) {
    throw new Error('Model not initialized. Please call initializeModel first.');
  }
  
  const prediction = await predict(model, imageData);
  return prediction;
};
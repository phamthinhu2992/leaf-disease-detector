#!/usr/bin/env python3
"""
Create an ensemble model combining multiple H5 models using voting
"""

import os
import json
import numpy as np
import tensorflow as tf
from tensorflow import keras
import warnings
warnings.filterwarnings('ignore')

MODEL_DIR = os.path.dirname(os.path.abspath(__file__))

# List of available models
AVAILABLE_MODELS = [
    'efficientnet_merged.h5',
    'efficientnetb0_notop.h5',
    'leaf_disease_model.h5',
    'leaf_disease_modhel.h5',
    'mango_model.h5',
    'plant_disease_model.h5'
]

def load_all_models():
    """Load all available H5 models"""
    models = []
    model_names = []
    
    for model_file in AVAILABLE_MODELS:
        model_path = os.path.join(MODEL_DIR, model_file)
        
        if not os.path.exists(model_path):
            print(f"⚠️  {model_file} not found, skipping...")
            continue
        
        try:
            print(f"📥 Loading {model_file}...", end=" ")
            model = keras.models.load_model(model_path, compile=False)
            models.append(model)
            model_names.append(model_file)
            print(f"✓ (Shape: {model.output_shape})")
        except Exception as e:
            print(f"❌ Error: {e}")
            continue
    
    return models, model_names

def create_ensemble_model(base_models):
    """Create ensemble model using voting layer"""
    
    if len(base_models) == 0:
        print("❌ No models available!")
        return None
    
    # Get input shape from first model
    input_shape = base_models[0].input_shape[1:]
    
    # Create input layer
    inputs = keras.Input(shape=input_shape)
    
    # Get predictions from all models
    predictions = []
    for model in base_models:
        # Ensure model input matches
        pred = model(inputs)
        predictions.append(pred)
    
    # Average or voting
    if len(predictions) == 1:
        averaged = predictions[0]
    else:
        # Average predictions
        averaged = keras.layers.Average()(predictions)
    
    # Create ensemble model
    ensemble = keras.Model(inputs=inputs, outputs=averaged)
    
    return ensemble

def save_ensemble_config(model_names):
    """Save ensemble configuration"""
    config = {
        "type": "ensemble",
        "strategy": "averaging",
        "models": model_names,
        "created_at": str(os.popen('date /t').read().strip()),
        "description": "Ensemble of multiple leaf disease detection models"
    }
    
    config_path = os.path.join(MODEL_DIR, 'ensemble_config.json')
    with open(config_path, 'w') as f:
        json.dump(config, f, indent=2)
    
    print(f"✓ Config saved: {config_path}")

def main():
    print("=" * 60)
    print("🔄 CREATING ENSEMBLE MODEL")
    print("=" * 60)
    
    # Load models
    print("\n📂 Available models:")
    models, model_names = load_all_models()
    
    if len(models) == 0:
        print("❌ No models to load!")
        return
    
    print(f"\n✅ Loaded {len(models)} models:")
    for name in model_names:
        print(f"   • {name}")
    
    # Create ensemble
    print("\n🔀 Creating ensemble model...")
    ensemble_model = create_ensemble_model(models)
    
    # Save ensemble
    ensemble_path = os.path.join(MODEL_DIR, 'ensemble_model.h5')
    print(f"💾 Saving ensemble to {ensemble_path}...")
    ensemble_model.save(ensemble_path)
    print(f"✓ Ensemble saved!")
    
    # Save config
    print("\n📋 Saving configuration...")
    save_ensemble_config(model_names)
    
    # Get file size
    size_mb = os.path.getsize(ensemble_path) / (1024 * 1024)
    print(f"\n✅ DONE!")
    print(f"   Ensemble model: {size_mb:.2f} MB")
    print(f"   Models combined: {len(models)}")
    print(f"\n🚀 Ready to deploy!")

if __name__ == "__main__":
    main()

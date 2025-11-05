#!/usr/bin/env python3
"""
Download all 6 H5 models from HuggingFace Hub on startup
"""

import os
import sys
from huggingface_hub import hf_hub_download

HF_USERNAME = "huyhuy07"
REPO_NAME = "leaf-disease-detector-models"
MODEL_DIR = os.path.join(os.path.dirname(__file__), '..', 'model')

# Create model directory if not exists
os.makedirs(MODEL_DIR, exist_ok=True)

MODELS = [
    'efficientnet_merged.h5',
    'efficientnetb0_notop.h5',
    'leaf_disease_model.h5',
    'leaf_disease_modhel.h5',
    'mango_model.h5',
    'plant_disease_model.h5'
]

def download_models():
    """Download all models from HuggingFace"""
    
    print("=" * 60)
    print("📥 DOWNLOADING 6 H5 MODELS FROM HUGGINGFACE")
    print("=" * 60)
    print()
    
    downloaded = 0
    skipped = 0
    
    for model_file in MODELS:
        model_path = os.path.join(MODEL_DIR, model_file)
        
        # Skip if already exists
        if os.path.exists(model_path):
            size_mb = os.path.getsize(model_path) / (1024 * 1024)
            print(f"✓ {model_file} ({size_mb:.2f} MB) - already cached")
            skipped += 1
            continue
        
        try:
            print(f"📥 Downloading {model_file}...", end=" ", flush=True)
            
            hf_hub_download(
                repo_id=f"{HF_USERNAME}/{REPO_NAME}",
                filename=model_file,
                local_dir=MODEL_DIR,
                repo_type="model"
            )
            
            size_mb = os.path.getsize(model_path) / (1024 * 1024)
            print(f"✓ ({size_mb:.2f} MB)")
            downloaded += 1
            
        except Exception as e:
            print(f"❌ Error: {e}")
            return False
    
    print()
    print("=" * 60)
    print(f"✅ Download Complete:")
    print(f"   Downloaded: {downloaded}")
    print(f"   Cached: {skipped}")
    print(f"   Total: {len(MODELS)}")
    print("=" * 60)
    
    return True

if __name__ == "__main__":
    success = download_models()
    sys.exit(0 if success else 1)

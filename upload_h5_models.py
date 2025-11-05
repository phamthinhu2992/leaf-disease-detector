#!/usr/bin/env python3
"""
Upload all 6 H5 models to HuggingFace Hub
"""

from huggingface_hub import HfApi, create_repo
import os

# Configuration
HF_USERNAME = "huyhuy07"  # Your HuggingFace username
REPO_NAME = "leaf-disease-detector-models"
MODEL_DIR = os.path.join(os.path.dirname(__file__), 'model')

# Models to upload
MODELS = [
    'efficientnet_merged.h5',
    'efficientnetb0_notop.h5',
    'leaf_disease_model.h5',
    'leaf_disease_modhel.h5',
    'mango_model.h5',
    'plant_disease_model.h5'
]

def upload_models():
    """Upload all H5 models to HuggingFace"""
    
    api = HfApi()
    
    print("=" * 60)
    print("🚀 UPLOADING 6 H5 MODELS TO HUGGINGFACE HUB")
    print("=" * 60)
    
    # Create repo if not exists
    repo_url = f"https://huggingface.co/{HF_USERNAME}/{REPO_NAME}"
    print(f"\n📦 Repository: {repo_url}\n")
    
    try:
        create_repo(
            repo_id=f"{HF_USERNAME}/{REPO_NAME}",
            repo_type="model",
            exist_ok=True,
            private=False
        )
        print(f"✓ Repository created/verified\n")
    except Exception as e:
        print(f"⚠️  {e}\n")
    
    # Upload each model
    uploaded = 0
    failed = 0
    
    for model_file in MODELS:
        model_path = os.path.join(MODEL_DIR, model_file)
        
        if not os.path.exists(model_path):
            print(f"❌ {model_file} not found")
            failed += 1
            continue
        
        size_mb = os.path.getsize(model_path) / (1024 * 1024)
        
        try:
            print(f"📤 Uploading {model_file} ({size_mb:.2f} MB)...", end=" ")
            
            api.upload_file(
                path_or_fileobj=model_path,
                path_in_repo=model_file,
                repo_id=f"{HF_USERNAME}/{REPO_NAME}",
                repo_type="model"
            )
            
            print(f"✓")
            uploaded += 1
            
        except Exception as e:
            print(f"❌ Error: {e}")
            failed += 1
    
    print("\n" + "=" * 60)
    print(f"✅ Upload Summary:")
    print(f"   Uploaded: {uploaded}/{len(MODELS)}")
    print(f"   Failed: {failed}/{len(MODELS)}")
    print(f"   Repository: {repo_url}")
    print("=" * 60)

if __name__ == "__main__":
    upload_models()

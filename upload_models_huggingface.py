#!/usr/bin/env python3

"""
Upload Models to HuggingFace Hub
Enables deployment with full model functionality
"""

import os
from pathlib import Path
from huggingface_hub import HfApi, HfFolder, create_repo

# Configuration
HF_USERNAME = "YOUR_HF_USERNAME"  # Replace with your HuggingFace username
HF_TOKEN = "YOUR_HF_TOKEN"  # Get from https://huggingface.co/settings/tokens
REPO_NAME = "leaf-disease-detector"
REPO_TYPE = "model"

MODEL_FILES = [
    "model/efficientnetb0_notop.h5",
    "model/plant_disease_model.h5",
    "model/mango_model.h5",
]

def login_huggingface():
    """Login to HuggingFace Hub"""
    print("\n🔐 Logging in to HuggingFace Hub...")
    
    if not HF_TOKEN or HF_TOKEN == "YOUR_HF_TOKEN":
        print("❌ Please set HF_TOKEN in this script")
        print("   Get token from: https://huggingface.co/settings/tokens")
        return False
    
    try:
        HfFolder.save_token(HF_TOKEN)
        print(f"✅ Logged in as: {HF_USERNAME}")
        return True
    except Exception as e:
        print(f"❌ Login failed: {e}")
        return False

def create_repo_if_needed():
    """Create HuggingFace repo if it doesn't exist"""
    print(f"\n📦 Checking repo: {HF_USERNAME}/{REPO_NAME}")
    
    try:
        api = HfApi()
        
        # Try to get repo info
        try:
            repo_url = api.repo_url(repo_id=f"{HF_USERNAME}/{REPO_NAME}", repo_type=REPO_TYPE)
            print(f"✅ Repo exists: {repo_url}")
        except:
            # Create new repo
            print(f"🆕 Creating new repo...")
            repo_url = create_repo(
                repo_id=REPO_NAME,
                repo_type=REPO_TYPE,
                exist_ok=True,
                private=False  # Public so anyone can download
            )
            print(f"✅ Created: {repo_url}")
        
        return True
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def upload_models():
    """Upload model files to HuggingFace"""
    print(f"\n📤 Uploading models to HuggingFace Hub...")
    
    api = HfApi()
    
    for model_file in MODEL_FILES:
        filepath = Path(model_file)
        
        if not filepath.exists():
            print(f"⚠️  Skipping {model_file} - file not found")
            continue
        
        size_mb = filepath.stat().st_size / (1024 * 1024)
        print(f"\n📁 Uploading: {filepath.name} ({size_mb:.1f} MB)")
        
        try:
            api.upload_file(
                path_or_fileobj=str(filepath),
                path_in_repo=filepath.name,
                repo_id=f"{HF_USERNAME}/{REPO_NAME}",
                repo_type=REPO_TYPE,
            )
            print(f"✅ Uploaded: {filepath.name}")
        except Exception as e:
            print(f"❌ Failed: {e}")
            return False
    
    return True

def main():
    """Main execution"""
    print("""
╔════════════════════════════════════════╗
║  🚀 HuggingFace Model Upload           ║
╚════════════════════════════════════════╝
    """)
    
    # Step 1: Validate setup
    if HF_USERNAME == "YOUR_HF_USERNAME":
        print("❌ Please configure HuggingFace credentials:")
        print("   1. Visit: https://huggingface.co/settings/tokens")
        print("   2. Create a new token (write permission)")
        print("   3. Edit this script and set:")
        print("      HF_USERNAME = 'your_username'")
        print("      HF_TOKEN = 'your_token'")
        return False
    
    # Step 2: Login
    if not login_huggingface():
        return False
    
    # Step 3: Create repo
    if not create_repo_if_needed():
        return False
    
    # Step 4: Upload files
    if not upload_models():
        return False
    
    # Step 5: Success
    repo_url = f"https://huggingface.co/{HF_USERNAME}/{REPO_NAME}"
    print(f"""
╔════════════════════════════════════════╗
║  ✅ UPLOAD COMPLETE!                  ║
╚════════════════════════════════════════╝

🔗 Repository: {repo_url}

📝 Next Steps:
   1. Copy model URLs from repository
   2. Update utils/downloadModels.js with URLs
   3. Push code to GitHub
   4. Deploy to Render.com

✨ Models will auto-download on startup!
    """)
    return True

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)

#!/usr/bin/env python3
"""
Test EfficientNetB0 H5 Model
"""

import requests
import json
import sys
import os
from pathlib import Path

# Server URL
API_BASE = "http://192.168.1.3:8765"
PREDICT_H5_ENDPOINT = f"{API_BASE}/api/predict-h5"
MODELS_ENDPOINT = f"{API_BASE}/api/models"

def test_models_list():
    """Test GET /api/models"""
    print("\n" + "="*60)
    print("🧪 TEST 1: List Available Models")
    print("="*60)
    
    try:
        response = requests.get(MODELS_ENDPOINT, timeout=5)
        response.raise_for_status()
        data = response.json()
        
        print(f"✅ Status: {response.status_code}")
        print(f"📋 Available models: {len(data.get('models', []))}")
        
        for model in data.get('models', []):
            print(f"\n   • {model['name']}")
            print(f"     Type: {model['type']}")
            print(f"     Endpoint: {model['endpoint']}")
            print(f"     Status: {model['status']}")
    
    except Exception as e:
        print(f"❌ Error: {e}")
        return False
    
    return True

def test_predict_h5(image_path):
    """Test H5 prediction"""
    print("\n" + "="*60)
    print("🧪 TEST 2: EfficientNetB0 H5 Prediction")
    print("="*60)
    
    if not os.path.exists(image_path):
        print(f"❌ Image not found: {image_path}")
        return False
    
    print(f"📸 Image: {image_path}")
    print(f"🎯 Endpoint: {PREDICT_H5_ENDPOINT}")
    
    try:
        with open(image_path, 'rb') as f:
            files = {'image': f}
            print("⏳ Sending request...")
            
            response = requests.post(PREDICT_H5_ENDPOINT, files=files, timeout=30)
            response.raise_for_status()
            data = response.json()
        
        print(f"✅ Status: {response.status_code}")
        
        if data.get('success'):
            result = data.get('data', {})
            
            print(f"\n📊 PREDICTION RESULT:")
            print(f"   Disease: {result.get('disease')}")
            print(f"   Confidence: {result.get('confidence_percent')}")
            print(f"   Valid: {result.get('is_valid')}")
            print(f"   Severity: {result.get('severity')}")
            print(f"   Model: {result.get('model_type')}")
            
            print(f"\n🎯 Top Predictions:")
            for pred in result.get('topk_predictions', []):
                print(f"   {pred['rank']}. {pred['disease']}: {pred['confidence_percent']}")
            
            if result.get('disease_info'):
                print(f"\n📋 Disease Info:")
                info = result['disease_info']
                if 'description' in info:
                    print(f"   Description: {info['description'][:100]}...")
                if 'treatment' in info:
                    treatment = info['treatment']
                    if isinstance(treatment, list):
                        print(f"   Treatment steps: {len(treatment)}")
                    else:
                        print(f"   Treatment: {treatment[:100]}...")
            
            print(f"\n⏱️  Processing time: {result.get('processing_time_ms')}ms")
        else:
            print(f"❌ Error: {data.get('error')}")
            return False
    
    except Exception as e:
        print(f"❌ Error: {e}")
        return False
    
    return True

def find_test_image():
    """Find a test image"""
    possible_paths = [
        "test_image.jpg",
        "sample.jpg",
        "leaf.jpg",
        "tests/test_image.jpg",
        "../tests/test_image.jpg",
    ]
    
    # Also search in current directory
    current_dir = Path(".")
    for item in current_dir.glob("*.jpg"):
        possible_paths.insert(0, str(item))
    for item in current_dir.glob("*.png"):
        possible_paths.insert(0, str(item))
    
    for path in possible_paths:
        if os.path.exists(path):
            return path
    
    return None

def main():
    print("""
╔════════════════════════════════════════════════════════╗
║     EfficientNetB0 H5 Model Testing                   ║
╚════════════════════════════════════════════════════════╝
    """)
    
    print(f"🔗 Server: {API_BASE}")
    
    # Test 1: List models
    if not test_models_list():
        print("\n❌ Cannot connect to server")
        sys.exit(1)
    
    # Test 2: H5 Prediction
    image_path = find_test_image()
    
    if image_path:
        print(f"\n📸 Found test image: {image_path}")
        test_predict_h5(image_path)
    else:
        print("\n⚠️  No test image found. To test prediction:")
        print(f"   1. Place an image file in current directory")
        print(f"   2. Run: python test_h5.py")
    
    print("\n" + "="*60)
    print("✅ Testing complete!")
    print("="*60)

if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
🌿 Test Leaf Disease Detector API
Tests the complete prediction pipeline
"""

import requests
import json
import os
from pathlib import Path

API_URL = "http://127.0.0.1:8765/api/predict"
ORGANIZED_DATA = Path("D:/huy/leaf-disease-detector-1/data/organized")

def find_test_image():
    """Find first available test image"""
    for crop_dir in ORGANIZED_DATA.iterdir():
        if crop_dir.is_dir():
            for disease_dir in crop_dir.iterdir():
                if disease_dir.is_dir():
                    images = list(disease_dir.glob("*.JPG")) + list(disease_dir.glob("*.jpg"))
                    if images:
                        return str(images[0])
    return None

def test_prediction():
    """Test the prediction API"""
    print("""
╔════════════════════════════════════════════════════╗
║  🌿 LEAF DISEASE DETECTOR - API TEST               ║
╚════════════════════════════════════════════════════╝
    """)
    
    # Find test image
    test_image = find_test_image()
    if not test_image:
        print("❌ No test images found in data/organized/")
        return
    
    print(f"🖼️  Test Image: {Path(test_image).name}")
    print(f"📁 Full Path: {test_image}\n")
    
    # Upload to API
    print(f"📤 Uploading to {API_URL}...")
    try:
        with open(test_image, 'rb') as f:
            files = {'image': f}
            response = requests.post(API_URL, files=files, timeout=30)
        
        if response.status_code == 200:
            print(f"✅ Response received (Status: {response.status_code})\n")
            
            result = response.json()
            
            # Display results
            print("=" * 55)
            print("📋 PREDICTION RESULTS")
            print("=" * 55)
            
            if result.get('success'):
                pred = result['prediction']
                
                print(f"\n🎯 Disease: {pred.get('prediction', 'N/A')}")
                print(f"📊 Confidence: {pred.get('confidence', 0):.2%}")
                print(f"🌾 Crop: {pred.get('crop', 'N/A')}")
                print(f"💚 Healthy: {pred.get('isHealthy', 'N/A')}")
                print(f"⚠️  Severity: {pred.get('severity', 'N/A')}")
                
                # Model info
                model_info = pred.get('modelInfo', {})
                if model_info:
                    print(f"\n🤖 Model: {model_info.get('name', 'N/A')}")
                    print(f"📦 Models Used: {model_info.get('modelsUsed', 'N/A')}")
                
                # Ensemble data
                ensemble = pred.get('ensembleData', {})
                if ensemble:
                    print(f"\n🗳️  ENSEMBLE VOTING (3 Models)")
                    print(f"   Final Disease: {ensemble.get('finalDisease')}")
                    print(f"   Confidence: {ensemble.get('confidencePercentage')}")
                    print(f"   Unanimous Vote: {'✅ Yes' if ensemble.get('unanimousVote') else '❌ No'}")
                    print(f"   Treatment: {ensemble.get('recommendedTreatment', 'N/A')[:80]}...")
                    
                    # Model breakdown
                    if ensemble.get('modelBreakdown'):
                        print(f"\n   Model Predictions:")
                        for model in ensemble.get('modelBreakdown', []):
                            print(f"     - {model.get('modelName')}: {model.get('disease')} ({model.get('confidence')})")
                
                print("\n" + "=" * 55)
                print("✅ TEST SUCCESSFUL - Full response saved\n")
                
                # Save full response
                with open("d:/huy/leaf-disease-detector-1/api_test_response.json", "w") as f:
                    json.dump(result, f, indent=2, ensure_ascii=False)
                print("💾 Full response saved to api_test_response.json")
                
            else:
                print(f"❌ Error: {result.get('error', 'Unknown error')}")
                print(f"Message: {result.get('message', 'N/A')}")
        else:
            print(f"❌ Error: HTTP {response.status_code}")
            print(f"Response: {response.text}")
    
    except requests.exceptions.ConnectionError:
        print("❌ Error: Could not connect to server")
        print("   Make sure: npm start is running on port 8765")
    except Exception as err:
        print(f"❌ Error: {err}")

if __name__ == "__main__":
    test_prediction()

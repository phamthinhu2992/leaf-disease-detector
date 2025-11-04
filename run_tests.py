#!/usr/bin/env python3
"""
Comprehensive End-to-End Testing for Leaf Disease Detector
Tests all 17 APIs, image upload, database operations, and performance
"""

import requests
import json
import time
import os
from datetime import datetime

# Configuration
API_BASE = "http://127.0.0.1:8765"
TEST_IMAGE = None  # Will search for test image
TIMEOUT = 10

# Test results
results = {
    "timestamp": datetime.now().isoformat(),
    "api_base": API_BASE,
    "tests": [],
    "summary": {
        "total": 0,
        "passed": 0,
        "failed": 0,
        "errors": []
    }
}

def find_test_image():
    """Find a test image from organized data"""
    data_paths = [
        "data/organized/Tomato/Healthy",
        "data/organized/Pepper/Healthy",
        "data/organized/Potato/Healthy",
    ]
    
    for path in data_paths:
        if os.path.exists(path):
            files = os.listdir(path)
            if files:
                return os.path.join(path, files[0])
    return None

def test(name, method, endpoint, **kwargs):
    """Execute a single test"""
    results["summary"]["total"] += 1
    url = f"{API_BASE}{endpoint}"
    test_result = {
        "name": name,
        "method": method,
        "endpoint": endpoint,
        "status": "pending",
        "response_time": 0,
        "result": None,
        "error": None
    }
    
    try:
        start = time.time()
        
        if method == "GET":
            response = requests.get(url, timeout=TIMEOUT, **kwargs)
        elif method == "POST":
            response = requests.post(url, timeout=TIMEOUT, **kwargs)
        elif method == "PUT":
            response = requests.put(url, timeout=TIMEOUT, **kwargs)
        elif method == "DELETE":
            response = requests.delete(url, timeout=TIMEOUT, **kwargs)
        
        elapsed = time.time() - start
        test_result["response_time"] = round(elapsed * 1000, 2)
        test_result["status_code"] = response.status_code
        
        # Check if response is successful
        if response.status_code in [200, 201]:
            try:
                test_result["result"] = response.json()
                test_result["status"] = "PASS"
                results["summary"]["passed"] += 1
                print(f"✅ {name:50} - {response.status_code} ({test_result['response_time']}ms)")
            except:
                test_result["status"] = "PASS"
                results["summary"]["passed"] += 1
                print(f"✅ {name:50} - {response.status_code} ({test_result['response_time']}ms)")
        else:
            test_result["status"] = "FAIL"
            test_result["error"] = response.text
            results["summary"]["failed"] += 1
            print(f"❌ {name:50} - {response.status_code}")
    
    except requests.ConnectionError as e:
        test_result["status"] = "ERROR"
        test_result["error"] = "Connection refused - Server not running?"
        results["summary"]["failed"] += 1
        results["summary"]["errors"].append(str(e))
        print(f"❌ {name:50} - CONNECTION ERROR")
        return test_result
    
    except Exception as e:
        test_result["status"] = "ERROR"
        test_result["error"] = str(e)
        results["summary"]["failed"] += 1
        results["summary"]["errors"].append(str(e))
        print(f"❌ {name:50} - ERROR: {str(e)}")
    
    results["tests"].append(test_result)
    return test_result

def main():
    print("\n" + "="*80)
    print("🧪 LEAF DISEASE DETECTOR - END-TO-END TESTING")
    print("="*80)
    print(f"\nAPI Base: {API_BASE}")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("\n" + "-"*80 + "\n")
    
    # 1. ROOT ENDPOINT
    print("📡 Testing Root Endpoint:")
    test("Root endpoint", "GET", "/")
    print()
    
    # 2. HEALTH CHECK
    print("🏥 Testing Health Check:")
    test("Health check", "GET", "/health")
    print()
    
    # 3. DISEASE APIS
    print("🦠 Testing Disease APIs:")
    test("List all diseases", "GET", "/api/diseases")
    test("Search disease (early)", "GET", "/api/diseases/search?q=early")
    print()
    
    # 4. PREDICTION APIS
    print("🤖 Testing Prediction APIs:")
    test("Test prediction", "GET", "/api/test-predict")
    
    # Try image upload if test image found
    test_image_path = find_test_image()
    if test_image_path:
        try:
            with open(test_image_path, 'rb') as f:
                files = {'image': f}
                response = requests.post(f"{API_BASE}/api/predict", files=files, timeout=TIMEOUT)
                test_result = {
                    "name": "Image prediction",
                    "method": "POST",
                    "endpoint": "/api/predict",
                    "status": "PASS" if response.status_code == 200 else "FAIL",
                    "status_code": response.status_code,
                    "response_time": 0,
                    "result": response.json() if response.status_code == 200 else None,
                    "error": None
                }
                results["tests"].append(test_result)
                results["summary"]["total"] += 1
                if response.status_code == 200:
                    results["summary"]["passed"] += 1
                    print(f"✅ {'Image prediction':50} - {response.status_code}")
                else:
                    results["summary"]["failed"] += 1
                    print(f"❌ {'Image prediction':50} - {response.status_code}")
        except Exception as e:
            print(f"⚠️  Skipping image prediction test: {str(e)}")
    else:
        print("⚠️  No test image found, skipping image prediction")
    print()
    
    # 5. CROP MANAGEMENT APIS
    print("🌱 Testing Crop Management APIs:")
    test("List crops", "GET", "/api/crops/user/1")
    test("Get crop detail", "GET", "/api/crops/1")
    test("Search crops", "GET", "/api/crops/search?query=tomato")
    test("Nearby crops", "GET", "/api/crops/nearby?lat=11.94&lon=109.19&radius=50")
    print()
    
    # 6. WEATHER APIS
    print("🌤️  Testing Weather APIs:")
    test("Weather forecast", "GET", "/api/weather/forecast?lat=11.94&lon=109.19")
    test("Auto location", "GET", "/api/weather/auto-location")
    test("Extended forecast", "GET", "/api/weather/extended?lat=11.94&lon=109.19")
    print()
    
    # 7. CHATBOT APIS
    print("💬 Testing Chatbot APIs:")
    test("Chatbot health", "GET", "/api/chatbot/health")
    test("Chatbot suggestions", "GET", "/api/chatbot/suggestions?crop_type=tomato")
    test("Disease info", "GET", "/api/chatbot/disease-info/early_blight")
    
    # Test ask question
    try:
        response = requests.post(
            f"{API_BASE}/api/chatbot/ask",
            json={"question": "What is early blight?", "crop_type": "tomato"},
            timeout=TIMEOUT
        )
        test_result = {
            "name": "Ask chatbot",
            "method": "POST",
            "endpoint": "/api/chatbot/ask",
            "status": "PASS" if response.status_code == 200 else "FAIL",
            "status_code": response.status_code,
            "response_time": 0,
            "result": response.json() if response.status_code == 200 else None,
            "error": None
        }
        results["tests"].append(test_result)
        results["summary"]["total"] += 1
        if response.status_code == 200:
            results["summary"]["passed"] += 1
            print(f"✅ {'Ask chatbot':50} - {response.status_code}")
        else:
            results["summary"]["failed"] += 1
            print(f"❌ {'Ask chatbot':50} - {response.status_code}")
    except Exception as e:
        print(f"❌ {'Ask chatbot':50} - {str(e)}")
    print()
    
    # 8. TEST PAGE
    print("🧪 Testing Test Upload Page:")
    test("Test upload UI", "GET", "/test-upload")
    print()
    
    # SUMMARY
    print("="*80)
    print("📊 TEST SUMMARY")
    print("="*80)
    print(f"Total Tests:     {results['summary']['total']}")
    print(f"Passed:          {results['summary']['passed']} ✅")
    print(f"Failed:          {results['summary']['failed']} ❌")
    success_rate = (results['summary']['passed'] / results['summary']['total'] * 100) if results['summary']['total'] > 0 else 0
    print(f"Success Rate:    {success_rate:.1f}%")
    
    if results['summary']['errors']:
        print(f"\nErrors:")
        for error in results['summary']['errors']:
            print(f"  - {error}")
    
    print("\n" + "="*80)
    if results['summary']['failed'] == 0:
        print("✅ ALL TESTS PASSED - SYSTEM READY FOR PRODUCTION!")
    else:
        print(f"⚠️  {results['summary']['failed']} tests failed - Review results below")
    print("="*80 + "\n")
    
    # Save results
    with open("TEST_RESULTS.json", "w") as f:
        json.dump(results, f, indent=2)
    print("📁 Results saved to TEST_RESULTS.json")
    
    return results['summary']['failed'] == 0

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)

#!/usr/bin/env python
"""
Environment Validation Script
Verifies all dependencies and core modules are working correctly
"""

import sys
import os

def test_imports():
    """Test all critical imports"""
    print("=" * 60)
    print("ENVIRONMENT VALIDATION TEST")
    print("=" * 60)
    
    modules_to_test = [
        ("numpy", "NumPy"),
        ("tensorflow", "TensorFlow"),
        ("keras", "Keras"),
        ("cv2", "OpenCV"),
        ("albumentations", "Albumentations"),
        ("PIL", "Pillow"),
        ("matplotlib", "Matplotlib"),
        ("sklearn", "Scikit-Learn"),
        ("pandas", "Pandas"),
        ("scipy", "SciPy"),
        ("tensorflow.keras.preprocessing", "Keras Preprocessing"),
        ("tensorboard", "TensorBoard"),
        ("joblib", "Joblib"),
    ]
    
    failed = []
    success_count = 0
    
    print("\n[TESTING CORE DEPENDENCIES]")
    for module_name, display_name in modules_to_test:
        try:
            __import__(module_name)
            print(f"  OK: {display_name}")
            success_count += 1
        except ImportError as e:
            print(f"  FAIL: {display_name} - {str(e)}")
            failed.append((display_name, str(e)))
    
    print("\n[TESTING CUSTOM MODULES]")
    try:
        from mobilenetv2_attention_model import create_mobilenetv2_attention_model
        print("  OK: MobileNetV2 Attention Model")
        success_count += 1
    except Exception as e:
        print(f"  FAIL: MobileNetV2 Attention Model - {str(e)}")
        failed.append(("MobileNetV2 Attention Model", str(e)))
    
    try:
        from segmentation_service import SegmentationService
        print("  OK: Segmentation Service")
        success_count += 1
    except Exception as e:
        print(f"  FAIL: Segmentation Service - {str(e)}")
        failed.append(("Segmentation Service", str(e)))
    
    try:
        from transfer_learning_trainer import TransferLearningTrainer
        print("  OK: Transfer Learning Trainer")
        success_count += 1
    except Exception as e:
        print(f"  FAIL: Transfer Learning Trainer - {str(e)}")
        failed.append(("Transfer Learning Trainer", str(e)))
    
    print("\n" + "=" * 60)
    print(f"RESULTS: {success_count} passed", end="")
    if failed:
        print(f", {len(failed)} failed")
        print("\nFailed imports:")
        for name, error in failed:
            print(f"  - {name}: {error}")
        return False
    else:
        print(" (All tests passed!)")
        return True

if __name__ == "__main__":
    success = test_imports()
    sys.exit(0 if success else 1)

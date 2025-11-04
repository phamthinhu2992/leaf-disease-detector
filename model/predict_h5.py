"""
Dự đoán ảnh sử dụng model H5 (EfficientNetB0)
Tích hợp với backend Node.js để phân loại bệnh lá cây
"""

import argparse
import json
import os
import sys
from typing import Tuple, List, Optional, Dict
import warnings

import cv2
import numpy as np
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing import image as keras_image

warnings.filterwarnings('ignore')


class DiseasePredictorH5:
    """Dự đoán bệnh lá cây sử dụng model EfficientNetB0 H5"""
    
    def __init__(self, model_path: str, disease_info_path: Optional[str] = None):
        """
        Khởi tạo predictor
        
        Args:
            model_path: Đường dẫn đến file .h5
            disease_info_path: Đường dẫn đến file disease_info.json
        """
        self.model_path = model_path
        self.model = None
        self.disease_info = {}
        self.class_names = None
        
        # Load model
        try:
            print(f"📦 Đang tải model từ: {model_path}")
            self.model = load_model(model_path)
            print(f"✅ Model đã tải thành công!")
            print(f"   Input shape: {self.model.input_shape}")
            print(f"   Output shape: {self.model.output_shape}")
        except Exception as e:
            print(f"❌ Lỗi tải model: {e}", file=sys.stderr)
            raise
        
        # Load disease info
        self.load_disease_info(disease_info_path)
    
    def load_disease_info(self, disease_info_path: Optional[str] = None):
        """Tải thông tin bệnh từ JSON"""
        paths_to_try = [
            disease_info_path,
            os.path.join(os.path.dirname(self.model_path), 'disease_info.json'),
            os.path.join(os.getcwd(), 'models', 'disease_info.json'),
            'models/disease_info.json',
        ]
        
        for path in paths_to_try:
            if path and os.path.exists(path):
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        self.disease_info = json.load(f)
                    print(f"✅ Đã tải disease_info từ: {path}")
                    return
                except Exception as e:
                    print(f"⚠️  Không tải được {path}: {e}", file=sys.stderr)
        
        print(f"⚠️  Không tìm thấy disease_info.json", file=sys.stderr)
    
    def set_class_names(self, class_names: List[str]):
        """Thiết lập tên các lớp"""
        self.class_names = class_names
    
    def preprocess_image(self, image_path: str, img_size: int = 224) -> np.ndarray:
        """
        Tiền xử lý ảnh cho EfficientNetB0
        
        Args:
            image_path: Đường dẫn ảnh
            img_size: Kích thước input (224 cho EfficientNetB0)
        
        Returns:
            np.ndarray: Ảnh đã xử lý, shape (1, img_size, img_size, 3)
        """
        # Đọc ảnh
        img = cv2.imread(image_path)
        if img is None:
            raise RuntimeError(f"❌ Không thể đọc ảnh: {image_path}")
        
        # Chuyển BGR -> RGB
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        
        # Resize
        img = cv2.resize(img, (img_size, img_size), interpolation=cv2.INTER_AREA)
        
        # Normalize (EfficientNetB0 cần normalize khác nhau)
        # Sử dụng cách normalize mặc định của Keras
        img = img.astype('float32') / 255.0
        
        # Add batch dimension
        img = np.expand_dims(img, axis=0)
        
        return img
    
    def predict(self, image_path: str, prob_thresh: float = 0.3, topk: int = 3) -> Dict:
        """
        Dự đoán ảnh
        
        Args:
            image_path: Đường dẫn ảnh
            prob_thresh: Ngưỡng xác nhận (dưới ngưỡng -> unknown)
            topk: Số nhãn gợi ý top-K
        
        Returns:
            Dict: {
                'label': str (tên bệnh),
                'confidence': float (0-1),
                'topk': List[tuple] ([(tên, xác suất), ...]),
                'info': dict (thông tin bệnh),
                'is_valid': bool
            }
        """
        try:
            # Tiền xử lý
            x = self.preprocess_image(image_path)
            
            # Dự đoán
            predictions = self.model.predict(x, verbose=0)
            probs = predictions[0]  # (num_classes,)
            
            # Top-K
            top_indices = np.argsort(probs)[::-1][:topk]
            
            # Nhãn tốt nhất
            best_idx = int(top_indices[0])
            best_prob = float(probs[best_idx])
            
            # Lấy tên lớp
            if self.class_names:
                best_label = self.class_names[best_idx]
            else:
                best_label = f"class_{best_idx}"
            
            # Kiểm tra ngưỡng
            is_valid = best_prob >= prob_thresh
            
            if not is_valid:
                best_label = "unknown"
            
            # Thông tin bệnh
            info = self.disease_info.get(best_label, {})
            
            # Top-K list
            topk_list = []
            for idx in top_indices:
                idx = int(idx)
                prob = float(probs[idx])
                if self.class_names:
                    label = self.class_names[idx]
                else:
                    label = f"class_{idx}"
                topk_list.append({
                    'label': label,
                    'confidence': prob
                })
            
            return {
                'label': best_label,
                'confidence': best_prob,
                'topk': topk_list,
                'info': info,
                'is_valid': is_valid,
                'num_classes': len(probs)
            }
        
        except Exception as e:
            print(f"❌ Lỗi dự đoán: {e}", file=sys.stderr)
            raise


def print_prediction_result(result: Dict):
    """In kết quả dự đoán"""
    print("\n" + "="*50)
    print("📊 KẾT QUẢ DỰ ĐOÁN")
    print("="*50)
    
    label = result['label']
    conf = result['confidence']
    is_valid = result['is_valid']
    
    if label == "unknown":
        print(f"❓ Kết quả: KHÔNG XÁC ĐỊNH")
        print(f"   Độ tin cậy cao nhất: {conf:.1%}")
        print(f"   ⚠️  Thấp hơn ngưỡng xác nhận")
    else:
        print(f"✅ Bệnh: {label}")
        print(f"   Độ tin cậy: {conf:.1%}")
    
    # Thông tin bệnh
    info = result['info']
    if info:
        print(f"\n📋 THÔNG TIN:")
        
        # Mô tả
        if 'description' in info:
            print(f"   • Mô tả: {info['description'][:100]}...")
        
        # Triệu chứng
        if 'symptoms' in info:
            print(f"   • Triệu chứng: {info['symptoms'][:100]}...")
        
        # Điều trị
        if 'treatment' in info:
            treatment = info['treatment']
            if isinstance(treatment, list):
                print(f"   • Điều trị ({len(treatment)} bước):")
                for step in treatment[:2]:
                    print(f"     - {step[:50]}...")
            else:
                print(f"   • Điều trị: {treatment[:100]}...")
    
    # Top-K
    print(f"\n🎯 TOP-{len(result['topk'])} PREDICTIONS:")
    for i, pred in enumerate(result['topk'], 1):
        print(f"   {i}. {pred['label']}: {pred['confidence']:.1%}")
    
    print("="*50 + "\n")


def main():
    parser = argparse.ArgumentParser(
        description="Dự đoán bệnh lá cây sử dụng EfficientNetB0 H5"
    )
    parser.add_argument('--model', required=True, help='Đường dẫn file .h5')
    parser.add_argument('--image', required=True, help='Đường dẫn ảnh')
    parser.add_argument('--disease-info', default=None, help='Đường dẫn disease_info.json')
    parser.add_argument('--classes', default=None, help='Đường dẫn file class_names.json')
    parser.add_argument('--prob-thresh', type=float, default=0.3, 
                       help='Ngưỡng xác nhận')
    parser.add_argument('--topk', type=int, default=3, help='Top-K results')
    parser.add_argument('--json-output', action='store_true', 
                       help='Output JSON thay vì text')
    
    args = parser.parse_args()
    
    # Kiểm tra file tồn tại
    if not os.path.exists(args.model):
        print(f"❌ Không tìm thấy model: {args.model}", file=sys.stderr)
        sys.exit(1)
    
    if not os.path.exists(args.image):
        print(f"❌ Không tìm thấy ảnh: {args.image}", file=sys.stderr)
        sys.exit(1)
    
    # Tải class names nếu có
    class_names = None
    if args.classes and os.path.exists(args.classes):
        try:
            with open(args.classes, 'r', encoding='utf-8') as f:
                class_names = json.load(f)
        except Exception as e:
            print(f"⚠️  Không tải được class_names: {e}", file=sys.stderr)
    
    # Tạo predictor
    try:
        predictor = DiseasePredictorH5(args.model, args.disease_info)
        
        if class_names:
            predictor.set_class_names(class_names)
            print(f"📋 Số lớp: {len(class_names)}")
        
        # Dự đoán
        result = predictor.predict(args.image, args.prob_thresh, args.topk)
        
        # Output
        if args.json_output:
            # JSON output
            output = {
                'label': result['label'],
                'confidence': result['confidence'],
                'is_valid': result['is_valid'],
                'topk': result['topk'],
                'info': result['info']
            }
            print(json.dumps(output, ensure_ascii=False, indent=2))
        else:
            # Text output
            print_prediction_result(result)
    
    except Exception as e:
        print(f"❌ Lỗi: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()

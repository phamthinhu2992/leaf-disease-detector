import argparse
import json
import os
import sys
from typing import Tuple, List, Optional

import cv2
import joblib
import numpy as np


def load_model_artifact(path: str):
    obj = joblib.load(path)
    model = obj.get('model') or obj
    le = obj.get('label_encoder')
    disease_info = obj.get('disease_info', {}) if isinstance(obj, dict) else {}
    return model, le, disease_info


def preprocess_img(path: str, img_size: int = 128, keep_aspect: bool = True) -> np.ndarray:
    img = cv2.imread(path)
    if img is None:
        raise RuntimeError(f"Không thể đọc ảnh: {path}")
    h, w = img.shape[:2]
    if keep_aspect:
        scale = min(img_size / w, img_size / h)
        nw, nh = max(1, int(w * scale)), max(1, int(h * scale))
        img = cv2.resize(img, (nw, nh), interpolation=cv2.INTER_AREA)
        top = (img_size - nh) // 2
        bottom = img_size - nh - top
        left = (img_size - nw) // 2
        right = img_size - nw - left
        img = cv2.copyMakeBorder(img, top, bottom, left, right, cv2.BORDER_CONSTANT, value=[0, 0, 0])
    else:
        img = cv2.resize(img, (img_size, img_size), interpolation=cv2.INTER_AREA)
    x = img.astype('float32') / 255.0
    return x.reshape(1, -1)


def predict_image(model, le, disease_info: dict, img_path: str, img_size: int = 128,
                  keep_aspect: bool = True, prob_thresh: float = 0.6, topk: int = 3
                  ) -> Tuple[str, Optional[float], Optional[dict], List[tuple]]:
    x = preprocess_img(img_path, img_size=img_size, keep_aspect=keep_aspect)

    # Try predict_proba (preferred)
    if hasattr(model, "predict_proba"):
        try:
            probs = model.predict_proba(x)[0]
            idxs = np.argsort(probs)[::-1]
            best_pos = int(idxs[0])
            best_prob = float(probs[best_pos])

            # map position -> class label value (model.classes_)
            try:
                class_encoded_best = model.classes_[best_pos]
            except Exception:
                # fallback if classes_ missing or unusual
                class_encoded_best = best_pos

            if le is not None:
                # inverse_transform expects array-like of encoded labels
                try:
                    label = le.inverse_transform([class_encoded_best])[0]
                except Exception:
                    label = str(class_encoded_best)
            else:
                label = str(class_encoded_best)

            # build topk list of (label, prob)
            topk_list = []
            for pos in idxs[:topk]:
                pos = int(pos)
                prob = float(probs[pos])
                try:
                    class_enc = model.classes_[pos]
                except Exception:
                    class_enc = pos
                try:
                    lab = le.inverse_transform([class_enc])[0] if le is not None else str(class_enc)
                except Exception:
                    lab = str(class_enc)
                topk_list.append((lab, prob))

            if best_prob < prob_thresh:
                return "unknown", best_prob, None, topk_list

            info = disease_info.get(label)
            return label, best_prob, info, topk_list

        except Exception as e:
            # If predict_proba fails unexpectedly, fall through to predict()
            # but preserve error message for logging
            # print to stderr minimal info
            print(f"Warning: predict_proba path failed: {e}", file=sys.stderr)

    # Fallback to predict()
    try:
        pred = model.predict(x)[0]
        # pred may be encoded label or string label
        try:
            if le is not None:
                label = le.inverse_transform([pred])[0]
            else:
                label = str(pred)
        except Exception:
            # last resort: string cast
            label = str(pred)
        info = disease_info.get(label)
        return label, None, info, [(label, None)]
    except Exception as e:
        raise RuntimeError(f"Dự đoán thất bại hoàn toàn: {e}")


def print_disease_info(label: str, cert: Optional[float], info: Optional[dict]):
    print("==== CHẨN ĐOÁN ====")
    if label == "unknown":
        print("Kết quả: KHÔNG XÁC ĐỊNH (độ tin cậy của mô hình thấp)")
        if cert is not None:
            print(f"Độ tin cậy cao nhất: {cert:.3f}")
        print("Hành động: Kiểm tra lại ảnh, thêm ảnh có nhãn tương ứng và huấn luyện lại.")
        return

    print(f"Nhãn dự đoán: {label}")
    if cert is not None:
        print(f"Độ tin cậy: {cert:.3f}")

    if not info:
        print("Không tìm thấy thông tin bệnh cho nhãn này. Hãy cập nhật models/disease_info.json (tiếng Việt).")
        return

    conclusion = info.get('conclusion') or info.get('diagnosis') or info.get('name') or "Không có kết luận ngắn."
    description = info.get('description') or "Không có mô tả."
    symptoms = info.get('symptoms') or "Không có thông tin triệu chứng."
    treatment = info.get('treatment')
    recommendations = info.get('recommendations') or info.get('advice') or "Không có khuyến nghị thực tế."

    print("\nKẾT LUẬN:")
    print(conclusion)

    print("\nMÔ TẢ:")
    print(description)

    print("\nTRIỆU CHỨNG:")
    print(symptoms)

    print("\nĐIỀU TRỊ / CÁCH XỬ LÝ (chi tiết):")
    if treatment:
        if isinstance(treatment, list):
            for i, step in enumerate(treatment, 1):
                print(f"  {i}. {step}")
        else:
            print(treatment)
    else:
        print("Chưa có hướng điều trị chi tiết — cập nhật models/disease_info.json bằng tiếng Việt.")

    print("\nKHUYẾN NGHỊ THỰC TẾ:")
    print(recommendations)
    severity = info.get('severity') if info else None
    if severity:
        print(f"\nMức độ / Khẩn cấp: {severity}")


def find_additional_disease_info(explicit_path: Optional[str], model_path: Optional[str], image_path: Optional[str]):
    # priority: explicit_path -> model_path dir/disease_info.json -> cwd/models/disease_info.json -> walk up from image path
    def load_json_safe(p):
        try:
            with open(p, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return {}

    if explicit_path and os.path.exists(explicit_path):
        return load_json_safe(explicit_path)

    if model_path:
        cand = os.path.join(os.path.dirname(model_path), 'disease_info.json')
        if os.path.exists(cand):
            return load_json_safe(cand)

    cand2 = os.path.join(os.getcwd(), 'models', 'disease_info.json')
    if os.path.exists(cand2):
        return load_json_safe(cand2)

    if image_path:
        p = os.path.abspath(image_path)
        for _ in range(6):
            p = os.path.dirname(p)
            if not p:
                break
            cand = os.path.join(p, 'disease_info.json')
            if os.path.exists(cand):
                return load_json_safe(cand)
    return {}


def main():
    p = argparse.ArgumentParser(description="Dự đoán ảnh và hiển thị thông tin bệnh (tiếng Việt)")
    p.add_argument('--model', required=True, help='Đường dẫn tới file model .pkl')
    p.add_argument('--image', required=True, help='Đường dẫn tới ảnh cần dự đoán')
    p.add_argument('--disease-info', default=None, help='(Tùy chọn) JSON thông tin bệnh (ghi bằng tiếng Việt)')
    p.add_argument('--img-size', type=int, default=128)
    p.add_argument('--keep-aspect', action='store_true', default=True)
    p.add_argument('--prob-thresh', type=float, default=0.6, help='Ngưỡng xác nhận dự đoán; dưới ngưỡng => unknown')
    p.add_argument('--topk', type=int, default=3, help='Hiện top-K nhãn gợi ý')
    args = p.parse_args()

    if not os.path.exists(args.model):
        print(f"Không tìm thấy model: {args.model}", file=sys.stderr)
        sys.exit(1)
    if not os.path.exists(args.image):
        print(f"Không tìm thấy ảnh: {args.image}", file=sys.stderr)
        sys.exit(1)

    model, le, disease_info_artifact = load_model_artifact(args.model)

    # Merge disease_info preference: explicit file overrides artifact
    disease_info = disease_info_artifact or {}
    extra = find_additional_disease_info(args.disease_info, args.model, args.image)
    if extra:
        # explicit or found file should override artifact entries
        disease_info = {**disease_info, **extra}
        if args.disease_info:
            print(f"Đã tải thông tin bệnh từ: {args.disease_info}")

    try:
        label, cert, info, topk = predict_image(model, le, disease_info, args.image,
                                               img_size=args.img_size, keep_aspect=args.keep_aspect,
                                               prob_thresh=args.prob_thresh, topk=args.topk)
    except Exception as e:
        print(f"Dự đoán thất bại: {e}", file=sys.stderr)
        sys.exit(1)

    print_disease_info(label, cert, info)

    print("\nNhững nhãn gợi ý (Top candidates):")
    for lab, pscore in topk:
        if pscore is None:
            print(f" - {lab} (điểm: N/A)")
        else:
            print(f" - {lab}: {pscore:.3f}")


if __name__ == "__main__":
    main()

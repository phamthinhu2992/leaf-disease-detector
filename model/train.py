"""
Robust training script:
- Thông báo lỗi import rõ ràng
- Xử lý file ảnh hỏng/không đọc được
- Dùng LabelEncoder để lưu mapping nhãn
- Thêm tham số n_estimators, n_jobs, verbose
- Fallback khi stratify không khả dụng
- Lưu model + label encoder
"""
import sys
import os
import argparse
import logging

# Safe imports with helpful messages
try:
    import cv2
except Exception as e:
    print("Error: OpenCV (cv2) not installed or failed to import. Install opencv-python.", file=sys.stderr)
    raise

try:
    import joblib
except Exception as e:
    print("Error: joblib not installed. Install joblib.", file=sys.stderr)
    raise

try:
    import numpy as np
except Exception as e:
    print("Error: numpy not installed. Install numpy.", file=sys.stderr)
    raise

try:
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.metrics import classification_report, confusion_matrix
    from sklearn.model_selection import train_test_split
    from sklearn.preprocessing import LabelEncoder
except Exception as e:
    print("Error: scikit-learn not installed. Install scikit-learn.", file=sys.stderr)
    raise

ALLOWED_EXT = {'.jpg', '.jpeg', '.png', '.bmp', '.tif', '.tiff'}

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")


def resize_and_pad(image, target_size):
    """
    Resize image preserving aspect ratio and pad with black to target_size (w,h).
    """
    target_w, target_h = target_size
    h, w = image.shape[:2]
    # scale to fit inside target
    scale = min(target_w / w, target_h / h)
    new_w, new_h = max(1, int(w * scale)), max(1, int(h * scale))
    resized = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_AREA)
    top = (target_h - new_h) // 2
    bottom = target_h - new_h - top
    left = (target_w - new_w) // 2
    right = target_w - new_w - left
    padded = cv2.copyMakeBorder(resized, top, bottom, left, right, cv2.BORDER_CONSTANT, value=[0, 0, 0])
    return padded


def load_data(data_dir, target_size=(128, 128), keep_aspect=True):
    if not os.path.exists(data_dir):
        raise FileNotFoundError(f"Dataset folder not found: {data_dir}")

    images = []
    labels = []
    for label in sorted(os.listdir(data_dir)):
        label_dir = os.path.join(data_dir, label)
        if not os.path.isdir(label_dir):
            continue
        files = sorted(os.listdir(label_dir))
        if len(files) == 0:
            logging.warning("Empty class folder: %s", label_dir)
        for img_file in files:
            _, ext = os.path.splitext(img_file.lower())
            if ext not in ALLOWED_EXT:
                continue
            img_path = os.path.join(label_dir, img_file)
            try:
                image = cv2.imread(img_path)
            except Exception as e:
                logging.warning("cv2.imread failed for %s: %s", img_path, e)
                continue
            if image is None:
                logging.warning("Cannot read image (None) %s", img_path)
                continue
            try:
                if keep_aspect:
                    image = resize_and_pad(image, target_size)
                else:
                    image = cv2.resize(image, target_size, interpolation=cv2.INTER_AREA)
            except Exception as e:
                logging.warning("Failed to process %s: %s", img_path, e)
                continue
            images.append(image)
            labels.append(label)

    if len(images) == 0:
        raise RuntimeError(f"No valid images found in {data_dir}")

    images = np.array(images)
    labels = np.array(labels)
    logging.info("Loaded %d images, %d classes", len(images), len(np.unique(labels)))
    return images, labels


def preprocess_images(images):
    images = images.astype('float32') / 255.0
    return images.reshape(images.shape[0], -1)


def train_model(X_train, y_train, n_estimators=100, n_jobs=-1, random_state=42):
    model = RandomForestClassifier(n_estimators=n_estimators, n_jobs=n_jobs, random_state=random_state)
    model.fit(X_train, y_train)
    return model


def parse_args():
    p = argparse.ArgumentParser(description="Train leaf disease classifier (robust)")
    p.add_argument('--data-dir', required=True, help='Path to dataset root (subfolders per class)')
    p.add_argument('--output', default='leaf_disease_model.pkl', help='Output model file path')
    p.add_argument('--test-size', type=float, default=0.2, help='Test set fraction')
    p.add_argument('--img-size', type=int, default=128, help='Resize image to (img-size, img-size)')
    p.add_argument('--n-estimators', type=int, default=100, help='RandomForest n_estimators')
    p.add_argument('--n-jobs', type=int, default=-1, help='RandomForest n_jobs (-1 = all cores)')
    p.add_argument('--keep-aspect', action='store_true', default=True, help='Resize preserving aspect ratio and pad to square')
    return p.parse_args()


def main():
    args = parse_args()
    try:
        images, labels = load_data(args.data_dir, target_size=(args.img_size, args.img_size), keep_aspect=args.keep_aspect)
    except Exception as e:
        logging.error("Failed to load data: %s", e)
        sys.exit(1)

    X = preprocess_images(images)
    le = LabelEncoder()
    y_encoded = le.fit_transform(labels)

    # Check class counts for stratify suitability
    unique, counts = np.unique(y_encoded, return_counts=True)
    class_counts = dict(zip(unique.tolist(), counts.tolist()))
    logging.info("Class counts: %s", class_counts)

    stratify = y_encoded if all(c >= 2 for c in counts) else None
    if stratify is None:
        logging.warning("Stratified split not possible (some class has <2 samples). Using non-stratified split.")

    try:
        X_train, X_test, y_train, y_test = train_test_split(
            X, y_encoded, test_size=args.test_size, random_state=42, stratify=stratify
        )
    except Exception as e:
        logging.warning("train_test_split failed with stratify=%s: %s. Retrying without stratify.", stratify is not None, e)
        X_train, X_test, y_train, y_test = train_test_split(
            X, y_encoded, test_size=args.test_size, random_state=42, stratify=None
        )

    logging.info("Training on %d samples, validating on %d samples", len(X_train), len(X_test))
    try:
        model = train_model(X_train, y_train, n_estimators=args.n_estimators, n_jobs=args.n_jobs)
    except Exception as e:
        logging.error("Training failed: %s", e)
        sys.exit(1)

    try:
        y_pred = model.predict(X_test)
        logging.info("Validation results:\n%s", classification_report(y_test, y_pred, target_names=le.classes_))
    except Exception as e:
        logging.warning("Failed to evaluate on test set: %s", e)

    # Ensure output directory exists
    out_dir = os.path.dirname(args.output)
    if out_dir and not os.path.exists(out_dir):
        os.makedirs(out_dir, exist_ok=True)

    # Save model and label encoder
    try:
        joblib.dump({'model': model, 'label_encoder': le}, args.output)
        logging.info("Saved model and label encoder to %s", args.output)
    except Exception as e:
        logging.error("Failed to save model: %s", e)
        sys.exit(1)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        logging.error("Interrupted by user")
        sys.exit(2)
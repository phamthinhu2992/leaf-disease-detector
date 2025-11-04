"""
Fast Kaggle Dataset Preparation for Training
Prepares data in the exact format needed for transfer_learning_trainer.py
"""

import os
import shutil
from pathlib import Path
from typing import Dict, List
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def prepare_dataset(source_path: str, output_path: str, copy_instead_of_link: bool = False):
    """
    Prepare Kaggle dataset for training
    
    Creates structure:
    output/
    ├── Tomato/
    │   ├── Bacterial_spot/
    │   ├── Early_blight/
    │   └── healthy/
    └── Pepper/
        ├── Bacterial_spot/
        └── healthy/
    """
    source_path = Path(source_path)
    output_path = Path(output_path)
    output_path.mkdir(parents=True, exist_ok=True)
    
    logger.info(f"Preparing dataset from {source_path}")
    logger.info(f"Output to {output_path}")
    
    # Mapping of original class names to crop/disease
    # Format: "Crop__disease" or "Crop___disease" -> (Crop, disease)
    class_mapping = {
        'Pepper__bell___Bacterial_spot': ('Pepper', 'Bacterial_spot'),
        'Pepper__bell___healthy': ('Pepper', 'healthy'),
        'Potato___Early_blight': ('Potato', 'Early_blight'),
        'Potato___healthy': ('Potato', 'healthy'),
        'Potato___Late_blight': ('Potato', 'Late_blight'),
        'Tomato__Target_Spot': ('Tomato', 'Target_spot'),
        'Tomato__Tomato_mosaic_virus': ('Tomato', 'Tomato_mosaic_virus'),
        'Tomato__Tomato_YellowLeaf__Curl_Virus': ('Tomato', 'Tomato_yellowleaf_curl_virus'),
        'Tomato_Bacterial_spot': ('Tomato', 'Bacterial_spot'),
        'Tomato_Early_blight': ('Tomato', 'Early_blight'),
        'Tomato_healthy': ('Tomato', 'healthy'),
        'Tomato_Late_blight': ('Tomato', 'Late_blight'),
        'Tomato_Leaf_Mold': ('Tomato', 'Leaf_mold'),
        'Tomato_Septoria_leaf_spot': ('Tomato', 'Septoria_leaf_spot'),
        'Tomato_Spider_mites_Two_spotted_spider_mite': ('Tomato', 'Spider_mites'),
    }
    
    total_copied = 0
    
    for source_class_dir in sorted(source_path.iterdir()):
        if not source_class_dir.is_dir():
            continue
        
        class_name = source_class_dir.name
        
        if class_name not in class_mapping:
            logger.warning(f"Skipping unknown class: {class_name}")
            continue
        
        crop, disease = class_mapping[class_name]
        
        # Create destination directory
        dest_dir = output_path / crop / disease
        dest_dir.mkdir(parents=True, exist_ok=True)
        
        # Get all image files
        image_files = [
            f for f in source_class_dir.iterdir() 
            if f.is_file() and f.suffix.lower() in {'.jpg', '.jpeg', '.png'}
        ]
        
        logger.info(f"Processing {class_name} ({len(image_files)} images) -> {crop}/{disease}")
        
        # Copy or symlink files
        for img_file in image_files:
            dest_file = dest_dir / img_file.name
            
            # Skip if already exists
            if dest_file.exists():
                continue
            
            try:
                if copy_instead_of_link:
                    shutil.copy2(img_file, dest_file)
                else:
                    # Create relative symlink for efficiency
                    dest_file.symlink_to(img_file)
                total_copied += 1
            except Exception as e:
                logger.error(f"Failed to copy {img_file.name}: {e}")
        
        logger.info(f"  -> {len(image_files)} files processed")
    
    # Print summary
    logger.info("\nDataset preparation complete!")
    logger.info(f"Total files: {total_copied}")
    
    # Print structure
    logger.info("\nOrganized structure:")
    for crop_dir in sorted(output_path.iterdir()):
        if crop_dir.is_dir():
            disease_dirs = [d for d in crop_dir.iterdir() if d.is_dir()]
            total_images = sum(
                len([f for f in d.iterdir() if f.is_file()])
                for d in disease_dirs
            )
            logger.info(f"  {crop_dir.name}: {len(disease_dirs)} diseases, {total_images} images")
            for disease_dir in sorted(disease_dirs):
                count = len([f for f in disease_dir.iterdir() if f.is_file()])
                logger.info(f"    - {disease_dir.name}: {count}")


def create_config(output_path: str, config_file: str):
    """Create training config file"""
    config = {
        'dataset': {
            'path': output_path,
            'type': 'organized_by_crop_disease',
            'crops': ['Tomato', 'Pepper', 'Potato'],
            'input_size': [224, 224],
            'num_classes': 15,  # Update based on your actual classes
        },
        'training': {
            'batch_size': 32,
            'epochs_pretrain': 50,
            'epochs_finetune': 30,
            'learning_rate': 0.001,
            'val_split': 0.2,
            'test_split': 0.1,
        },
        'model': {
            'architecture': 'MobileNetV2+CBAM',
            'pretrained': True,
            'frozen_layers': 100,
        }
    }
    
    import json
    with open(config_file, 'w') as f:
        json.dump(config, f, indent=2)
    
    logger.info(f"Config saved to {config_file}")


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Prepare Kaggle dataset for training')
    parser.add_argument('--source', type=str, default='D:\\huy\\PlantVillage',
                        help='Source dataset path')
    parser.add_argument('--output', type=str, default='data/organized',
                        help='Output path')
    parser.add_argument('--copy', action='store_true',
                        help='Copy files instead of symlinking')
    
    args = parser.parse_args()
    
    prepare_dataset(args.source, args.output, copy_instead_of_link=args.copy)
    create_config(args.output, os.path.join(args.output, 'config.json'))

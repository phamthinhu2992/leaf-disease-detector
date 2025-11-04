"""
Kaggle Dataset Loader for Leaf Disease Detection
================================================
Handles loading, validating, and organizing Kaggle plant disease dataset
"""

import os
import shutil
import json
from pathlib import Path
from typing import Dict, List, Tuple
import numpy as np
from collections import defaultdict
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class KaggleDatasetLoader:
    """Load and manage Kaggle plant disease dataset"""
    
    VALID_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG'}
    
    def __init__(self, dataset_path: str):
        """
        Initialize loader
        
        Args:
            dataset_path: Path to Kaggle dataset root
        """
        self.dataset_path = Path(dataset_path)
        if not self.dataset_path.exists():
            raise FileNotFoundError(f"Dataset path not found: {dataset_path}")
        
        self.classes = []
        self.file_count = {}
        self.corrupted_files = []
        self.dataset_info = {}
    
    def scan_dataset(self) -> Dict:
        """
        Scan dataset and collect statistics
        
        Returns:
            Dictionary with dataset information
        """
        logger.info(f"Scanning dataset at {self.dataset_path}...")
        
        self.classes = []
        self.file_count = {}
        
        for class_dir in sorted(self.dataset_path.iterdir()):
            if not class_dir.is_dir():
                continue
            
            class_name = class_dir.name
            
            # Count image files
            image_files = [
                f for f in class_dir.iterdir() 
                if f.is_file() and f.suffix.lower() in self.VALID_EXTENSIONS
            ]
            
            if image_files:
                self.classes.append(class_name)
                self.file_count[class_name] = len(image_files)
                logger.info(f"  {class_name}: {len(image_files)} images")
        
        # Calculate statistics
        total_images = sum(self.file_count.values())
        stats = {
            'total_classes': len(self.classes),
            'total_images': total_images,
            'classes': self.classes,
            'image_counts': self.file_count,
            'avg_images_per_class': total_images / len(self.classes) if self.classes else 0,
            'min_images': min(self.file_count.values()) if self.file_count else 0,
            'max_images': max(self.file_count.values()) if self.file_count else 0,
        }
        
        self.dataset_info = stats
        logger.info(f"\nDataset Summary:")
        logger.info(f"  Total Classes: {stats['total_classes']}")
        logger.info(f"  Total Images: {stats['total_images']}")
        logger.info(f"  Avg Images/Class: {stats['avg_images_per_class']:.0f}")
        logger.info(f"  Min/Max Images: {stats['min_images']}/{stats['max_images']}")
        
        return stats
    
    def validate_images(self, sample_size: int = 100) -> Dict:
        """
        Validate image files (check if readable)
        
        Args:
            sample_size: Number of images to validate from each class
            
        Returns:
            Validation report
        """
        logger.info(f"\nValidating images (sampling {sample_size} per class)...")
        
        try:
            from PIL import Image
        except ImportError:
            logger.warning("PIL not available, skipping image validation")
            return {'status': 'PIL not available'}
        
        valid_count = 0
        invalid_count = 0
        
        for class_name in self.classes:
            class_dir = self.dataset_path / class_name
            image_files = list(class_dir.glob('*.*'))
            
            # Sample images to validate
            sample_files = image_files[:min(sample_size, len(image_files))]
            
            for img_file in sample_files:
                try:
                    with Image.open(img_file) as img:
                        img.verify()
                    valid_count += 1
                except Exception as e:
                    logger.warning(f"  Invalid: {img_file.name} - {str(e)}")
                    invalid_count += 1
                    self.corrupted_files.append(str(img_file))
        
        logger.info(f"Validation complete: {valid_count} valid, {invalid_count} invalid")
        
        return {
            'valid': valid_count,
            'invalid': invalid_count,
            'corrupted_files': self.corrupted_files
        }
    
    def organize_by_crop_and_disease(self, output_path: str, copy_files: bool = False) -> None:
        """
        Organize dataset into crop/disease structure
        
        Dataset structure:
            output/
            ├── Tomato/
            │   ├── Bacterial_spot/
            │   ├── Early_blight/
            │   └── healthy/
            ├── Pepper/
            │   ├── Bacterial_spot/
            │   └── healthy/
            └── Potato/
                ├── Early_blight/
                └── healthy/
        
        Args:
            output_path: Where to create organized structure
            copy_files: If True, copy files; if False, create symlinks
        """
        output_path = Path(output_path)
        output_path.mkdir(parents=True, exist_ok=True)
        
        logger.info(f"\nOrganizing dataset into crop/disease structure...")
        logger.info(f"Output path: {output_path}")
        
        # Parse class names and organize
        crop_disease_map = defaultdict(list)
        
        for class_name in self.classes:
            # Parse class name
            # Format: "Crop__disease" or "Crop___disease" or "Crop_disease"
            parts = class_name.replace('_', ' ').split()
            
            # Extract crop and disease
            if len(parts) >= 2:
                # Take first word as crop
                crop = parts[0].strip()
                disease = ' '.join(parts[1:]).strip()
            else:
                crop = parts[0]
                disease = 'unknown'
            
            # Normalize
            crop = crop.title().replace(' ', '_')
            disease = disease.title().replace(' ', '_')
            
            crop_disease_map[crop].append({
                'original_class': class_name,
                'disease': disease,
                'crop': crop
            })
        
        # Create directory structure
        total_organized = 0
        for crop, diseases in sorted(crop_disease_map.items()):
            crop_dir = output_path / crop
            crop_dir.mkdir(exist_ok=True)
            
            for item in diseases:
                disease = item['disease']
                original_class = item['original_class']
                
                disease_dir = crop_dir / disease
                disease_dir.mkdir(exist_ok=True)
                
                source_dir = self.dataset_path / original_class
                
                # Copy or symlink files
                for img_file in source_dir.iterdir():
                    if img_file.suffix.lower() in self.VALID_EXTENSIONS:
                        target_file = disease_dir / img_file.name
                        
                        if not target_file.exists():
                            if copy_files:
                                shutil.copy2(img_file, target_file)
                            else:
                                # Create relative symlink
                                try:
                                    target_file.symlink_to(img_file)
                                except OSError:
                                    # Fallback to copy if symlink fails
                                    shutil.copy2(img_file, target_file)
                            total_organized += 1
        
        logger.info(f"Organized {total_organized} images into {len(crop_disease_map)} crops")
        
        # Print summary
        logger.info("\nOrganized structure:")
        for crop_dir in sorted(output_path.iterdir()):
            if crop_dir.is_dir():
                disease_count = len([d for d in crop_dir.iterdir() if d.is_dir()])
                total_images = sum(
                    len([f for f in disease_dir.iterdir() if f.is_file()])
                    for disease_dir in crop_dir.iterdir() if disease_dir.is_dir()
                )
                logger.info(f"  {crop_dir.name}: {disease_count} diseases, {total_images} images")
    
    def create_train_val_split(self, organized_path: str, output_path: str, 
                               train_ratio: float = 0.8, random_seed: int = 42) -> Dict:
        """
        Create train/validation split
        
        Args:
            organized_path: Path to organized dataset
            output_path: Where to create splits
            train_ratio: Proportion for training (rest for validation)
            random_seed: For reproducibility
            
        Returns:
            Split statistics
        """
        np.random.seed(random_seed)
        
        organized_path = Path(organized_path)
        output_path = Path(output_path)
        
        train_dir = output_path / 'train'
        val_dir = output_path / 'val'
        
        train_dir.mkdir(parents=True, exist_ok=True)
        val_dir.mkdir(parents=True, exist_ok=True)
        
        logger.info(f"\nCreating train/val split ({train_ratio:.0%}/{1-train_ratio:.0%})...")
        
        split_stats = {'train': 0, 'val': 0, 'crops': {}}
        
        # Process each crop and disease
        for crop_dir in sorted(organized_path.iterdir()):
            if not crop_dir.is_dir():
                continue
            
            crop_name = crop_dir.name
            split_stats['crops'][crop_name] = {'train': 0, 'val': 0}
            
            for disease_dir in crop_dir.iterdir():
                if not disease_dir.is_dir():
                    continue
                
                disease_name = disease_dir.name
                
                # Get all images
                image_files = [
                    f for f in disease_dir.iterdir() 
                    if f.is_file() and f.suffix.lower() in self.VALID_EXTENSIONS
                ]
                
                # Shuffle and split
                np.random.shuffle(image_files)
                split_point = int(len(image_files) * train_ratio)
                train_files = image_files[:split_point]
                val_files = image_files[split_point:]
                
                # Create directories and symlinks/copies
                for subset, files in [('train', train_files), ('val', val_files)]:
                    subset_dir = (train_dir if subset == 'train' else val_dir) / crop_name / disease_name
                    subset_dir.mkdir(parents=True, exist_ok=True)
                    
                    for src_file in files:
                        dest_file = subset_dir / src_file.name
                        if not dest_file.exists():
                            try:
                                dest_file.symlink_to(src_file)
                            except OSError:
                                shutil.copy2(src_file, dest_file)
                        
                        if subset == 'train':
                            split_stats['train'] += 1
                            split_stats['crops'][crop_name]['train'] += 1
                        else:
                            split_stats['val'] += 1
                            split_stats['crops'][crop_name]['val'] += 1
                
                logger.info(
                    f"  {crop_name}/{disease_name}: "
                    f"{len(train_files)} train, {len(val_files)} val"
                )
        
        logger.info(f"\nTrain/Val Split Complete:")
        logger.info(f"  Train: {split_stats['train']} images")
        logger.info(f"  Val: {split_stats['val']} images")
        
        return split_stats
    
    def save_dataset_info(self, output_file: str) -> None:
        """Save dataset information to JSON"""
        output_file = Path(output_file)
        output_file.parent.mkdir(parents=True, exist_ok=True)
        
        info = {
            'dataset_path': str(self.dataset_path),
            'dataset_info': self.dataset_info,
            'corrupted_files': self.corrupted_files,
            'timestamp': str(Path(output_file).parent)
        }
        
        with open(output_file, 'w') as f:
            json.dump(info, f, indent=2)
        
        logger.info(f"Dataset info saved to {output_file}")


def main():
    """Main execution"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Load and organize Kaggle plant disease dataset')
    parser.add_argument('--dataset-path', type=str, required=True, 
                        help='Path to Kaggle dataset')
    parser.add_argument('--output-path', type=str, default='data/organized',
                        help='Output path for organized dataset')
    parser.add_argument('--organize', action='store_true',
                        help='Organize dataset into crop/disease structure')
    parser.add_argument('--split', action='store_true',
                        help='Create train/val split')
    parser.add_argument('--validate', action='store_true',
                        help='Validate image files')
    parser.add_argument('--copy-files', action='store_true',
                        help='Copy files instead of symlinking')
    parser.add_argument('--train-ratio', type=float, default=0.8,
                        help='Train/val ratio (default: 0.8)')
    
    args = parser.parse_args()
    
    # Initialize loader
    loader = KaggleDatasetLoader(args.dataset_path)
    
    # Scan dataset
    loader.scan_dataset()
    
    # Validate if requested
    if args.validate:
        loader.validate_images()
    
    # Organize if requested
    if args.organize:
        loader.organize_by_crop_and_disease(args.output_path, copy_files=args.copy_files)
    
    # Split if requested
    if args.split and args.organize:
        split_stats = loader.create_train_val_split(
            args.output_path,
            'data/splits',
            train_ratio=args.train_ratio
        )
    
    # Save info
    loader.save_dataset_info(os.path.join(args.output_path, 'dataset_info.json'))


if __name__ == '__main__':
    main()

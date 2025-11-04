"""
Transfer Learning Trainer for Leaf Disease Detection
======================================================
Implements training pipeline with:
1. PlantVillage dataset pre-training via transfer learning
2. Fine-tuning on local Vietnamese crop data (tomato, rice, etc.)
3. Advanced data augmentation for robust models
4. Learning rate scheduling and early stopping
5. Model checkpointing and evaluation

Usage:
    python transfer_learning_trainer.py --mode pretrain --plantvillage-path /path/to/plantvillage
    python transfer_learning_trainer.py --mode finetune --local-data-path /path/to/local/crops
"""

import os
import sys
import json
import argparse
import numpy as np
from pathlib import Path
from typing import Tuple, Optional, Dict, List, Any
from datetime import datetime
import logging

import tensorflow as tf
from tensorflow import keras
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.callbacks import (
    EarlyStopping,
    ReduceLROnPlateau,
    ModelCheckpoint,
    TensorBoard,
    CSVLogger
)

import albumentations as A
# ToTensorV2 is PyTorch-specific, not needed for TensorFlow
# from albumentations.pytorch import ToTensorV2

from mobilenetv2_attention_model import (
    create_mobilenetv2_attention_model,
    compile_model
)
from segmentation_service import SegmentationService


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class TransferLearningTrainer:
    """Transfer learning trainer for disease detection"""
    
    def __init__(
        self,
        model_type: str = 'mobilenetv2_attention',
        input_shape: Tuple[int, int, int] = (224, 224, 3),
        num_classes: int = 50,
        output_dir: str = './models',
        include_segmentation: bool = True
    ):
        """Initialize trainer
        
        Args:
            model_type: Type of model ('mobilenetv2_attention', 'mobilenetv2')
            input_shape: Input image shape
            num_classes: Number of disease classes
            output_dir: Directory to save models and logs
            include_segmentation: Whether to use segmentation branch
        """
        self.model_type = model_type
        self.input_shape = input_shape
        self.num_classes = num_classes
        self.output_dir = output_dir
        self.include_segmentation = include_segmentation
        
        # Create output directory
        os.makedirs(output_dir, exist_ok=True)
        
        # Initialize model and segmentation service
        self.model = None
        self.segmentation_service = SegmentationService(
            target_size=(input_shape[0], input_shape[1]),
            create_new_model=True
        )
        
        # Training history
        self.training_history = {}
        self.class_mapping = {}
    
    def create_model(self, freeze_base: bool = True) -> keras.Model:
        """Create model for transfer learning
        
        Args:
            freeze_base: Whether to freeze base model layers initially
        """
        logger.info(f"Creating {self.model_type} model...")
        
        # For fine-tuning, use classification only (no segmentation)
        self.model = create_mobilenetv2_attention_model(
            num_classes=self.num_classes,
            input_shape=self.input_shape,
            freeze_base=freeze_base,
            include_segmentation=False  # Use classification only for training
        )
        
        compile_model(
            self.model,
            learning_rate=1e-4,
            include_segmentation=False  # Use classification only for training
        )
        
        logger.info("Model created and compiled")
        return self.model
    
    def prepare_plantvillage_data(
        self,
        plantvillage_path: str,
        batch_size: int = 32,
        validation_split: float = 0.2,
        augmentation: bool = True
    ) -> Tuple[tf.data.Dataset, tf.data.Dataset, Dict[str, int]]:
        """Prepare PlantVillage dataset for pre-training
        
        Args:
            plantvillage_path: Path to PlantVillage dataset
            batch_size: Batch size for training
            validation_split: Fraction of data for validation
            augmentation: Whether to apply data augmentation
        
        Returns:
            (train_dataset, val_dataset, class_indices)
        """
        logger.info(f"Loading PlantVillage data from {plantvillage_path}")
        
        if not os.path.exists(plantvillage_path):
            raise FileNotFoundError(f"PlantVillage path not found: {plantvillage_path}")
        
        # Create augmentation pipeline for PlantVillage
        if augmentation:
            train_transform = A.Compose([
                A.RandomResizedCrop(
                    height=self.input_shape[0],
                    width=self.input_shape[1],
                    scale=(0.8, 1.0)
                ),
                A.HorizontalFlip(p=0.5),
                A.VerticalFlip(p=0.3),
                A.Rotate(limit=30, p=0.5),
                A.GaussNoise(p=0.3),
                A.GaussianBlur(blur_limit=3, p=0.3),
                A.RandomBrightnessContrast(p=0.3),
                A.Normalize(
                    mean=[0.485, 0.456, 0.406],
                    std=[0.229, 0.224, 0.225],
                    max_pixel_value=255.0
                )
            ])
            
            val_transform = A.Compose([
                A.Resize(height=self.input_shape[0], width=self.input_shape[1]),
                A.Normalize(
                    mean=[0.485, 0.456, 0.406],
                    std=[0.229, 0.224, 0.225],
                    max_pixel_value=255.0
                )
            ])
        else:
            train_transform = None
            val_transform = None
        
        # Load using ImageDataGenerator with directory structure
        datagen = ImageDataGenerator(
            rescale=1./255,
            rotation_range=30,
            width_shift_range=0.2,
            height_shift_range=0.2,
            shear_range=0.2,
            zoom_range=0.2,
            horizontal_flip=True,
            vertical_flip=True,
            fill_mode='nearest',
            validation_split=validation_split
        ) if augmentation else ImageDataGenerator(rescale=1./255)
        
        # Load training data
        train_generator = datagen.flow_from_directory(
            plantvillage_path,
            target_size=(self.input_shape[0], self.input_shape[1]),
            batch_size=batch_size,
            class_mode='categorical',
            subset='training' if augmentation else None,
            shuffle=True
        )
        
        # Load validation data
        val_generator = datagen.flow_from_directory(
            plantvillage_path,
            target_size=(self.input_shape[0], self.input_shape[1]),
            batch_size=batch_size,
            class_mode='categorical',
            subset='validation' if augmentation else None,
            shuffle=False
        )
        
        # Store class mapping
        self.class_mapping = {
            v: k for k, v in train_generator.class_indices.items()
        }
        
        logger.info(f"Loaded {train_generator.samples} training samples")
        logger.info(f"Loaded {val_generator.samples} validation samples")
        logger.info(f"Classes: {list(self.class_mapping.values())}")
        
        return train_generator, val_generator, train_generator.class_indices
    
    def prepare_local_data(
        self,
        local_data_path: str,
        batch_size: int = 32,
        validation_split: float = 0.2,
        augmentation: bool = True,
        crop_specific: bool = True
    ) -> Tuple[tf.data.Dataset, tf.data.Dataset]:
        """Prepare local Vietnamese crop data for fine-tuning
        
        Args:
            local_data_path: Path to local crop dataset (organize as crop/disease/images)
            batch_size: Batch size for training
            validation_split: Fraction for validation
            augmentation: Whether to apply stronger augmentation for local data
            crop_specific: Whether to apply crop-specific augmentation
        
        Returns:
            (train_dataset, val_dataset)
        """
        logger.info(f"Loading local crop data from {local_data_path}")
        
        if not os.path.exists(local_data_path):
            raise FileNotFoundError(f"Local data path not found: {local_data_path}")
        
        # Create crop-specific augmentation
        if augmentation:
            # More aggressive augmentation for local fine-tuning
            local_transform = ImageDataGenerator(
                rescale=1./255,
                rotation_range=40,
                width_shift_range=0.3,
                height_shift_range=0.3,
                shear_range=0.3,
                zoom_range=0.3,
                horizontal_flip=True,
                vertical_flip=True,
                brightness_range=[0.7, 1.3],
                fill_mode='reflect',
                validation_split=validation_split
            )
        else:
            local_transform = ImageDataGenerator(
                rescale=1./255,
                validation_split=validation_split
            )
        
        # Load training data
        train_generator = local_transform.flow_from_directory(
            local_data_path,
            target_size=(self.input_shape[0], self.input_shape[1]),
            batch_size=batch_size,
            class_mode='categorical',
            subset='training',
            shuffle=True
        )
        
        # Load validation data
        val_generator = local_transform.flow_from_directory(
            local_data_path,
            target_size=(self.input_shape[0], self.input_shape[1]),
            batch_size=batch_size,
            class_mode='categorical',
            subset='validation',
            shuffle=False
        )
        
        logger.info(f"Loaded {train_generator.samples} local training samples")
        logger.info(f"Loaded {val_generator.samples} local validation samples")
        
        return train_generator, val_generator
    
    def pretrain_on_plantvillage(
        self,
        plantvillage_path: str,
        epochs: int = 50,
        batch_size: int = 32,
        freeze_base: bool = True,
        save_best_only: bool = True
    ) -> Dict[str, Any]:
        """Pre-train on PlantVillage dataset
        
        Args:
            plantvillage_path: Path to PlantVillage data
            epochs: Number of training epochs
            batch_size: Batch size
            freeze_base: Whether to freeze base model
            save_best_only: Whether to save only best model
        """
        logger.info("=" * 80)
        logger.info("STARTING PRE-TRAINING ON PLANTVILLAGE")
        logger.info("=" * 80)
        
        # Create model
        self.create_model(freeze_base=freeze_base)
        
        # Prepare data
        train_gen, val_gen, _ = self.prepare_plantvillage_data(
            plantvillage_path,
            batch_size=batch_size,
            augmentation=True
        )
        
        # Setup callbacks
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        checkpoint_path = os.path.join(
            self.output_dir,
            f'mobilenetv2_attention_plantvillage_{timestamp}.h5'
        )
        
        callbacks = [
            ModelCheckpoint(
                checkpoint_path,
                monitor='val_accuracy',
                save_best_only=save_best_only,
                mode='max',
                verbose=1
            ),
            EarlyStopping(
                monitor='val_loss',
                patience=10,
                restore_best_weights=True,
                verbose=1
            ),
            ReduceLROnPlateau(
                monitor='val_loss',
                factor=0.5,
                patience=5,
                min_lr=1e-7,
                verbose=1
            ),
            TensorBoard(
                log_dir=os.path.join(self.output_dir, f'logs_{timestamp}'),
                histogram_freq=1
            ),
            CSVLogger(
                os.path.join(self.output_dir, f'training_log_{timestamp}.csv')
            )
        ]
        
        # Train
        logger.info("Starting training...")
        history = self.model.fit(
            train_gen,
            epochs=epochs,
            validation_data=val_gen,
            callbacks=callbacks,
            verbose=1
        )
        
        # Save training config
        config = {
            'model_type': self.model_type,
            'input_shape': self.input_shape,
            'num_classes': self.num_classes,
            'class_mapping': self.class_mapping,
            'training_phase': 'pretrain_plantvillage',
            'timestamp': timestamp,
            'epochs': epochs,
            'batch_size': batch_size
        }
        
        config_path = os.path.join(self.output_dir, f'config_{timestamp}.json')
        with open(config_path, 'w') as f:
            json.dump(config, f, indent=4)
        
        self.training_history['pretrain'] = history.history
        
        logger.info(f"Pre-training completed. Model saved to {checkpoint_path}")
        return history.history
    
    def finetune_on_local_data(
        self,
        local_data_path: str,
        pretrained_model_path: Optional[str] = None,
        epochs: int = 30,
        batch_size: int = 16,
        freeze_base_layers: int = 100,
        learning_rate: float = 1e-5,
        save_best_only: bool = True
    ) -> Dict[str, Any]:
        """Fine-tune on local Vietnamese crop data
        
        Args:
            local_data_path: Path to local crop data
            pretrained_model_path: Path to pre-trained model
            epochs: Number of fine-tuning epochs
            batch_size: Batch size
            freeze_base_layers: Number of base layers to keep frozen
            learning_rate: Learning rate for fine-tuning
            save_best_only: Whether to save only best model
        """
        logger.info("=" * 80)
        logger.info("STARTING FINE-TUNING ON LOCAL DATA")
        logger.info("=" * 80)
        
        # Load or create model
        if pretrained_model_path and os.path.exists(pretrained_model_path):
            logger.info(f"Loading pre-trained model from {pretrained_model_path}")
            self.model = keras.models.load_model(pretrained_model_path)
        else:
            logger.info("Creating new model for fine-tuning")
            self.create_model(freeze_base=False)
        
        # Freeze specified number of base layers
        if freeze_base_layers > 0:
            logger.info(f"Freezing first {freeze_base_layers} layers")
            for layer in self.model.layers[:freeze_base_layers]:
                layer.trainable = False
        
        # Prepare local data
        train_gen, val_gen = self.prepare_local_data(
            local_data_path,
            batch_size=batch_size,
            augmentation=True
        )
        
        # Recompile with lower learning rate
        self.model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=learning_rate),
            loss='categorical_crossentropy',
            metrics=['accuracy', keras.metrics.TopKCategoricalAccuracy(k=3)]
        )
        
        # Setup callbacks
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        checkpoint_path = os.path.join(
            self.output_dir,
            f'mobilenetv2_attention_finetuned_{timestamp}.h5'
        )
        
        callbacks = [
            ModelCheckpoint(
                checkpoint_path,
                monitor='val_accuracy',
                save_best_only=save_best_only,
                mode='max',
                verbose=1
            ),
            EarlyStopping(
                monitor='val_loss',
                patience=8,
                restore_best_weights=True,
                verbose=1
            ),
            ReduceLROnPlateau(
                monitor='val_loss',
                factor=0.5,
                patience=4,
                min_lr=1e-8,
                verbose=1
            ),
            TensorBoard(
                log_dir=os.path.join(self.output_dir, f'logs_finetune_{timestamp}')
            ),
            CSVLogger(
                os.path.join(self.output_dir, f'finetuning_log_{timestamp}.csv')
            )
        ]
        
        # Fine-tune
        logger.info("Starting fine-tuning...")
        history = self.model.fit(
            train_gen,
            epochs=epochs,
            validation_data=val_gen,
            callbacks=callbacks,
            verbose=1
        )
        
        # Save model and config
        final_model_path = os.path.join(
            self.output_dir,
            f'mobilenetv2_attention_final_{timestamp}.h5'
        )
        self.model.save(final_model_path)
        
        config = {
            'model_type': self.model_type,
            'input_shape': self.input_shape,
            'num_classes': self.num_classes,
            'training_phase': 'finetune_local_data',
            'local_data_path': local_data_path,
            'timestamp': timestamp,
            'epochs': epochs,
            'batch_size': batch_size,
            'learning_rate': learning_rate
        }
        
        config_path = os.path.join(self.output_dir, f'config_finetune_{timestamp}.json')
        with open(config_path, 'w') as f:
            json.dump(config, f, indent=4)
        
        self.training_history['finetune'] = history.history
        
        logger.info(f"Fine-tuning completed. Model saved to {final_model_path}")
        return history.history
    
    def evaluate_model(
        self,
        test_data_path: str,
        batch_size: int = 32
    ) -> Dict[str, float]:
        """Evaluate model on test set
        
        Args:
            test_data_path: Path to test data
            batch_size: Batch size
        
        Returns:
            Evaluation metrics dictionary
        """
        if self.model is None:
            raise RuntimeError("Model not loaded")
        
        logger.info(f"Evaluating model on {test_data_path}")
        
        # Create test data generator
        test_datagen = ImageDataGenerator(rescale=1./255)
        test_generator = test_datagen.flow_from_directory(
            test_data_path,
            target_size=(self.input_shape[0], self.input_shape[1]),
            batch_size=batch_size,
            class_mode='categorical',
            shuffle=False
        )
        
        # Evaluate
        results = self.model.evaluate(test_generator, verbose=1)
        
        metrics = {
            'loss': results[0],
            'accuracy': results[1],
            'top_3_accuracy': results[2] if len(results) > 2 else None
        }
        
        logger.info(f"Evaluation results: {metrics}")
        return metrics
    
    def save_model(self, model_path: str):
        """Save current model"""
        if self.model is not None:
            self.model.save(model_path)
            logger.info(f"Model saved to {model_path}")
    
    def get_model_summary(self) -> str:
        """Get model summary"""
        if self.model is None:
            return "Model not created"
        
        import io
        string_buffer = io.StringIO()
        self.model.summary(print_fn=lambda x: string_buffer.write(x + '\n'))
        return string_buffer.getvalue()


def main():
    """CLI for transfer learning trainer"""
    
    parser = argparse.ArgumentParser(
        description='Transfer Learning Trainer for Leaf Disease Detection'
    )
    parser.add_argument(
        '--mode',
        choices=['pretrain', 'finetune', 'both'],
        default='both',
        help='Training mode'
    )
    parser.add_argument(
        '--plantvillage-path',
        type=str,
        help='Path to PlantVillage dataset'
    )
    parser.add_argument(
        '--local-data-path',
        type=str,
        help='Path to local crop dataset'
    )
    parser.add_argument(
        '--pretrained-model',
        type=str,
        help='Path to pre-trained model for fine-tuning'
    )
    parser.add_argument(
        '--output-dir',
        type=str,
        default='./models',
        help='Output directory for saved models'
    )
    parser.add_argument(
        '--epochs-pretrain',
        type=int,
        default=50,
        help='Epochs for pre-training'
    )
    parser.add_argument(
        '--epochs-finetune',
        type=int,
        default=30,
        help='Epochs for fine-tuning'
    )
    parser.add_argument(
        '--batch-size',
        type=int,
        default=32,
        help='Batch size'
    )
    
    args = parser.parse_args()
    
    # Create trainer
    trainer = TransferLearningTrainer(
        output_dir=args.output_dir,
        include_segmentation=True
    )
    
    # Pre-training
    if args.mode in ['pretrain', 'both']:
        if not args.plantvillage_path:
            logger.error("PlantVillage path required for pre-training")
            return
        
        trainer.pretrain_on_plantvillage(
            args.plantvillage_path,
            epochs=args.epochs_pretrain,
            batch_size=args.batch_size
        )
        
        # Save pre-trained model path for fine-tuning
        if args.mode == 'both':
            # Use the most recent pre-trained model
            import glob
            models = glob.glob(os.path.join(args.output_dir, 'mobilenetv2_attention_plantvillage_*.h5'))
            if models:
                args.pretrained_model = max(models, key=os.path.getctime)
    
    # Fine-tuning
    if args.mode in ['finetune', 'both']:
        if not args.local_data_path:
            logger.error("Local data path required for fine-tuning")
            return
        
        trainer.finetune_on_local_data(
            args.local_data_path,
            pretrained_model_path=args.pretrained_model,
            epochs=args.epochs_finetune,
            batch_size=args.batch_size
        )


if __name__ == '__main__':
    main()

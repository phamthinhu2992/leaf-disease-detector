#!/usr/bin/env python3
"""
Auto-training script for incremental model improvement
Monitors for new training data and retrains models automatically
"""

import os
import json
import numpy as np
import tensorflow as tf
from tensorflow import keras
from datetime import datetime
import logging
from pathlib import Path

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class AutoTrainer:
    def __init__(self, model_dir='./model', data_dir='./training_data'):
        self.model_dir = Path(model_dir)
        self.data_dir = Path(data_dir)
        self.history_file = self.model_dir / 'training_history.json'
        
        # Create directories
        self.model_dir.mkdir(exist_ok=True)
        self.data_dir.mkdir(exist_ok=True)
        
        self.models = {}
        self.training_history = self._load_history()
    
    def _load_history(self):
        """Load training history"""
        if self.history_file.exists():
            with open(self.history_file, 'r') as f:
                return json.load(f)
        return {
            'created_at': datetime.now().isoformat(),
            'training_sessions': [],
            'total_epochs': 0,
            'best_accuracy': 0.0
        }
    
    def _save_history(self):
        """Save training history"""
        with open(self.history_file, 'w') as f:
            json.dump(self.training_history, f, indent=2)
    
    def load_training_data(self, batch_size=32):
        """Load training data from directory structure"""
        logger.info(f"📂 Loading training data from {self.data_dir}...")
        
        if not self.data_dir.exists():
            logger.warning(f"⚠️  Training data directory not found: {self.data_dir}")
            return None, None
        
        # Check for image subdirectories
        train_images = list(self.data_dir.glob('*/*.jpg')) + list(self.data_dir.glob('*/*.png'))
        
        if not train_images:
            logger.warning("⚠️  No training images found!")
            return None, None
        
        logger.info(f"✓ Found {len(train_images)} training images")
        
        # Create dataset using ImageDataGenerator
        datagen = keras.preprocessing.image.ImageDataGenerator(
            rescale=1./255,
            rotation_range=20,
            width_shift_range=0.2,
            height_shift_range=0.2,
            shear_range=0.2,
            zoom_range=0.2,
            horizontal_flip=True,
            fill_mode='nearest'
        )
        
        try:
            train_dataset = datagen.flow_from_directory(
                self.data_dir,
                target_size=(224, 224),
                batch_size=batch_size,
                class_mode='categorical'
            )
            
            logger.info(f"✓ Dataset loaded with {len(train_dataset)} batches")
            return train_dataset, train_dataset.class_indices
            
        except Exception as e:
            logger.error(f"❌ Error loading dataset: {e}")
            return None, None
    
    def load_base_model(self, model_path):
        """Load base model for transfer learning"""
        if not os.path.exists(model_path):
            logger.warning(f"⚠️  Model not found: {model_path}")
            return None
        
        try:
            logger.info(f"📥 Loading base model: {os.path.basename(model_path)}")
            model = keras.models.load_model(model_path)
            logger.info(f"✓ Model loaded successfully")
            return model
        except Exception as e:
            logger.error(f"❌ Error loading model: {e}")
            return None
    
    def prepare_for_transfer_learning(self, model, num_classes):
        """Prepare model for transfer learning"""
        logger.info("🔄 Preparing model for transfer learning...")
        
        # Remove last layer
        base_model = keras.Model(
            inputs=model.input,
            outputs=model.layers[-2].output
        )
        
        # Freeze base layers
        for layer in base_model.layers[:-10]:
            layer.trainable = False
        
        # Add new layers
        x = base_model.output
        x = keras.layers.GlobalAveragePooling2D()(x)
        x = keras.layers.Dense(256, activation='relu')(x)
        x = keras.layers.Dropout(0.5)(x)
        predictions = keras.layers.Dense(num_classes, activation='softmax')(x)
        
        new_model = keras.Model(inputs=base_model.input, outputs=predictions)
        
        # Compile
        new_model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=1e-4),
            loss='categorical_crossentropy',
            metrics=['accuracy']
        )
        
        logger.info(f"✓ Model prepared with {len(new_model.layers)} layers")
        return new_model
    
    def train_model(self, model_path, epochs=5, batch_size=32):
        """Train/retrain a single model"""
        
        model_name = os.path.basename(model_path)
        logger.info(f"\n{'='*60}")
        logger.info(f"🚀 TRAINING: {model_name}")
        logger.info(f"{'='*60}")
        
        # Load training data
        train_dataset, class_indices = self.load_training_data(batch_size)
        if train_dataset is None:
            logger.error("❌ Cannot load training data")
            return False
        
        num_classes = len(class_indices)
        
        # Load base model
        base_model = self.load_base_model(model_path)
        if base_model is None:
            logger.error("❌ Cannot load base model")
            return False
        
        # Prepare for transfer learning
        model = self.prepare_for_transfer_learning(base_model, num_classes)
        
        # Train
        logger.info(f"\n📚 Starting training for {epochs} epochs...")
        try:
            history = model.fit(
                train_dataset,
                epochs=epochs,
                verbose=1,
                callbacks=[
                    keras.callbacks.EarlyStopping(
                        monitor='loss',
                        patience=2,
                        restore_best_weights=True
                    )
                ]
            )
            
            # Save retrained model
            retrained_path = self.model_dir / f"{model_name.replace('.h5', '_retrained.h5')}"
            model.save(retrained_path)
            logger.info(f"✓ Retrained model saved: {retrained_path}")
            
            # Update history
            accuracy = history.history['accuracy'][-1] if history.history.get('accuracy') else 0
            self.training_history['training_sessions'].append({
                'timestamp': datetime.now().isoformat(),
                'model': model_name,
                'epochs': epochs,
                'final_accuracy': float(accuracy),
                'samples': len(train_dataset) * batch_size,
                'classes': num_classes
            })
            self.training_history['total_epochs'] += epochs
            self.training_history['best_accuracy'] = max(
                self.training_history['best_accuracy'],
                accuracy
            )
            self._save_history()
            
            logger.info(f"✓ Training complete! Final accuracy: {accuracy:.4f}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Training error: {e}")
            return False
    
    def train_all_models(self, epochs=5):
        """Train all available models"""
        logger.info(f"\n{'='*60}")
        logger.info(f"🔄 AUTO-TRAINING STARTED")
        logger.info(f"{'='*60}\n")
        
        models = list(self.model_dir.glob('*.h5'))
        if not models:
            logger.warning("⚠️  No models found to train!")
            return False
        
        success_count = 0
        for model_path in models:
            if 'retrained' not in model_path.name:
                if self.train_model(str(model_path), epochs=epochs):
                    success_count += 1
        
        logger.info(f"\n{'='*60}")
        logger.info(f"✅ TRAINING COMPLETE: {success_count}/{len(models)} models trained")
        logger.info(f"{'='*60}\n")
        
        return success_count > 0
    
    def get_training_stats(self):
        """Get training statistics"""
        return {
            'total_sessions': len(self.training_history['training_sessions']),
            'total_epochs': self.training_history['total_epochs'],
            'best_accuracy': self.training_history['best_accuracy'],
            'last_session': self.training_history['training_sessions'][-1] if self.training_history['training_sessions'] else None
        }

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Auto-train leaf disease models')
    parser.add_argument('--epochs', type=int, default=5, help='Number of training epochs')
    parser.add_argument('--batch-size', type=int, default=32, help='Batch size for training')
    parser.add_argument('--stats', action='store_true', help='Show training statistics')
    
    args = parser.parse_args()
    
    trainer = AutoTrainer()
    
    if args.stats:
        stats = trainer.get_training_stats()
        logger.info(f"\n📊 Training Statistics:")
        logger.info(f"   Total sessions: {stats['total_sessions']}")
        logger.info(f"   Total epochs: {stats['total_epochs']}")
        logger.info(f"   Best accuracy: {stats['best_accuracy']:.4f}")
        if stats['last_session']:
            logger.info(f"   Last session: {stats['last_session']['timestamp']}")
    else:
        trainer.train_all_models(epochs=args.epochs)

if __name__ == '__main__':
    main()

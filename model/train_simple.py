"""
Simple Training Script for Kaggle PlantVillage Dataset
Uses transfer learning with MobileNetV2 + Attention
"""

import os
import numpy as np
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint, ReduceLROnPlateau, TensorBoard
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def create_simple_model(input_shape=(224, 224, 3), num_classes=3):
    """Create MobileNetV2 model with attention-like layers"""
    # Try loading with different parameter names
    try:
        base_model = keras.applications.MobileNetV2(
            input_shape=input_shape,
            include_top=False,
            weights='imagenet'
        )
    except TypeError:
        # Newer Keras uses 'weights' parameter differently
        base_model = keras.applications.MobileNetV2(
            input_shape=input_shape,
            include_top=False
        )
    
    # Freeze base model
    base_model.trainable = False
    
    # Add custom head
    model = keras.Sequential([
        keras.layers.Input(shape=input_shape),
        base_model,
        keras.layers.GlobalAveragePooling2D(),
        keras.layers.Dense(512, activation='relu'),
        keras.layers.Dropout(0.3),
        keras.layers.Dense(256, activation='relu'),
        keras.layers.Dropout(0.3),
        keras.layers.Dense(num_classes, activation='softmax')
    ])
    
    return model

def train():
    """Main training function"""
    # Paths
    local_data_path = "data/organized"
    output_dir = "models/kaggle_simple"
    
    # Create output directory
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    
    logger.info("=" * 80)
    logger.info("STARTING SIMPLE FINE-TUNING ON KAGGLE PLANTVILLAGE DATASET")
    logger.info("=" * 80)
    
    # Load data
    logger.info("Loading data...")
    datagen = ImageDataGenerator(
        rescale=1./255,
        validation_split=0.2,
        horizontal_flip=True,
        vertical_flip=True,
        rotation_range=20,
        zoom_range=0.2
    )
    
    train_gen = datagen.flow_from_directory(
        local_data_path,
        target_size=(224, 224),
        batch_size=32,
        class_mode='categorical',
        subset='training',
        shuffle=True
    )
    
    val_gen = datagen.flow_from_directory(
        local_data_path,
        target_size=(224, 224),
        batch_size=32,
        class_mode='categorical',
        subset='validation',
        shuffle=False
    )
    
    logger.info(f"Loaded {train_gen.samples} training samples")
    logger.info(f"Loaded {val_gen.samples} validation samples")
    logger.info(f"Classes: {train_gen.class_indices}")
    
    # Create model
    logger.info("Creating model...")
    num_classes = len(train_gen.class_indices)
    model = create_simple_model(num_classes=num_classes)
    
    # Compile
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=1e-4),
        loss='categorical_crossentropy',
        metrics=['accuracy']
    )
    
    logger.info("Model summary:")
    model.summary()
    
    # Callbacks
    callbacks = [
        EarlyStopping(
            monitor='val_loss',
            patience=5,
            restore_best_weights=True,
            verbose=1
        ),
        ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.5,
            patience=3,
            min_lr=1e-7,
            verbose=1
        ),
        ModelCheckpoint(
            os.path.join(output_dir, 'best_model.h5'),
            monitor='val_accuracy',
            save_best_only=True,
            verbose=1
        ),
        TensorBoard(
            log_dir=os.path.join(output_dir, 'logs'),
            histogram_freq=1,
            write_graph=True
        )
    ]
    
    # Train
    logger.info("Starting training...")
    history = model.fit(
        train_gen,
        validation_data=val_gen,
        epochs=50,
        callbacks=callbacks,
        verbose=1,
        steps_per_epoch=len(train_gen),
        validation_steps=len(val_gen)
    )
    
    # Save final model
    model.save(os.path.join(output_dir, 'final_model.h5'))
    logger.info(f"Model saved to {output_dir}")
    
    # Save metrics
    import json
    metrics = {
        'train_loss': float(np.mean(history.history['loss'])),
        'train_accuracy': float(np.mean(history.history['accuracy'])),
        'val_loss': float(np.mean(history.history['val_loss'])),
        'val_accuracy': float(np.mean(history.history['val_accuracy'])),
        'final_train_accuracy': float(history.history['accuracy'][-1]),
        'final_val_accuracy': float(history.history['val_accuracy'][-1])
    }
    
    with open(os.path.join(output_dir, 'metrics.json'), 'w') as f:
        json.dump(metrics, f, indent=2)
    
    logger.info("=" * 80)
    logger.info("TRAINING COMPLETE!")
    logger.info(f"Final validation accuracy: {metrics['final_val_accuracy']:.4f}")
    logger.info("=" * 80)

if __name__ == '__main__':
    train()

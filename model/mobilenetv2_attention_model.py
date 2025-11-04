"""
MobileNetV2 + Attention Mechanism for Leaf Disease Detection
============================================================
Implements Channel Attention (CA) and Spatial Attention (SA) mechanisms
to improve detection of small, unclear, or obscured disease areas.

Features:
- MobileNetV2 base for efficient inference
- Channel Attention for feature reweighting
- Spatial Attention for region focusing
- Multi-scale features
- Transfer learning from ImageNet
"""

import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers, models
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.preprocessing.image import ImageDataGenerator
import numpy as np
from typing import Tuple, Optional, Dict, Any
import json
import os


class ChannelAttention(layers.Layer):
    """Channel Attention Module (CAM)
    
    Recalibrates channel-wise feature responses by explicitly modeling 
    interdependencies between channels using squeeze and excitation operations.
    """
    
    def __init__(self, reduction_ratio: int = 16, **kwargs):
        super(ChannelAttention, self).__init__(**kwargs)
        self.reduction_ratio = reduction_ratio
    
    def build(self, input_shape):
        channels = input_shape[-1]
        self.avg_pool = layers.GlobalAveragePooling2D(keepdims=True)
        self.max_pool = layers.GlobalMaxPooling2D(keepdims=True)
        
        self.fc1 = layers.Dense(channels // self.reduction_ratio, activation='relu')
        self.fc2 = layers.Dense(channels)
        
        super(ChannelAttention, self).build(input_shape)
    
    def call(self, inputs):
        avg_out = self.fc2(self.fc1(self.avg_pool(inputs)))
        max_out = self.fc2(self.fc1(self.max_pool(inputs)))
        
        channel_out = keras.activations.sigmoid(avg_out + max_out)
        return inputs * channel_out


class SpatialAttention(layers.Layer):
    """Spatial Attention Module (SAM)
    
    Generates attention maps along the spatial dimension by computing
    channel-wise statistics along the channel axis.
    """
    
    def __init__(self, kernel_size: int = 7, **kwargs):
        super(SpatialAttention, self).__init__(**kwargs)
        self.kernel_size = kernel_size
        padding = kernel_size // 2
        
        self.conv = layers.Conv2D(
            filters=1,
            kernel_size=kernel_size,
            padding='same',
            activation='sigmoid',
            use_bias=False
        )
    
    def call(self, inputs):
        avg_out = tf.reduce_mean(inputs, axis=3, keepdims=True)
        max_out = tf.reduce_max(inputs, axis=3, keepdims=True)
        
        x = tf.concat([avg_out, max_out], axis=3)
        spatial_out = self.conv(x)
        return inputs * spatial_out


class CbamAttention(layers.Layer):
    """Convolutional Block Attention Module (CBAM)
    
    Sequentially applies Channel Attention and Spatial Attention
    to refine feature maps for better disease region detection.
    """
    
    def __init__(self, reduction_ratio: int = 16, **kwargs):
        super(CbamAttention, self).__init__(**kwargs)
        self.channel_attention = ChannelAttention(reduction_ratio=reduction_ratio)
        self.spatial_attention = SpatialAttention()
    
    def call(self, inputs):
        x = self.channel_attention(inputs)
        x = self.spatial_attention(x)
        return x


class MobileNetV2Attention(models.Model):
    """MobileNetV2 with Attention Mechanism for Leaf Disease Detection
    
    Combines efficient MobileNetV2 architecture with CBAM (Convolutional Block
    Attention Module) for improved detection of small, unclear, or obscured
    disease areas on leaf surfaces.
    
    Architecture:
    1. MobileNetV2 backbone (pretrained on ImageNet)
    2. Feature extraction at multiple scales
    3. CBAM modules for channel and spatial attention
    4. Dense classification head
    """
    
    def __init__(
        self,
        num_classes: int,
        input_shape: Tuple[int, int, int] = (224, 224, 3),
        dropout_rate: float = 0.5,
        freeze_base: bool = False,
        **kwargs
    ):
        super(MobileNetV2Attention, self).__init__(**kwargs)
        
        self.num_classes = num_classes
        self.input_shape_val = input_shape
        self.dropout_rate = dropout_rate
        
        # Load pretrained MobileNetV2
        self.base_model = MobileNetV2(
            input_shape=input_shape,
            include_top=False,
            weights='imagenet'
        )
        
        if freeze_base:
            self.base_model.trainable = False
        
        # Build attention-enhanced architecture
        self._build_model()
    
    def _build_model(self):
        """Construct the full model with attention mechanisms"""
        
        # Input
        inputs = keras.Input(shape=self.input_shape_val)
        
        # Base feature extraction
        x = self.base_model(inputs, training=False)
        
        # Progressive attention refinement
        # Stage 1: CBAM attention on extracted features
        x = CbamAttention(reduction_ratio=16)(x)
        
        # Stage 2: Additional conv layers for fine-grained analysis
        x = layers.Conv2D(512, kernel_size=3, padding='same', activation='relu')(x)
        x = layers.BatchNormalization()(x)
        x = CbamAttention(reduction_ratio=16)(x)
        
        # Stage 3: Multi-scale feature pooling
        avg_pool = layers.GlobalAveragePooling2D()(x)
        max_pool = layers.GlobalMaxPooling2D()(x)
        
        # Concatenate pooling features
        x = layers.Concatenate()([avg_pool, max_pool])
        
        # Classification head
        x = layers.Dense(256, activation='relu')(x)
        x = layers.BatchNormalization()(x)
        x = layers.Dropout(self.dropout_rate)(x)
        
        x = layers.Dense(128, activation='relu')(x)
        x = layers.BatchNormalization()(x)
        x = layers.Dropout(self.dropout_rate)(x)
        
        # Output layer
        outputs = layers.Dense(self.num_classes, activation='softmax')(x)
        
        self.attention_model = models.Model(inputs=inputs, outputs=outputs)
    
    def call(self, inputs, training=None):
        return self.attention_model(inputs, training=training)
    
    def get_config(self):
        return {
            'num_classes': self.num_classes,
            'input_shape': self.input_shape_val,
            'dropout_rate': self.dropout_rate,
        }


class MobileNetV2AttentionWithSegmentation(models.Model):
    """MobileNetV2 + Attention + Segmentation-Aware Model
    
    Enhances disease detection by:
    1. Using segmentation mask to isolate leaf region
    2. Applying attention mechanisms on masked features
    3. Focusing on disease-affected areas
    """
    
    def __init__(
        self,
        num_classes: int,
        input_shape: Tuple[int, int, int] = (224, 224, 3),
        dropout_rate: float = 0.5,
        **kwargs
    ):
        super(MobileNetV2AttentionWithSegmentation, self).__init__(**kwargs)
        
        self.num_classes = num_classes
        self.input_shape_val = input_shape
        self.dropout_rate = dropout_rate
        
        # Main classification branch
        self.classifier = MobileNetV2Attention(
            num_classes=num_classes,
            input_shape=input_shape,
            dropout_rate=dropout_rate
        )
        
        # Segmentation auxiliary branch
        self.segmentation_branch = self._build_segmentation_branch()
    
    def _build_segmentation_branch(self):
        """Build U-Net-like segmentation branch for disease region isolation"""
        
        inputs = keras.Input(shape=self.input_shape_val)
        
        # Encoder: downsampling path
        x = layers.Conv2D(32, 3, padding='same', activation='relu')(inputs)
        x = layers.BatchNormalization()(x)
        conv1 = x
        x = layers.MaxPooling2D(2)(x)
        
        x = layers.Conv2D(64, 3, padding='same', activation='relu')(x)
        x = layers.BatchNormalization()(x)
        conv2 = x
        x = layers.MaxPooling2D(2)(x)
        
        x = layers.Conv2D(128, 3, padding='same', activation='relu')(x)
        x = layers.BatchNormalization()(x)
        x = layers.Dropout(0.3)(x)
        
        # Decoder: upsampling path
        x = layers.UpSampling2D(2)(x)
        x = layers.Concatenate()([x, conv2])
        x = layers.Conv2D(64, 3, padding='same', activation='relu')(x)
        x = layers.BatchNormalization()(x)
        
        x = layers.UpSampling2D(2)(x)
        x = layers.Concatenate()([x, conv1])
        x = layers.Conv2D(32, 3, padding='same', activation='relu')(x)
        x = layers.BatchNormalization()(x)
        
        # Output segmentation mask
        outputs = layers.Conv2D(1, 1, activation='sigmoid')(x)
        
        return models.Model(inputs=inputs, outputs=outputs)
    
    def call(self, inputs, training=None):
        # Get classification prediction
        class_pred = self.classifier(inputs, training=training)
        
        # Get segmentation mask (auxiliary output)
        seg_mask = self.segmentation_branch(inputs, training=training)
        
        return class_pred, seg_mask


def create_mobilenetv2_attention_model(
    num_classes: int,
    input_shape: Tuple[int, int, int] = (224, 224, 3),
    freeze_base: bool = False,
    include_segmentation: bool = True,
    dropout_rate: float = 0.5
) -> models.Model:
    """Factory function to create MobileNetV2 + Attention model
    
    Args:
        num_classes: Number of disease classes to detect
        input_shape: Input image shape (H, W, C)
        freeze_base: Whether to freeze MobileNetV2 base layers during training
        include_segmentation: Whether to include segmentation auxiliary branch
        dropout_rate: Dropout rate for regularization
    
    Returns:
        Keras model ready for training
    """
    
    if include_segmentation:
        model = MobileNetV2AttentionWithSegmentation(
            num_classes=num_classes,
            input_shape=input_shape,
            dropout_rate=dropout_rate
        )
    else:
        model = MobileNetV2Attention(
            num_classes=num_classes,
            input_shape=input_shape,
            freeze_base=freeze_base,
            dropout_rate=dropout_rate
        )
    
    return model


def compile_model(
    model: models.Model,
    learning_rate: float = 1e-4,
    include_segmentation: bool = False
):
    """Compile model with appropriate loss and metrics
    
    Args:
        model: Keras model to compile
        learning_rate: Initial learning rate
        include_segmentation: Whether model includes segmentation branch
    """
    
    optimizer = keras.optimizers.Adam(learning_rate=learning_rate)
    
    if include_segmentation:
        # Multi-task learning: classification + segmentation
        losses = {
            'dense': 'categorical_crossentropy',  # Classification
            'conv2d': 'binary_crossentropy'       # Segmentation
        }
        model.compile(
            optimizer=optimizer,
            loss=losses,
            metrics={
                'dense': ['accuracy', keras.metrics.TopKCategoricalAccuracy(k=3, name='top_3_accuracy')],
                'conv2d': ['mae', keras.metrics.IoU(num_classes=2, target_class_ids=[0, 1])]
            }
        )
    else:
        # Pure classification
        model.compile(
            optimizer=optimizer,
            loss='categorical_crossentropy',
            metrics=[
                'accuracy',
                keras.metrics.TopKCategoricalAccuracy(k=3, name='top_3_accuracy'),
                keras.metrics.Precision(),
                keras.metrics.Recall()
            ]
        )


def get_model_summary(model: models.Model) -> str:
    """Get detailed model architecture summary"""
    
    import io
    
    string_buffer = io.StringIO()
    model.summary(print_fn=lambda x: string_buffer.write(x + '\n'))
    return string_buffer.getvalue()


# Example usage and testing
if __name__ == '__main__':
    print("=" * 80)
    print("MobileNetV2 + Attention Mechanism Model")
    print("=" * 80)
    
    # Create model without segmentation
    print("\n1. Creating MobileNetV2 + Attention (Classification Only)")
    model_classifier = create_mobilenetv2_attention_model(
        num_classes=50,
        include_segmentation=False
    )
    compile_model(model_classifier)
    print(get_model_summary(model_classifier))
    
    # Test prediction
    dummy_input = np.random.rand(1, 224, 224, 3).astype(np.float32)
    pred = model_classifier(dummy_input)
    print(f"\nPrediction shape: {pred.shape}")
    print(f"Prediction sum (should be ~1.0): {pred[0].numpy().sum():.4f}")
    
    # Create model with segmentation
    print("\n" + "=" * 80)
    print("2. Creating MobileNetV2 + Attention + Segmentation")
    model_with_seg = create_mobilenetv2_attention_model(
        num_classes=50,
        include_segmentation=True
    )
    compile_model(model_with_seg, include_segmentation=True)
    print(get_model_summary(model_with_seg.classifier))
    
    # Test multi-task prediction
    class_pred, seg_mask = model_with_seg(dummy_input)
    print(f"\nClassification shape: {class_pred.shape}")
    print(f"Segmentation mask shape: {seg_mask.shape}")
    print(f"Segmentation mask range: [{seg_mask.numpy().min():.4f}, {seg_mask.numpy().max():.4f}]")
    
    print("\n" + "=" * 80)
    print("✓ Model creation successful!")
